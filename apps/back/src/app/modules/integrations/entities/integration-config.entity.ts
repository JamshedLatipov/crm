import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('integration_config')
export class IntegrationConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'Name of the integration' })
    @Column()
    name: string;

    @ApiProperty({ description: 'Is this integration active?' })
    @Column({ default: true })
    isActive: boolean;

    @ApiProperty({ description: 'List of data sources to fetch and merge' })
    @Column({ type: 'jsonb', default: [] })
    sources: {
        key: string; // 'profile', 'loans', 'deposits', 'accounts'
        urlTemplate: string;
        method: string;
        headers?: Record<string, string>;
        isList?: boolean; 
        mapping?: Record<string, string>;
        ui?: {
            type: 'table' | 'details';
            title: string;
            columns?: { key: string; label: string }[];
            fields?: { key: string; label: string }[];
        };
    }[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
