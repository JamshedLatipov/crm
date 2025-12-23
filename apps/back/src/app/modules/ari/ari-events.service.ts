import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { AriService } from './ari.service';
import { AriEventStoreService } from './ari-event-store.service';

@Injectable()
export class AriEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AriEventsService.name);
  private readonly subject = new Subject<{ event: string; args: unknown[] }>();
  private originalEmit?: (...args: unknown[]) => boolean;
  private attachRetry?: NodeJS.Timeout;

  constructor(
    private readonly ari: AriService,
    private readonly store?: AriEventStoreService,
  ) {}

  onModuleInit() {
    // Try to attach immediately; if client not ready, retry until available
    // console.debug('[AriEventsService] onModuleInit: attempting attach');
    const tryAttach = () => {
      const client = this.ari.getClient();
      if (client) {
        // console.debug('[AriEventsService] onModuleInit: client available, attaching now');
        this.attachToClient(client);
        if (this.attachRetry) {
          clearInterval(this.attachRetry as unknown as number);
          this.attachRetry = undefined;
        }
      } else {
        // console.debug('[AriEventsService] onModuleInit: client not ready, will retry');
      }
    };

    tryAttach();
    if (!this.originalEmit) {
      // poll briefly until client becomes available
      this.attachRetry = setInterval(tryAttach, 500);
    }

    // Also subscribe to AriService re-emitted core events so consumers get them via either path
    const coreEvents = [
      'StasisStart',
      'StasisEnd',
      'ChannelCreated',
      'ChannelDestroyed',
      'ChannelStateChange',
      'ChannelDtmfReceived',
      'PlaybackStarted',
      'PlaybackFinished',
    ];
    coreEvents.forEach((evt) =>
      this.ari.on(evt, async (...args: unknown[]) => {
        try {
        //   console.debug('[AriEventsService] re-emitted core event', evt, args);
        } catch {}
        this.subject.next({ event: evt, args });
        try {
          if (this.store) {
            const payload = args && args.length ? (args[0] as unknown) : null;
            // try to extract channelId if present
            let channelId: string | null = null;
            try {
              const maybe = payload as any;
              channelId = maybe?.channel?.id || maybe?.id || null;
            } catch {
              channelId = null;
            }
            await this.store.write({ event: evt, channelId: channelId ?? null, payload: payload as Record<string, unknown> ?? null, raw: undefined });
          }
        } catch (e) {
        //   console.debug('[AriEventsService] failed to persist re-emitted event', evt, e);
        }
      })
    );
  }

  private attachToClient(client: any) {
    if (!client || typeof client.emit !== 'function') return;
    if (this.originalEmit) return; // already attached

    this.originalEmit = client.emit.bind(client);
    const self = this;
    // Monkey-patch emit so we observe every event emitted by the underlying client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).emit = function (event: string, ...args: unknown[]) {
      try {
        try {
          // lightweight console debug for raw events
        //   console.debug('[ARI EVENT]', event, args && args.length ? args : 'no-args');
        } catch {}
        self.subject.next({ event, args });
        // Persist to DB if store available (fire-and-forget)
        try {
          if (self.store) {
            const payload = args && args.length ? (args[0] as unknown) : null;
            let channelId: string | null = null;
            try {
              const maybe = payload as any;
              channelId = maybe?.channel?.id || maybe?.id || null;
            } catch {
              channelId = null;
            }
            // do not await to avoid slowing emit
            void self.store.write({ event, channelId: channelId ?? null, payload: payload as Record<string, unknown> ?? null, raw: undefined });
          }
        } catch (e) {
          try {
            // console.debug('[AriEventsService] failed to persist event', event, e);
          } catch {}
        }
      } catch (err) {
        try {
        //   console.debug('[AriEventsService] subject.next failed', err);
        } catch {}
      }
      // call original emit
      return self.originalEmit ? self.originalEmit(event, ...args) : true;
    };
    this.logger.log('Attached to ARI client.emit to intercept events');
    // console.debug('[AriEventsService] attachToClient: patched client.emit');
  }

  // Expose observable for consumers
  get events(): Observable<{ event: string; args: unknown[] }> {
    return this.subject.asObservable();
  }

  onModuleDestroy() {
    const client = this.ari.getClient();
    if (client && this.originalEmit) {
      try {
        // restore original emit
        (client as any).emit = this.originalEmit;
        this.logger.log('Restored ARI client.emit');
        // console.debug('[AriEventsService] onModuleDestroy: restored client.emit');
      } catch {
        /* ignore */
      }
    }
    if (this.attachRetry) {
      clearInterval(this.attachRetry as unknown as number);
      this.attachRetry = undefined;
    }
    this.subject.complete();
    // console.debug('[AriEventsService] onModuleDestroy: subject completed');
  }
}
