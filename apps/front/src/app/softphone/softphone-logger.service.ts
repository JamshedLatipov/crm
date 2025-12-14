import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoftphoneLoggerService {
  private prefix() { return '[Softphone]'; }

  info(...args: any[]) {
    // eslint-disable-next-line no-console
    console.info(this.prefix(), ...args);
  }
  debug(...args: any[]) {
    // eslint-disable-next-line no-console
    console.debug(this.prefix(), ...args);
  }
  warn(...args: any[]) {
    // eslint-disable-next-line no-console
    console.warn(this.prefix(), ...args);
  }
  error(...args: any[]) {
    // eslint-disable-next-line no-console
    console.error(this.prefix(), ...args);
  }
}
