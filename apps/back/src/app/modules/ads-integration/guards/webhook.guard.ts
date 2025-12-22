import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import crypto from 'crypto';

@Injectable()
export class WebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: any = context.switchToHttp().getRequest();
    const secret = process.env.ADS_WEBHOOK_SECRET;
    if (!secret) throw new UnauthorizedException('Webhook secret not configured');

    // 1) token in header X-Ads-Token
    const token = req.headers['x-ads-token'] as string | undefined;
    if (token && token === secret) return true;

    // 2) HMAC signature header: x-hub-signature or x-hub-signature-256
    const sig = (req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']) as string | undefined;
  if (sig && this.verifySig(req.rawBody || JSON.stringify(req.body), secret, sig)) return true;

    throw new UnauthorizedException('Invalid webhook signature');
  }

  private verifySig(payload: string | Buffer, secret: string, sigHeader: string) {
    try {
      const algo = sigHeader.startsWith('sha256=') ? 'sha256' : sigHeader.startsWith('sha1=') ? 'sha1' : null;
      if (!algo) return false;
  const payloadBuf = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : Buffer.from(payload as any);
  // cast to any to avoid Node typings friction in this environment
  const expected = (crypto.createHmac as any)(algo, secret).update(payloadBuf as any).digest('hex');
  const provided = sigHeader.split('=')[1] || '';
  return (crypto.timingSafeEqual as any)(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
    } catch (err) {
      return false;
    }
  }
}
