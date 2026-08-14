import { attendanceRepository } from '../repositories/attendanceRepository';
import { auditRepository } from '../repositories/auditRepository';
import { shiftService } from './shiftService';

export const schedulerService = {
  /**
   * Run Day Shift Auto Sign-Out at 01:00 AM IST.
   * Finds all OPEN DAY sessions from previous business dates and closes them automatically.
   */
  async runDayShiftAutoSignOut(): Promise<{ processedCount: number; recordIds: string[] }> {
    const openSessions = await attendanceRepository.getAllOpenSessions();
    const daySessions = openSessions.filter((s) => s.shiftType === 'DAY');

    const processedIds: string[] = [];
    const now = new Date();
    const nowIso = now.toISOString();

    for (const session of daySessions) {
      const startMs = new Date(session.signInTime || nowIso).getTime();
      const endMs = now.getTime();
      // Calculate working minutes up to cutoff
      const workingMinutes = Math.min(Math.max(0, Math.round((endMs - startMs) / 60000)), 480);

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
          businessDate: session.businessDate,
          workingMinutes,
          reason: '01:00 AM IST Cutoff Reached — Auto Signed Out as Half Day',
        },
        ipAddress: '127.0.0.1',
      });

      processedIds.push(targetId);
    }

    return { processedCount: processedIds.length, recordIds: processedIds };
  },

  /**
   * Run Night Shift Auto Sign-Out at 08:00 AM IST.
   * Finds all OPEN NIGHT sessions and closes them automatically.
   */
  async runNightShiftAutoSignOut(): Promise<{ processedCount: number; recordIds: string[] }> {
    const openSessions = await attendanceRepository.getAllOpenSessions();
    const nightSessions = openSessions.filter((s) => s.shiftType === 'NIGHT');

    const processedIds: string[] = [];
    const now = new Date();
    const nowIso = now.toISOString();

    for (const session of nightSessions) {
      const startMs = new Date(session.signInTime || nowIso).getTime();
      const endMs = now.getTime();
      const workingMinutes = Math.min(Math.max(0, Math.round((endMs - startMs) / 60000)), 480);

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
          businessDate: session.businessDate,
          workingMinutes,
          reason: '08:00 AM IST Cutoff Reached — Auto Signed Out as Half Day',
        },
        ipAddress: '127.0.0.1',
      });

      processedIds.push(targetId);
    }

    return { processedCount: processedIds.length, recordIds: processedIds };
  },
};
