import { ShiftType, AttendanceStatus, AttendanceRules } from '../../src/types';

export interface ISTDateParts {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  yearMonth: string; // YYYY-MM
}

export const shiftService = {
  /**
   * Get current or specified timestamp parsed in Asia/Kolkata (IST) timezone
   */
  getISTDateParts(dateInput?: Date | string | number): ISTDateParts {
    const d = dateInput ? new Date(dateInput) : new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    let year = '', month = '', day = '', hour = '0', minute = '0', second = '0';
    for (const p of parts) {
      if (p.type === 'year') year = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'day') day = p.value;
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'second') second = p.value;
    }

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hour}:${minute}:${second}`;
    const hNum = parseInt(hour, 10);
    const mNum = parseInt(minute, 10);
    const sNum = parseInt(second, 10);

    // Compute day of week in IST
    const istDate = new Date(`${dateStr}T${timeStr}+05:30`);
    const dayOfWeek = istDate.getDay();

    return {
      dateStr,
      timeStr,
      hour: hNum,
      minute: mNum,
      second: sNum,
      dayOfWeek,
      yearMonth: `${year}-${month}`,
    };
  },

  /**
   * Determine the business date for attendance record.
   * For DAY shift: current IST date.
   * For NIGHT shift: if sign-in is between 00:00 and 06:00, belongs to previous calendar date.
   */
  getBusinessDate(shiftType: ShiftType, dateInput?: Date | string | number): string {
    const ist = this.getISTDateParts(dateInput);
    if (shiftType === 'DAY') {
      return ist.dateStr;
    }

    // NIGHT Shift
    if (ist.hour < 6) {
      // Early morning hours of overnight shift belong to previous calendar date
      const d = dateInput ? new Date(dateInput) : new Date();
      const prev = new Date(d.getTime() - 24 * 60 * 60 * 1000);
      return this.getISTDateParts(prev).dateStr;
    }

    return ist.dateStr;
  },

  /**
   * Determine if sign-in is late based on shift timings and grace period
   */
  evaluateLateStatus(
    shiftType: ShiftType,
    signInTime: string,
    rules: AttendanceRules
  ): { isLate: boolean; lateMinutes: number } {
    const ist = this.getISTDateParts(signInTime);
    const totalMinutes = ist.hour * 60 + ist.minute;

    if (shiftType === 'DAY') {
      const [startH, startM] = rules.dayShift.startTime.split(':').map((v) => parseInt(v, 10));
      const thresholdMinutes = startH * 60 + startM + rules.dayShift.gracePeriodMinutes; // e.g. 08:15 = 495
      if (totalMinutes > thresholdMinutes) {
        return { isLate: true, lateMinutes: totalMinutes - (startH * 60 + startM) };
      }
      return { isLate: false, lateMinutes: 0 };
    }

    // NIGHT Shift (19:00 start)
    const [startH, startM] = rules.nightShift.startTime.split(':').map((v) => parseInt(v, 10));
    const thresholdMinutes = startH * 60 + startM + rules.nightShift.gracePeriodMinutes; // e.g. 19:15 = 1155
    // Note: If punched in between 19:16 and 23:59
    if (totalMinutes > thresholdMinutes && totalMinutes < 24 * 60) {
      return { isLate: true, lateMinutes: totalMinutes - (startH * 60 + startM) };
    }
    // If punched in after midnight (00:00 to 04:00)
    if (totalMinutes < 4 * 60) {
      const lateMins = (24 * 60 - (startH * 60 + startM)) + totalMinutes;
      return { isLate: true, lateMinutes: lateMins };
    }

    return { isLate: false, lateMinutes: 0 };
  },

  /**
   * Calculates attendance status from working duration and late count
   */
  calculateAttendanceStatus(
    workingMinutes: number,
    rules: AttendanceRules,
    monthlyLateCount: number = 0
  ): AttendanceStatus {
    const halfDayMins = Math.round(rules.halfDayThresholdHours * 60); // 240
    const fullDayMins = Math.round(rules.fullDayThresholdHours * 60); // 540

    if (workingMinutes <= 0 || workingMinutes < halfDayMins) {
      return 'ABSENT';
    }

    if (workingMinutes < fullDayMins) {
      return 'PRESENT_HALF_DAY';
    }

    // Full day duration achieved (>= 540 min)
    // If late mark index in this month is 4 or higher, capped at PRESENT_HALF_DAY as per Milestone policy
    if (monthlyLateCount >= 4) {
      return 'PRESENT_HALF_DAY';
    }

    return 'PRESENT_FULL_DAY';
  },
};
