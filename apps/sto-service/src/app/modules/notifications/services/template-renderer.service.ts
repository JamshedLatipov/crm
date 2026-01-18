import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateRendererService {
  render(template: string, data: any): string {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }

  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error?.message };
    }
  }
}
