import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CrmApiService {
  private readonly crmApiUrl: string;
  private readonly crmApiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.crmApiUrl = this.configService.get<string>('CRM_API_URL') || 'http://localhost:3000/api';
    this.crmApiKey = this.configService.get<string>('CRM_API_KEY') || 'shared_secret_key';
  }

  async findContactByPhone(phone: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.crmApiUrl}/contacts/search`, {
          params: { phone },
          headers: { 'X-API-Key': this.crmApiKey },
        })
      );
      return (response as any).data;
    } catch (error: any) {
      console.error('Error fetching contact from CRM:', error?.message);
      return null;
    }
  }

  async getContact(contactId: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.crmApiUrl}/contacts/${contactId}`, {
          headers: { 'X-API-Key': this.crmApiKey },
        })
      );
      return (response as any).data;
    } catch (error: any) {
      console.error('Error fetching contact from CRM:', error?.message);
      return null;
    }
  }

  async logActivity(activityData: {
    contactId: string;
    type: string;
    description: string;
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.crmApiUrl}/activities`, activityData, {
          headers: { 'X-API-Key': this.crmApiKey },
        })
      );
    } catch (error: any) {
      console.error('Error logging activity to CRM:', error?.message);
    }
  }
}
