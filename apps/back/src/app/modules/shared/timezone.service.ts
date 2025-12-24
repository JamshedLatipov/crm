import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { APP_TIMEZONE, REGIONAL_TIMEZONES } from '../../config/timezone.config';

@Injectable()
export class TimezoneService {
  /**
   * Get the default application timezone
   */
  getDefaultTimezone(): string {
    return APP_TIMEZONE;
  }
  /**
   * Converts a Date object to a specific timezone
   * @param date Date to convert
   * @param timezone IANA timezone string (e.g., 'Europe/Moscow', 'America/New_York')
   * @returns ISO string in the target timezone
   */
  convertToTimezone(date: Date | string | null | undefined, timezone: string): string | null {
    if (!date) return null;
    
    try {
      const dt = DateTime.fromJSDate(typeof date === 'string' ? new Date(date) : date, {
        zone: 'utc'
      });
      
      return dt.setZone(timezone).toISO();
    } catch (error) {
      console.error(`Error converting date to timezone ${timezone}:`, error);
      return null;
    }
  }

  /**
   * Gets current time in a specific timezone
   * @param timezone IANA timezone string
   * @returns ISO string in the target timezone
   */
  now(timezone: string): string {
    return DateTime.now().setZone(timezone).toISO();
  }

  /**
   * Calculates duration between two dates in seconds
   * @param start Start date
   * @param end End date (defaults to now)
   * @returns Duration in seconds
   */
  getDuration(start: Date | string, end?: Date | string): number {
    const startDt = DateTime.fromJSDate(
      typeof start === 'string' ? new Date(start) : start
    );
    const endDt = end
      ? DateTime.fromJSDate(typeof end === 'string' ? new Date(end) : end)
      : DateTime.now();

    return Math.floor(endDt.diff(startDt, 'seconds').seconds);
  }

  /**
   * Formats a date for a specific timezone
   * @param date Date to format
   * @param timezone IANA timezone string
   * @param format Format string (defaults to 'dd.MM.yyyy HH:mm:ss')
   * @returns Formatted date string
   */
  format(
    date: Date | string | null | undefined,
    timezone: string,
    format: string = 'dd.MM.yyyy HH:mm:ss'
  ): string | null {
    if (!date) return null;

    try {
      const dt = DateTime.fromJSDate(typeof date === 'string' ? new Date(date) : date, {
        zone: 'utc'
      });

      return dt.setZone(timezone).toFormat(format);
    } catch (error) {
      console.error(`Error formatting date for timezone ${timezone}:`, error);
      return null;
    }
  }

  /**
   * Validates if a timezone string is valid
   * @param timezone IANA timezone string to validate
   * @returns true if valid, false otherwise
   */
  isValidTimezone(timezone: string): boolean {
    try {
      DateTime.now().setZone(timezone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets list of common timezones
   */
  getCommonTimezones(): { value: string; label: string; offset: string }[] {
    const now = DateTime.now();
    const timezones = [
      ...REGIONAL_TIMEZONES,
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Asia/Dubai',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];

    return timezones.map((tz) => {
      const dt = now.setZone(tz);
      return {
        value: tz,
        label: tz.replace(/_/g, ' '),
        offset: dt.toFormat('ZZ'),
      };
    });
  }
}
