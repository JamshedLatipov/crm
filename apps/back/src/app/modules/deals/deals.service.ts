import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal, DealStatus } from './deal.entity';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { PipelineStage, StageType } from '../pipeline/pipeline.entity';
import { DealHistoryService } from './services/deal-history.service';
import { DealChangeType } from './entities/deal-history.entity';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(PipelineStage)
    private readonly stageRepository: Repository<PipelineStage>,
    private readonly historyService: DealHistoryService,
  ) {}

  async listDeals(): Promise<Deal[]> {
    return this.dealRepository.find({
      relations: ['stage', 'company', 'contact', 'lead'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealById(id: string): Promise<Deal> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['stage', 'company', 'contact', 'lead'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal with id ${id} not found`);
    }

    return deal;
  }

  async createDeal(dto: CreateDealDto, userId?: string, userName?: string): Promise<Deal> {
    // Создаем сделку без связей
    const deal = this.dealRepository.create({
      title: dto.title,
      amount: dto.amount,
      currency: dto.currency,
      probability: dto.probability,
      expectedCloseDate: new Date(dto.expectedCloseDate),
      stageId: dto.stageId,
      assignedTo: dto.assignedTo,
      notes: dto.notes,
      meta: dto.meta,
    });

    const savedDeal = await this.dealRepository.save(deal);

    // Записываем создание сделки в историю
    await this.historyService.createHistoryEntry({
      dealId: savedDeal.id,
      changeType: DealChangeType.CREATED,
      userId,
      userName,
      description: `Сделка создана: ${savedDeal.title}`,
      metadata: {
        'Название': savedDeal.title,
        'Сумма': `${savedDeal.amount} ${savedDeal.currency}`,
        'Вероятность': `${savedDeal.probability}%`,
        'Этап': savedDeal.stageId,
        'Назначена': savedDeal.assignedTo,
        'Ожидаемая дата закрытия': savedDeal.expectedCloseDate.toLocaleDateString('ru-RU')
      }
    });

    // Устанавливаем связи после создания, если они указаны
    if (dto.contactId) {
      await this.linkDealToContact(savedDeal.id, dto.contactId, userId, userName);
    }
    
    if (dto.companyId) {
      await this.linkDealToCompany(savedDeal.id, dto.companyId, userId, userName);
    }
    
    if (dto.leadId) {
      await this.linkDealToLead(savedDeal.id, dto.leadId, userId, userName);
    }

    // Возвращаем сделку со всеми связями
    return this.getDealById(savedDeal.id);
  }

  async updateDeal(id: string, dto: UpdateDealDto, userId?: string, userName?: string): Promise<Deal> {
    // Получаем текущее состояние сделки для сравнения
    const existingDeal = await this.getDealById(id);
    
    // Извлекаем ID связей из DTO
    const { contactId, companyId, leadId, expectedCloseDate, actualCloseDate, ...dealData } = dto;
    
    // Обновляем основные данные сделки (только те поля, которые есть в entity)
    if (Object.keys(dealData).length > 0 || expectedCloseDate || actualCloseDate) {
      // Создаем объект для обновления с правильными типами
      const updateData: Partial<Deal> = { ...dealData };
      
      // Преобразуем даты если они есть
      if (expectedCloseDate) {
        updateData.expectedCloseDate = new Date(expectedCloseDate);
      }
      if (actualCloseDate) {
        updateData.actualCloseDate = new Date(actualCloseDate);
      }
      
      await this.dealRepository
        .createQueryBuilder()
        .update(Deal)
        .set(updateData)
        .where('id = :id', { id })
        .execute();
      
      // Записываем изменения полей в историю
      await this.trackFieldChanges(existingDeal, updateData, userId, userName);
    }
    
    // Обновляем связи если они указаны
    if (contactId !== undefined) {
      await this.linkDealToContact(id, contactId, userId, userName);
    }
    
    if (companyId !== undefined) {
      await this.linkDealToCompany(id, companyId, userId, userName);
    }
    
    if (leadId !== undefined) {
      await this.linkDealToLead(id, leadId, userId, userName);
    }
    
    // Возвращаем обновленную сделку со всеми связями
    return this.getDealById(id);
  }

  /**
   * Отслеживание изменений полей сделки
   */
  private async trackFieldChanges(
    existingDeal: Deal, 
    updateData: Partial<Deal>, 
    userId?: string, 
    userName?: string
  ): Promise<void> {
    for (const [fieldName, newValue] of Object.entries(updateData)) {
      const oldValue = existingDeal[fieldName as keyof Deal];
      
      if (oldValue !== newValue) {
        let changeType = DealChangeType.UPDATED;
        let description = `Изменено поле "${fieldName}": ${oldValue} → ${newValue}`;
        
        // Определяем специфичный тип изменения
        switch (fieldName) {
          case 'status':
            changeType = DealChangeType.STATUS_CHANGED;
            description = `Статус изменен с ${oldValue} на ${newValue}`;
            break;
          case 'stageId':
            changeType = DealChangeType.STAGE_MOVED;
            description = `Сделка перемещена на новый этап`;
            break;
          case 'assignedTo':
            changeType = DealChangeType.ASSIGNED;
            description = `Сделка назначена: ${newValue}`;
            break;
          case 'amount':
            changeType = DealChangeType.AMOUNT_CHANGED;
            description = `Сумма изменена с ${oldValue} на ${newValue}`;
            break;
          case 'probability':
            changeType = DealChangeType.PROBABILITY_CHANGED;
            description = `Вероятность изменена с ${oldValue}% на ${newValue}%`;
            break;
          case 'expectedCloseDate':
          case 'actualCloseDate':
            changeType = DealChangeType.DATE_CHANGED;
            description = `Дата ${fieldName === 'expectedCloseDate' ? 'ожидаемого' : 'фактического'} закрытия изменена`;
            break;
          case 'notes':
            changeType = DealChangeType.NOTE_ADDED;
            description = `Добавлена/изменена заметка`;
            break;
        }
        
        await this.historyService.createHistoryEntry({
          dealId: existingDeal.id,
          fieldName,
          oldValue: oldValue ? String(oldValue) : null,
          newValue: newValue ? String(newValue) : null,
          changeType,
          userId,
          userName,
          description,
          metadata: {
            'Поле': fieldName,
            'Старое значение': String(oldValue || 'Не указано'),
            'Новое значение': String(newValue || 'Не указано'),
            'Дата изменения': new Date().toLocaleDateString('ru-RU')
          }
        });
      }
    }
  }

  async deleteDeal(id: string): Promise<void> {
    const deal = await this.getDealById(id);
    await this.dealRepository.remove(deal);
  }

  // Специальные методы для сделок
  async moveToStage(id: string, stageId: string, userId?: string, userName?: string): Promise<Deal> {
    // Получаем информацию об этапе для проверки типа
    const stage = await this.stageRepository.findOne({ where: { id: stageId } });
    const existingDeal = await this.getDealById(id);
    const oldStageId = existingDeal.stageId;
    
    const updateData: UpdateDealDto = { stageId };
    
    // Автоматически меняем статус в зависимости от типа этапа
    if (stage) {
      if (stage.type === StageType.WON_STAGE) {
        updateData.status = DealStatus.WON;
        updateData.actualCloseDate = new Date().toISOString();
      } else if (stage.type === StageType.LOST_STAGE) {
        updateData.status = DealStatus.LOST;
        updateData.actualCloseDate = new Date().toISOString();
      }
    }
    
    const result = await this.updateDeal(id, updateData, userId, userName);
    
    // Дополнительно записываем перемещение между этапами
    await this.historyService.createHistoryEntry({
      dealId: id,
      fieldName: 'stageId',
      oldValue: oldStageId,
      newValue: stageId,
      changeType: DealChangeType.STAGE_MOVED,
      userId,
      userName,
      description: `Сделка перемещена с этапа ${oldStageId} на этап ${stageId}`,
      metadata: {
        'Предыдущий этап': oldStageId,
        'Новый этап': stageId,
        'Название этапа': stage?.name || 'Неизвестно',
        'Тип этапа': stage?.type || 'Неизвестно',
        'Дата перемещения': new Date().toLocaleDateString('ru-RU')
      }
    });
    
    return result;
  }

  async winDeal(id: string, actualAmount?: number, userId?: string, userName?: string): Promise<Deal> {
    const updateData: UpdateDealDto = {
      status: DealStatus.WON,
      actualCloseDate: new Date().toISOString(),
    };

    if (actualAmount !== undefined) {
      updateData.amount = actualAmount;
    }

    const result = await this.updateDeal(id, updateData, userId, userName);
    
    // Записываем выигрыш сделки
    await this.historyService.createHistoryEntry({
      dealId: id,
      fieldName: 'status',
      oldValue: DealStatus.OPEN,
      newValue: DealStatus.WON,
      changeType: DealChangeType.WON,
      userId,
      userName,
      description: `Сделка выиграна${actualAmount ? ` на сумму ${actualAmount}` : ''}`,
      metadata: {
        'Статус': 'Выиграна',
        'Финальная сумма': actualAmount ? String(actualAmount) : 'Не изменена',
        'Дата закрытия': new Date().toLocaleDateString('ru-RU'),
        'Время закрытия': new Date().toLocaleTimeString('ru-RU')
      }
    });

    return result;
  }

  async loseDeal(id: string, reason: string, userId?: string, userName?: string): Promise<Deal> {
    const result = await this.updateDeal(id, {
      status: DealStatus.LOST,
      actualCloseDate: new Date().toISOString(),
      notes: reason,
    }, userId, userName);
    
    // Записываем проигрыш сделки
    await this.historyService.createHistoryEntry({
      dealId: id,
      fieldName: 'status',
      oldValue: DealStatus.OPEN,
      newValue: DealStatus.LOST,
      changeType: DealChangeType.LOST,
      userId,
      userName,
      description: `Сделка проиграна. Причина: ${reason}`,
      metadata: {
        'Статус': 'Проиграна',
        'Причина': reason,
        'Дата закрытия': new Date().toLocaleDateString('ru-RU'),
        'Время закрытия': new Date().toLocaleTimeString('ru-RU')
      }
    });

    return result;
  }

  async updateProbability(id: string, probability: number, userId?: string, userName?: string): Promise<Deal> {
    return this.updateDeal(id, { probability }, userId, userName);
  }

  async assignDeal(id: string, managerId: string, userId?: string, userName?: string): Promise<Deal> {
    return this.updateDeal(id, { assignedTo: managerId }, userId, userName);
  }

  // Фильтрация и поиск
  async getDealsByStage(stageId: string): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { stageId },
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealsByStatus(status: DealStatus): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { status },
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealsByManager(managerId: string): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { assignedTo: managerId },
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOverdueDeals(): Promise<Deal[]> {
    const today = new Date();
    return this.dealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.stage', 'stage')
      .where('deal.expectedCloseDate < :today', { today })
      .andWhere('deal.status = :status', { status: DealStatus.OPEN })
      .orderBy('deal.expectedCloseDate', 'ASC')
      .getMany();
  }

  async searchDeals(query: string): Promise<Deal[]> {
    return this.dealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.stage', 'stage')
      .where('deal.title ILIKE :query', { query: `%${query}%` })
      .orWhere("deal.contact->>'name' ILIKE :query", { query: `%${query}%` })
      .orWhere("deal.contact->>'company' ILIKE :query", { query: `%${query}%` })
      .orderBy('deal.createdAt', 'DESC')
      .getMany();
  }

  // Аналитика
  async getSalesForecast(period: 'month' | 'quarter' | 'year') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }

    const deals = await this.dealRepository
      .createQueryBuilder('deal')
      .where('deal.expectedCloseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('deal.status = :status', { status: DealStatus.OPEN })
      .getMany();

    const totalAmount = deals.reduce((sum, deal) => sum + Number(deal.amount), 0);
    const weightedAmount = deals.reduce(
      (sum, deal) => sum + Number(deal.amount) * (deal.probability / 100),
      0,
    );

    return {
      period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
      totalAmount,
      weightedAmount,
      dealsCount: deals.length,
    };
  }

  // Методы для работы со связями
  async linkDealToCompany(dealId: string, companyId: string, userId?: string, userName?: string): Promise<Deal> {
    await this.dealRepository
      .createQueryBuilder()
      .relation(Deal, 'company')
      .of(dealId)
      .set(companyId);
    
    // Записываем связывание с компанией в историю
    await this.historyService.createHistoryEntry({
      dealId,
      fieldName: 'company',
      oldValue: null,
      newValue: companyId,
      changeType: DealChangeType.COMPANY_LINKED,
      userId,
      userName,
      description: `Сделка связана с компанией ${companyId}`,
      metadata: {
        'Тип связи': 'Компания',
        'ID компании': companyId,
        'Дата связывания': new Date().toLocaleDateString('ru-RU')
      }
    });
    
    return this.getDealById(dealId);
  }

  async linkDealToContact(dealId: string, contactId: string, userId?: string, userName?: string): Promise<Deal> {
    if (contactId && contactId.trim()) {
      // Привязываем контакт
      await this.dealRepository
        .createQueryBuilder()
        .relation(Deal, 'contact')
        .of(dealId)
        .set(contactId);
      
      // Записываем связывание с контактом в историю
      await this.historyService.createHistoryEntry({
        dealId,
        fieldName: 'contact',
        oldValue: null,
        newValue: contactId,
        changeType: DealChangeType.CONTACT_LINKED,
        userId,
        userName,
        description: `Сделка связана с контактом ${contactId}`,
        metadata: {
          'Тип связи': 'Контакт',
          'ID контакта': contactId,
          'Дата связывания': new Date().toLocaleDateString('ru-RU')
        }
      });
    } else {
      // Отвязываем контакт (передаем null)
      await this.dealRepository
        .createQueryBuilder()
        .relation(Deal, 'contact')
        .of(dealId)
        .set(null);
      
      // Записываем отвязывание контакта в историю
      await this.historyService.createHistoryEntry({
        dealId,
        fieldName: 'contact',
        oldValue: 'linked',
        newValue: null,
        changeType: DealChangeType.CONTACT_LINKED,
        userId,
        userName,
        description: `Контакт отвязан от сделки`,
        metadata: {
          'Тип связи': 'Контакт',
          'Действие': 'Отвязывание',
          'Дата отвязывания': new Date().toLocaleDateString('ru-RU')
        }
      });
    }
    
    return this.getDealById(dealId);
  }

  async linkDealToLead(dealId: string, leadId: number, userId?: string, userName?: string): Promise<Deal> {
    await this.dealRepository
      .createQueryBuilder()
      .relation(Deal, 'lead')
      .of(dealId)
      .set(leadId);
    
    // Записываем связывание с лидом в историю
    await this.historyService.createHistoryEntry({
      dealId,
      fieldName: 'lead',
      oldValue: null,
      newValue: String(leadId),
      changeType: DealChangeType.LEAD_LINKED,
      userId,
      userName,
      description: `Сделка связана с лидом #${leadId}`,
      metadata: {
        'Тип связи': 'Лид',
        'ID лида': leadId,
        'Дата связывания': new Date().toLocaleDateString('ru-RU')
      }
    });
    
    return this.getDealById(dealId);
  }

  async getDealsByCompany(companyId: string): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { company: { id: companyId } },
      relations: ['stage', 'company', 'contact', 'lead'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealsByContact(contactId: string): Promise<Deal[]> {
    console.log(`Getting deals for contact: ${contactId}`);
    
    const deals = await this.dealRepository.find({
      where: { contact: { id: contactId } },
      relations: ['stage', 'company', 'contact', 'lead'],
      order: { createdAt: 'DESC' },
    });
    
    console.log(`Found ${deals.length} deals for contact ${contactId}:`, deals.map(d => ({ id: d.id, title: d.title })));
    return deals;
  }

  async getDealsByLead(leadId: number): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { lead: { id: leadId } },
      relations: ['stage', 'company', 'contact', 'lead'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить историю изменений сделки
   */
  async getDealHistory(
    dealId: string,
    filters?: Parameters<typeof this.historyService.getDealHistory>[1],
    page?: number,
    limit?: number
  ) {
    return this.historyService.getDealHistory(dealId, filters, page, limit);
  }

  /**
   * Получить статистику изменений сделки
   */
  async getDealChangeStatistics(
    dealId: string,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    return this.historyService.getChangeStatistics(dealId, dateFrom, dateTo);
  }

  /**
   * Получить статистику движения по этапам
   */
  async getStageMovementStats(dateFrom?: Date, dateTo?: Date) {
    return this.historyService.getStageMovementStats(dateFrom, dateTo);
  }

  /**
   * Получить самые активные сделки
   */
  async getMostActiveDeals(limit = 10, dateFrom?: Date, dateTo?: Date) {
    return this.historyService.getMostActiveDays(limit, dateFrom, dateTo);
  }
}
