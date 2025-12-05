import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig } from '../entities/integration-config.entity';
import { StandardizedCallInfo } from '../dto/call-info.dto';
import axios from 'axios';
import { getMockDataByKey } from './mock-data';

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    constructor(
        @InjectRepository(IntegrationConfig)
        private configRepo: Repository<IntegrationConfig>
    ) {}

    async getCallInfo(phone: string): Promise<StandardizedCallInfo> {
        const config = await this.configRepo.findOne({ where: { isActive: true } });
        
        if (!config || !config.sources || config.sources.length === 0) {
            return {};
        }

        const result: StandardizedCallInfo = {};
        const useMocks = process.env.USE_MOCKS === 'true';
        
        // Execute all sources in parallel
        await Promise.all(config.sources.map(async (source) => {
            try {
                let data;

                if (useMocks) {
                    this.logger.log(`Using MOCK data for ${source.key}`);
                    // Simulate network delay
                    await new Promise(resolve => setTimeout(resolve, 300));
                    data = getMockDataByKey(source.key);
                } else {
                    const url = source.urlTemplate.replace('{{phone}}', phone);
                    const headers = source.headers || {};
                    
                    this.logger.log(`Fetching ${source.key} from ${url}`);
                    
                    const response = await axios({
                        method: source.method as any,
                        url,
                        headers
                    });
                    data = response.data;
                }

                this.processSourceData(result, source, data);

            } catch (error) {
                this.logger.error(`Error fetching ${source.key}: ${error.message}`);
                // Continue with other sources
            }
        }));

        return result;
    }

    private processSourceData(result: StandardizedCallInfo, source: any, data: any) {
        if (!data) return;

        // Handle array responses
        let items = Array.isArray(data) ? data : [data];
        
        // If UI config is present, add to sections
        if (source.ui) {
            if (!result.sections) result.sections = [];
            
            let sectionData = items;
            // If it's a details view, we expect a single object
            if (source.ui.type === 'details') {
                sectionData = items[0] || {};
            }

            // Apply mapping if present
            if (source.mapping) {
                if (Array.isArray(sectionData)) {
                    sectionData = sectionData.map(item => this.mapItem(item, source.mapping));
                } else {
                    sectionData = this.mapItem(sectionData, source.mapping);
                }
            }

            result.sections.push({
                key: source.key,
                ui: source.ui,
                data: sectionData
            });
        }

        // Check for root fields mapping (name, phone, etc) even if it's a section
        // This allows populating the header from one of the sources
        if (source.key === 'profile' || source.key === 'customer') {
             const item = items[0];
             if (item) {
                const mapped = this.mapItem(item, source.mapping);
                if (mapped.name) result.name = mapped.name;
                if (mapped.phone) result.phone = mapped.phone;
                if (mapped.balance !== undefined) result.balance = mapped.balance;
                if (mapped.currency) result.currency = mapped.currency;
                if (mapped.status) result.status = mapped.status;
                if (mapped.externalUrl) result.externalUrl = mapped.externalUrl;
             }
        }
    }

    private mapItem(item: any, mapping: Record<string, string>): any {
        if (!mapping) return item; // No mapping? Return raw item

        const result: any = {};
        Object.assign(result, item); // Copy all raw data

        for (const sourceField in mapping) {
            const targetField = mapping[sourceField];
            const value = this.getValue(item, sourceField);
            if (value !== undefined) {
                result[targetField] = value;
            }
        }
        return result;
    }

    private getValue(obj: any, path: string): any {
        if (!path) return undefined;
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }
}
