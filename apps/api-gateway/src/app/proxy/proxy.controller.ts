import {
  Controller,
  All,
  Req,
  Res,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as http from 'http';

/**
 * Proxy Controller - Strangler Fig Pattern Implementation
 * 
 * Routes unhandled requests to the legacy monolith backend.
 * As services are migrated to microservices, they will be handled
 * by their own controllers and won't reach this proxy.
 */
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private readonly monolithHost = process.env['MONOLITH_HOST'] || 'localhost';
  private readonly monolithPort = parseInt(process.env['MONOLITH_PORT'] || '3000', 10);

  /**
   * Catch-all route for proxying to monolith
   * This handles all routes not explicitly defined in other controllers
   */
  @All('proxy/*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.url.replace('/api/proxy', '');
    
    this.logger.debug(`Proxying ${req.method} ${path} to monolith`);

    const options: http.RequestOptions = {
      hostname: this.monolithHost,
      port: this.monolithPort,
      path: path,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${this.monolithHost}:${this.monolithPort}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || HttpStatus.OK);
      
      // Copy headers
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value) res.setHeader(key, value);
      });

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      this.logger.error(`Proxy error: ${err.message}`);
      res.status(HttpStatus.BAD_GATEWAY).json({
        error: 'Bad Gateway',
        message: 'Failed to reach backend service',
      });
    });

    // Forward request body
    if (req.body && Object.keys(req.body).length > 0) {
      proxyReq.write(JSON.stringify(req.body));
    }

    proxyReq.end();
  }

  /**
   * Legacy endpoint info
   */
  @All('legacy-info')
  legacyInfo() {
    return {
      message: 'This gateway routes to both microservices and legacy monolith',
      monolith: `http://${this.monolithHost}:${this.monolithPort}`,
      migrationStatus: {
        identity: 'microservice',
        contacts: 'microservice',
        leads: 'microservice',
        deals: 'microservice',
        telephony: 'monolith',
        tasks: 'monolith',
        notifications: 'monolith',
      },
    };
  }
}
