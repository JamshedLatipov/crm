import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStage, StageType } from './entities/pipeline-stage.entity';

export interface CreateStageDto {
  name: string;
  type?: StageType;
  position?: number;
  probability?: number;
}

export interface UpdateStageDto {
  name?: string;
  type?: StageType;
  position?: number;
  probability?: number;
  isActive?: boolean;
}

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(PipelineStage)
    private readonly stageRepository: Repository<PipelineStage>,
  ) {}

  async findAll(): Promise<PipelineStage[]> {
    return this.stageRepository.find({
      where: { isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findOne(id: string): Promise<PipelineStage> {
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) {
      throw new NotFoundException(`Stage ${id} not found`);
    }
    return stage;
  }

  async create(dto: CreateStageDto): Promise<PipelineStage> {
    const maxPosition = await this.stageRepository
      .createQueryBuilder('stage')
      .select('MAX(stage.position)', 'max')
      .getRawOne();

    const stage = this.stageRepository.create({
      ...dto,
      position: dto.position ?? (maxPosition?.max || 0) + 1,
    });

    return this.stageRepository.save(stage);
  }

  async update(id: string, dto: UpdateStageDto): Promise<PipelineStage> {
    const stage = await this.findOne(id);
    Object.assign(stage, dto);
    return this.stageRepository.save(stage);
  }

  async remove(id: string): Promise<void> {
    const stage = await this.findOne(id);
    stage.isActive = false;
    await this.stageRepository.save(stage);
  }

  async reorder(stageIds: string[]): Promise<PipelineStage[]> {
    const stages = await Promise.all(
      stageIds.map(async (id, index) => {
        const stage = await this.findOne(id);
        stage.position = index;
        return this.stageRepository.save(stage);
      }),
    );
    return stages;
  }
}
