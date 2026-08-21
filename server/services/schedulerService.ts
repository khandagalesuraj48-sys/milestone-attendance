import { attendanceRepository } from '../repositories/attendanceRepository';
import { auditRepository } from '../repositories/auditRepository';
import { shiftService } from './shiftService';

export const schedulerService = {
  /**
   * Run Day Shift Auto Sign-Out at 01:00 AM IST.
   * Only closes OPEN DAY sessions that have passed 01:00 AM IST of the NEXT business date
   * following the shift's business date (i.e. abandoned sessions).
   */
  async runDayShiftAutoSignOut(): Promise<{ processedCount: number; recordIds: string[] }> {
    const openSessions = await attendanceRepository.getAllOpenSessions();
    const daySessions = openSessions.filter((s) => s.shiftType === 'DAY');

    const processedIds: string[] = [];
    const now = new Date();
    const nowIso = now.toISOString();

    for (const session of daySessions) {
      // Determine session business date (YYYY-MM-DD)
      const bDate = session.businessDate || session.attendanceDate || shiftService.getBusinessDate('DAY', session.signInTime || now);
      
      // Calculate cutoff: 01:00 AM IST on the NEXT calendar day following bDate
      const [y, m, d] = bDate.split('-').map(Number);
      const nextDayDate = new Date(Date.UTC(y, m - 1, d + 1));
      const nextDayStr = nextDayDate.toISOString().split('T')[0];
      const cutoffTimeMs = new Date(`${nextDayStr}T01:00:00+05:30`).getTime();

      // If current time is before the 01:00 AM IST cutoff of the next day, employee is still within working/grace window
      if (now.getTime() < cutoffTimeMs) {
        continue;
      }

      const startMs = new Date(session.signInTime || nowIso).getTime();
      // Calculate working minutes up to cutoff
      const workingMinutes = Math.min(Math.max(0, Math.round((cutoffTimeMs - startMs) / 60000)), 480);

      const targetId = session.recordId || session.id || '';
      await attendanceRepository.update(targetId, {
        signOutTime: nowIso,
        sessionStatus: 'CLOSED',
        attendanceState: 'AUTO_SIGNED_OUT',
        attendanceStatus: 'PRESENT_HALF_DAY', // Milestone Policy: Auto sign-out capped at HALF_DAY
        workingMinutes,
        signOutReason: 'EMPLOYEE_FORGOT_SIGN_OUT',
        autoSignedOutAt: nowIso,
      });

      await auditRepository.log({
        actorId: 'SYSTEM_SCHEDULER',
        actorName: 'Milestone Auto Sign-Out Daemon',
        actorRole: 'admin',
        action: 'AUTO_SIGN_OUT_EXECUTED',
        targetId,
        details: {
          employeeId: session.employeeId,
          shiftType: 'DAY',
          businessDate: session.businessDate || bDate,
          workingMinutes,
          reason: '01:00 AM IST Next Day Cutoff Reached — Auto Signed Out as Half Day',
        },
        ipAddress: '127.0.0.1',
      });

      processedIds.push(targetId);
    }

    return { processedCount: processedIds.length, recordIds: processedIds };
  },

  /**
   * Run Night Shift Auto Sign-Out at 08:00 AM IST.
   * Only closes OPEN NIGHT sessions that have passed 08:00 AM IST following the shift's business date.
   */
  async runNightShiftAutoSignOut(): Promise<{ processedCount: number; recordIds: string[] }> {
    const openSessions = await attendanceRepository.getAllOpenSessions();
    const nightSessions = openSessions.filter((s) => s.shiftType === 'NIGHT');

    const processedIds: string[] = [];
    const now = new Date();
    const nowIso = now.toISOString();

    for (const session of nightSessions) {
      // Determine session business date (YYYY-MM-DD)
      const bDate = session.businessDate || session.attendanceDate || shiftService.getBusinessDate('NIGHT', session.signInTime || now);
      
      // Calculate cutoff: 08:00 AM IST on the morning following the night shift's business date (bDate + 1 day)
      const [y, m, d] = bDate.split('-').map(Number);
      const nextDayDate = new Date(Date.UTC(y, m - 1, d + 1));
      const nextDayStr = nextDayDate.toISOString().split('T')[0];
      const cutoffTimeMs = new Date(`${nextDayStr}T08:00:00+05:30`).getTime();

      // If current time is before the 08:00 AM IST cutoff, session is still within working/grace window
      if (now.getTime() < cutoffTimeMs) {
        continue;
      }

      const startMs = new Date(session.signInTime || nowIso).getTime();
      const workingMinutes = Math.min(Math.max(0, Math.round((cutoffTimeMs - startMs) / 60000)), 480);

      const targetId = session.recordId || session.id || '';
      await attendanceRepository.update(targetId, {
        signOutTime: nowIso,
        sessionStatus: 'CLOSED',
        attendanceState: 'AUTO_SIGNED_OUT',
        attendanceStatus: 'PRESENT_HALF_DAY',
        workingMinutes,
        signOutReason: 'EMPLOYEE_FORGOT_SIGN_OUT',
        autoSignedOutAt: nowIso,
      });

      await auditRepository.log({
        actorId: 'SYSTEM_SCHEDULER',
        actorName: 'Milestone Auto Sign-Out Daemon',
        actorRole: 'admin',
        action: 'AUTO_SIGN_OUT_EXECUTED',
        targetId,
        details: {
          employeeId: session.employeeId,
          shiftType: 'NIGHT',
          businessDate: session.businessDate || bDate,
          workingMinutes,
          reason: '08:00 AM IST Following Morning Cutoff Reached — Auto Signed Out as Half Day',
        },
        ipAddress: '127.0.0.1',
      });

      processedIds.push(targetId);
    }

    return { processedCount: processedIds.length, recordIds: processedIds };
  },
};
