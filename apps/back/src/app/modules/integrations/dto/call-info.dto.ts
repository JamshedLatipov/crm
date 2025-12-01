import { IsString, IsOptional, IsNumber, IsArray, IsUrl, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SectionConfig {
    @ApiProperty({ description: 'Type of the section (table, details, etc.)' })
    type: 'table' | 'details';

    @ApiProperty({ description: 'Title of the section' })
    title: string;

    @ApiProperty({ description: 'Column definitions for tables', required: false })
    columns?: { key: string; label: string }[];

    @ApiProperty({ description: 'Field definitions for details view', required: false })
    fields?: { key: string; label: string }[];
}

export class IntegrationSection {
    @ApiProperty({ description: 'Unique key for the section' })
    key: string;

    @ApiProperty({ description: 'UI Configuration for the section' })
    ui: SectionConfig;

    @ApiProperty({ description: 'The actual data for the section' })
    data: any;
}

export class StandardizedCallInfo {
    @ApiProperty({ description: 'Client full name', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ description: 'Client phone number', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'Client balance or account value', required: false })
    @IsNumber()
    @IsOptional()
    balance?: number;

    @ApiProperty({ description: 'Currency symbol or code', required: false })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({ description: 'Client status (e.g. VIP, New, Blocked)', required: false })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiProperty({ description: 'Link to the client profile in external system', required: false })
    @IsUrl()
    @IsOptional()
    externalUrl?: string;

    @ApiProperty({ description: 'Dynamic sections defined by configuration', type: [IntegrationSection] })
    @IsArray()
    @IsOptional()
    sections?: IntegrationSection[];
}
