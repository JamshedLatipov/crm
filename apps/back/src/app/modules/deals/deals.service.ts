import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Deal, DealStatus } from './deal.entity';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { PipelineStage, StageType } from '../pipeline/pipeline.entity';
import { DealHistoryService } from './services/deal-history.service';
import { DealChangeType } from './entities/deal-history.entity';
import { AssignmentService } from '../shared/services/assignment.service';
import { UserService } from '../user/user.service';
import { AutomationService } from '../pipeline/automation.service';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(PipelineStage)
    private readonly stageRepository: Repository<PipelineStage>,
    private readonly historyService: DealHistoryService,
    private readonly assignmentService: AssignmentService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AutomationService))
    private readonly automationService: AutomationService,
  ) {}

  /**
   * Если переданы page и limit - возвращаем постраничный ответ { items, total }
   * иначе - возвращаем полный массив сделок для обратной совместимости
   */
  async listDeals(
    page?: number,
    limit?: number,
    opts?: { q?: string; sortBy?: string; sortDir?: 'asc' | 'desc' }
  ): Promise<Deal[] | { items: Deal[]; total: number }> {
    // If paginated, build a query with optional filters/sorting
    if (page != null && limit != null) {
      const qb = this.dealRepository.createQueryBuilder('deal')
        .leftJoinAndSelect('deal.stage', 'stage')
        .leftJoinAndSelect('deal.company', 'company')
        .leftJoinAndSelect('deal.contact', 'contact')
        .leftJoinAndSelect('deal.lead', 'lead');

      // Search query across title, contact.name and company.name if provided
      if (opts?.q) {
        const q = `%${opts.q}%`;
        qb.andWhere('(deal.title ILIKE :q OR contact->>\'name\' ILIKE :q OR company->>\'name\' ILIKE :q)', { q });
      }

      // Sorting: support some known fields, default to createdAt desc
      const sortField = opts?.sortBy || 'createdAt';
      const sortDir = opts?.sortDir === 'asc' ? 'ASC' : 'DESC';
      // Map sortBy to allowed columns to avoid SQL injection
      const allowedSort: Record<string, string> = {
        createdAt: 'deal.createdAt',
        amount: 'deal.amount',
        expectedCloseDate: 'deal.expectedCloseDate',
        title: 'deal.title',
      };
      const orderColumn = allowedSort[sortField] || 'deal.createdAt';

      qb.orderBy(orderColumn, sortDir as 'ASC' | 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [items, total] = await qb.getManyAndCount();
      await this.attachAssignments(items);
      return { items, total };
    }

    // Non-paginated legacy behavior
    const deals = await this.dealRepository.find({
      relations: ['stage', 'company', 'contact', 'lead'],
      order: { createdAt: 'DESC' },
    });

    await this.attachAssignments(deals);
    return deals;
  }

  async getDealById(id: string): Promise<Deal> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['stage', 'company', 'contact', 'lead'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal with id ${id} not found`);
    }

    // Attach assignment info so frontend receives assigned user
    await this.attachAssignments(deal);
    return deal;
  }

  /**
   * Attach current assignment info to a Deal or array of Deals.
   * Adds `assignedTo` as a string user id when present.
   */
  private async attachAssignments(dealsOrDeal: Deal[] | Deal | null): Promise<void> {
    if (!dealsOrDeal) return;
    const deals = Array.isArray(dealsOrDeal) ? dealsOrDeal : [dealsOrDeal];
    if (deals.length === 0) return;

    try {
      const ids = deals.map(d => String(d.id));
      const assignmentsMap = await this.assignmentService.getCurrentAssignmentsForEntities('deal', ids);

      for (const deal of deals) {
        let assign = assignmentsMap.get(String(deal.id));
        if (!assign) {
          try {
            const single = await this.assignmentService.getCurrentAssignments('deal', String(deal.id));
            if (single && single.length > 0) assign = single[0];
          } catch (err) {
            // ignore per-entity lookup errors
          }
        }

        if (assign && assign.userId) {
          (deal as any).assignedTo = String(assign.userId);
          // attach a richer user object for frontend convenience
          (deal as any).assignedUser = assign.user ? {
            id: assign.user.id,
            firstName: assign.user.firstName,
            lastName: assign.user.lastName,
            fullName: assign.user.fullName || `${assign.user.firstName || ''} ${assign.user.lastName || ''}`.trim() || assign.user.username,
            email: assign.user.email,
            avatar: assign.user.avatar,
            roles: assign.user.roles
          } : null;
          (deal as any).assignedAt = assign.assignedAt;
        } else {
          (deal as any).assignedTo = null;
          (deal as any).assignedUser = null;
          (deal as any).assignedAt = null;
        }
      }
    } catch (err) {
      console.warn('Failed to attach assignments to deals:', err?.message || err);
      for (const deal of deals) {
        (deal as any).assignedTo = null;
      }
    }
  }

  async createDeal(dto: CreateDealDto, userId?: string, userName?: string): Promise<Deal> {
    // Создаем сделку без связей. Note: assignedTo is now stored in `assignments` table.
    const dealPayload: Partial<Deal> = {
      title: dto.title,
      amount: dto.amount,
      currency: dto.currency,
      probability: dto.probability,
      expectedCloseDate: new Date(dto.expectedCloseDate),
      stageId: dto.stageId,
      notes: dto.notes,
      meta: dto.meta,
    };

  const deal = this.dealRepository.create(dealPayload as any);
  const savedDeal = (await this.dealRepository.save(deal as any)) as Deal;

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
        'Назначена': (dto as any).assignedTo || null,
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

    // Вызываем автоматизацию для новой сделки
    try {
      await this.automationService.onDealCreated(savedDeal, userId, userName);
    } catch (error) {
      console.warn('Failed to trigger automation on deal creation:', error);
    }

    // Возвращаем сделку со всеми связями
    return this.getDealById(savedDeal.id);
  }

  async updateDeal(id: string, dto: UpdateDealDto, userId?: string, userName?: string): Promise<Deal> {
    const existingDeal = await this.getDealById(id);
    // Извлекаем ID связей из DTO
    const { contactId, companyId, leadId, expectedCloseDate, actualCloseDate, ...dealData } = dto;
    // assignedTo was removed from Deal entity; if present in DTO, handle via AssignmentService
    const assignedToPayload = (dealData as any).assignedTo;
    if ((dealData as any).assignedTo !== undefined) {
      // remove it so TypeORM update doesn't try to set a non-existing column
      delete (dealData as any).assignedTo;
    }
    
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
    // Получаем текущее состояние сделки для сравнения
    const updatedDeal = await this.getDealById(id);
    // If caller intends to change stageId, use moveToStage to preserve special stage behavior
    if (dto.stageId && dto.stageId !== updatedDeal.stageId) {
      console.log('updateDeal: delegating stage change to moveToStage', { dealId: id, from: existingDeal.stageId, to: dto.stageId });
      return this.moveToStage(id, dto.stageId, userId, userName);
    }

    // Если изменение статуса пришло без явного stageId, автоматически перемещаем в соответствующий этап пайплайна
    if (dto.status && !dto.stageId) {
      try {
        if (dto.status === DealStatus.WON || dto.status === DealStatus.LOST) {
          const targetStageType = dto.status === DealStatus.WON ? StageType.WON_STAGE : StageType.LOST_STAGE;
          const targetStage = await this.stageRepository.findOne({ where: { type: targetStageType } });
          if (targetStage && targetStage.id !== updatedDeal.stageId) {
            console.log('updateDeal: status change triggers moveToStage', { dealId: id, status: dto.status, targetStageId: targetStage.id });
            return this.moveToStage(id, targetStage.id, userId, userName);
          }
        }
      } catch (err) {
        console.warn('Failed to auto-move deal after status change:', err?.message || err);
      }
    }

    // Вызываем автоматизацию для обработки изменений
    if (Object.keys(dealData).length > 0) {
      try {
        const changes: Record<string, { old: any; new: any }> = {};
        for (const [fieldName, newValue] of Object.entries(dealData)) {
          const oldValue = existingDeal[fieldName as keyof Deal];
          if (oldValue !== newValue) {
            changes[fieldName] = { old: oldValue, new: newValue };
          }
        }
        if (Object.keys(changes).length > 0) {
          await this.automationService.onDealUpdated(updatedDeal, changes, userId, userName);
        }
      } catch (error) {
        console.warn('Failed to trigger automation on deal update:', error);
      }
    }
    
    // If an assignedTo was provided in the DTO, handle it via AssignmentService/assignDeal
    if (assignedToPayload !== undefined) {
      try {
        // delegate assignment handling to assignDeal which creates/removes Assignment records
        await this.assignDeal(id, String(assignedToPayload), userId, userName);
      } catch (err) {
        console.warn('Failed to apply assignment change via assignDeal:', err?.message || err);
      }
    }

    // If status changed to WON or LOST, complete assignments for this deal
    if (dto.status !== undefined && (dto.status === DealStatus.WON || dto.status === DealStatus.LOST)) {
      try {
        await this.assignmentService.completeAssignment('deal', id, 'Deal closed');
      } catch (err) {
        console.warn('Failed to complete assignments for deal:', err?.message || err);
      }
    }

    // Return the fully updated deal
    return updatedDeal;
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
    console.log('moveToStage called', { dealId: id, targetStageId: stageId, foundStage: stage ? { id: stage.id, type: stage.type, name: stage.name } : null });
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

    // После перемещения применяем общую логику этапа — например, дефолтную вероятность
    try {
      if (stage) {
        await this.setProbabilityFromStageIfMissing(result.id, stage, /*force=*/false);
      }
    } catch (err) {
      console.warn('Failed to apply stage defaults after moveToStage:', err?.message || err);
    }

    console.log('moveToStage result', { dealId: id, updatedDealId: result.id, newStageId: result.stageId, newStatus: result.status });
    return result;
  }

  async winDeal(id: string, actualAmount?: number, userId?: string, userName?: string): Promise<Deal> {
    // Try to find a pipeline stage of type WON_STAGE and move deal there
    try {
      console.log('winDeal invoked', { dealId: id, actualAmount });
      const wonStage = await this.stageRepository.findOne({ where: { type: StageType.WON_STAGE } });
      console.log('winDeal found wonStage', wonStage ? { id: wonStage.id, name: wonStage.name } : null);
      if (wonStage) {
        // If an actual amount provided, ensure it's applied during move
        if (actualAmount !== undefined) {
          // Update amount first
          await this.updateDeal(id, { amount: actualAmount }, userId, userName);
        }
        return this.moveToStage(id, wonStage.id, userId, userName);
      }
    } catch (err) {
      // ignore and fallback
      console.warn('Failed to auto-move to WON stage:', err?.message || err);
    }

    // Fallback: update status directly
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
    // Try to find a pipeline stage of type LOST_STAGE and move deal there
    try {
      console.log('loseDeal invoked', { dealId: id, reason });
      const lostStage = await this.stageRepository.findOne({ where: { type: StageType.LOST_STAGE } });
      console.log('loseDeal found lostStage', lostStage ? { id: lostStage.id, name: lostStage.name } : null);
      if (lostStage) {
        // Move deal to lost stage, include reason as note
        const moved = await this.moveToStage(id, lostStage.id, userId, userName);
        // Append reason to notes
        await this.updateDeal(id, { notes: `${moved.notes || ''}\nLoss reason: ${reason}` }, userId, userName);
        return moved;
      }
    } catch (err) {
      console.warn('Failed to auto-move to LOST stage:', err?.message || err);
    }

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
    // Нормализуем managerId - если это массив, берем первый элемент
    // Если это объект/JSON, пытаемся извлечь значение
    let normalizedManagerId: string;
    
    if (Array.isArray(managerId)) {
      normalizedManagerId = String(managerId[0]);
      console.log('assignDeal: managerId was an array, normalized to:', normalizedManagerId);
    } else if (typeof managerId === 'object' && managerId !== null) {
      // Если это объект, пытаемся получить значение
      normalizedManagerId = String(Object.values(managerId)[0] || managerId);
      console.log('assignDeal: managerId was an object, normalized to:', normalizedManagerId);
    } else {
      normalizedManagerId = String(managerId);
    }
    
    console.log('assignDeal called with:', { id, originalManagerId: managerId, normalizedManagerId, userId, userName });
  const existingDeal = await this.getDealById(id);
  const oldAssignedTo = (existingDeal as any).assignedTo;
  console.log('existing deal assignedTo:', oldAssignedTo, typeof oldAssignedTo);

    // Если пользователь уже назначен, ничего не делаем
    if (oldAssignedTo === normalizedManagerId) {
      return existingDeal;
    }

    // Получаем ID пользователя для назначения
    let userIdNum: number;
    const parsedUserId = Number(normalizedManagerId);
    if (!Number.isNaN(parsedUserId)) {
      userIdNum = parsedUserId;
    } else {
      // Если normalizedManagerId - это username, ищем пользователя
      const userEntity = await this.userService.findByUsername(normalizedManagerId);
      if (!userEntity) {
        throw new Error(`User not found: ${normalizedManagerId}`);
      }
      userIdNum = userEntity.id;
    }
    console.log('userIdNum:', userIdNum);

    // Снимаем предыдущее назначение через AssignmentService
    if (oldAssignedTo) {
      let oldUserId: number;
      const parsedOldUserId = Number(oldAssignedTo);
      if (!Number.isNaN(parsedOldUserId)) {
        oldUserId = parsedOldUserId;
      } else {
        const oldUserEntity = await this.userService.findByUsername(oldAssignedTo);
        if (oldUserEntity) {
          oldUserId = oldUserEntity.id;
        } else {
          // Если старый пользователь не найден, пропускаем снятие назначения
          console.warn(`Old assigned user not found: ${oldAssignedTo}`);
        }
      }

      if (oldUserId) {
        try {
          await this.assignmentService.removeAssignment({
            entityType: 'deal',
            entityId: id,
            userIds: [oldUserId],
            reason: 'Reassigned to another user'
          });
        } catch (error) {
          // Игнорируем ошибки снятия назначения, если записи нет
          console.warn('Failed to remove old assignment:', error.message);
        }
      }
    }

    // Создаем новое назначение через AssignmentService
    const assignmentResult = await this.assignmentService.createAssignment({
      entityType: 'deal',
      entityId: id,
      assignedTo: [userIdNum],
      assignedBy: userId ? parseInt(userId) : 0,
      reason: 'Deal assigned to manager',
      notifyAssignees: false // Отключаем уведомления, так как это внутреннее действие
    });
    console.log('assignment result:', assignmentResult);

    // We no longer persist `assignedTo` on the Deal entity (column removed).
    // Record the assignment change in history and return the deal with relations.
    try {
      await this.historyService.createHistoryEntry({
        dealId: id,
        fieldName: 'assignedTo',
        oldValue: existingDeal ? String((existingDeal as any).assignedTo) : null,
        newValue: normalizedManagerId,
        changeType: DealChangeType.ASSIGNED,
        userId,
        userName,
        description: `Сделка назначена: ${normalizedManagerId}`,
        metadata: {
          'Назначена': normalizedManagerId,
          'Дата изменения': new Date().toLocaleDateString('ru-RU')
        }
      });
    } catch (err) {
      console.warn('Failed to write assignment history entry:', err?.message || err);
    }

    return this.getDealById(id);
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
    // assignedTo column was removed; fetch deals assigned to manager via AssignmentService
    try {
      const assignments = await this.assignmentService.getUserAssignments(Number(managerId), { entityType: 'deal', status: 'active' } as any);
      const dealIds = assignments.map(a => a.entityId).filter(Boolean);
      if (dealIds.length === 0) return [];
  const deals = await this.dealRepository.find({ where: { id: In(dealIds as any) }, relations: ['stage'], order: { createdAt: 'DESC' } });
  await this.attachAssignments(deals);
  return deals;
    } catch (err) {
      console.warn('Failed to get deals by manager via assignments:', err?.message || err);
      return [];
    }
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
    const deals = await this.dealRepository.find({
      where: { contact: { id: contactId } },
      relations: ['stage', 'company', 'contact', 'lead'],
      order: { createdAt: 'DESC' },
    });
    // Debug log to help diagnose frontend issues where related deals are not displayed.
    try {
      console.log(`getDealsByContact called`, { contactId, found: Array.isArray(deals) ? deals.length : 0 });
      if (Array.isArray(deals) && deals.length > 0) {
        // log brief summary of first deal to help with quick inspection
        const d = deals[0];
        console.log('getDealsByContact sample deal', { id: d.id, title: d.title, amount: d.amount, status: d.status });
      }
    } catch (err) {
      // swallow logging errors to avoid breaking the endpoint
      console.warn('Failed to log getDealsByContact debug info', err?.message || err);
    }

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

  /**
   * Получить текущие назначения сделки
   */
  async getCurrentAssignments(dealId: string) {
    return this.assignmentService.getCurrentAssignments('deal', dealId);
  }

  /**
   * Centralized: apply stage defaults (currently probability) to a deal if it doesn't have one
   * - If force === true, it will overwrite existing probability
   */
  private async setProbabilityFromStageIfMissing(dealId: string, stage?: PipelineStage, force = false): Promise<void> {
    if (!stage) {
      // Try to find stage from deal
      const deal = await this.getDealById(dealId).catch(() => null);
      if (!deal || !deal.stageId) return;
      stage = await this.stageRepository.findOne({ where: { id: deal.stageId } });
      if (!stage) return;
    }

    const deal = await this.getDealById(dealId);
    if (!deal) return;

    const stageProb = typeof stage.probability === 'number' ? stage.probability : Number(stage.probability);
    if (Number.isNaN(stageProb)) return;

    // Если вероятность уже установлена и не принудительно, ничего не делаем
    if (!force && deal.probability !== undefined && deal.probability !== null) {
      return;
    }

    // Обновляем вероятность сделки на основе этапа
    await this.updateDeal(dealId, { probability: stageProb }, /*userId=*/undefined, /*userName=*/undefined);
  }
}
