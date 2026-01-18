import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DisplayConfig,
  CreateDisplayConfigDto,
  UpdateDisplayConfigDto,
} from '@libs/shared/sto-types';

@Injectable()
export class DisplayConfigService {
  constructor(
    @InjectRepository(DisplayConfig)
    private displayConfigRepository: Repository<DisplayConfig>,
  ) {}

  async create(createDto: CreateDisplayConfigDto): Promise<DisplayConfig> {
    const config = this.displayConfigRepository.create({
      ...createDto,
      filters: {
        zones: createDto.zones,
        workTypes: createDto.workTypes,
        showBlocked: createDto.showBlocked,
      },
    });
    return this.displayConfigRepository.save(config);
  }

  async findAll(): Promise<DisplayConfig[]> {
    return this.displayConfigRepository.find({
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findActive(): Promise<DisplayConfig[]> {
    return this.displayConfigRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<DisplayConfig> {
    const config = await this.displayConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`Display config with ID ${id} not found`);
    }
    return config;
  }

  async update(id: string, updateDto: UpdateDisplayConfigDto): Promise<DisplayConfig> {
    const config = await this.findOne(id);

    if (updateDto.zones || updateDto.workTypes !== undefined || updateDto.showBlocked !== undefined) {
      config.filters = {
        zones: updateDto.zones || config.filters.zones,
        workTypes: updateDto.workTypes !== undefined ? updateDto.workTypes : config.filters.workTypes,
        showBlocked: updateDto.showBlocked !== undefined ? updateDto.showBlocked : config.filters.showBlocked,
      };
    }

    Object.assign(config, {
      name: updateDto.name || config.name,
      location: updateDto.location !== undefined ? updateDto.location : config.location,
      isActive: updateDto.isActive !== undefined ? updateDto.isActive : config.isActive,
      displayOrder: updateDto.displayOrder !== undefined ? updateDto.displayOrder : config.displayOrder,
    });

    return this.displayConfigRepository.save(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.displayConfigRepository.remove(config);
  }
}
