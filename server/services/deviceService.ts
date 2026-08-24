import { devicesRepository } from '../repositories/devicesRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { securityRepository } from '../repositories/securityRepository';
import { auditRepository } from '../repositories/auditRepository';
import { DeviceBinding } from '../../src/types';

export const deviceService = {
  /**
   * Validates device binding for employee punch in.
   * If employee has no device bound yet, registers and binds the current installation key.
   * If employee already has a bound device, verifies exact match.
   */
  async validateOrBindDevice(
    employeeId: string,
    employeeName: string,
    installationKey: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'Web Browser'
  ): Promise<{ isValid: boolean; deviceId?: string; error?: string; isNewBinding?: boolean }> {
    const employee = await employeesRepository.getById(employeeId);
    if (!employee) {
      return { isValid: false, error: 'Employee record not found.' };
    }

    const boundSignature = employee.boundHardwareSignature;

    // Case 1: First-time binding (No active device bound)
    if (!boundSignature) {
      // Check if this installation token is already bound to another active employee
      const allEmployees = await employeesRepository.getAll();
      const conflictEmp = allEmployees.find(
        (e) => e.employeeId !== employee.employeeId && e.boundHardwareSignature === installationKey && e.accountStatus === 'ACTIVE'
      );
      if (conflictEmp) {
        return {
          isValid: false,
          error: `This device/browser is already registered to another employee (${conflictEmp.fullName}). Device sharing is prohibited. Please contact Admin if you need a device reassignment.`,
        };
      }

      const deviceDoc: DeviceBinding = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        deviceId: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId: employee.employeeId,
        deviceSignature: installationKey,
        deviceModel: 'Web Browser Client',
        platform: 'web',
        browserFingerprint: installationKey,
        status: 'APPROVED',
        boundAt: new Date().toISOString(),
        firstUsedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        ipAddress,
        userAgent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = await devicesRepository.create(deviceDoc);
      await employeesRepository.update(employee.employeeId, {
        boundHardwareSignature: installationKey,
        activeDeviceId: created.deviceId,
      });

      await auditRepository.log({
        actorId: employee.employeeId,
        actorName: employee.fullName,
        actorRole: 'employee',
        action: 'DEVICE_BOUND',
        targetId: created.deviceId,
        details: { message: 'Initial 1:1 hardware device bound successfully', signature: installationKey },
        ipAddress,
      });

      return { isValid: true, deviceId: created.deviceId, isNewBinding: true };
    }

    // Case 2: Verify existing bound device
    if (boundSignature === installationKey) {
      // Update lastUsedAt
      const activeDev = await devicesRepository.getActiveByEmployeeId(employee.employeeId);
      if (activeDev) {
        await devicesRepository.update(activeDev.deviceId, {
          lastUsedAt: new Date().toISOString(),
          ipAddress,
          userAgent,
        });
      }
      return { isValid: true, deviceId: employee.activeDeviceId || activeDev?.deviceId };
    }

    // Case 3: Signature mismatch -> Device Violation
    await securityRepository.log({
      eventType: 'DEVICE_MISMATCH',
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      details: {
        message: 'Punch attempted from unregistered hardware device.',
        boundSignature: boundSignature.substring(0, 12) + '...',
        attemptedSignature: installationKey.substring(0, 12) + '...',
        ipAddress,
        userAgent,
      },
    });

    return {
      isValid: false,
      error: 'Unregistered hardware device. Your account is bound 1:1 to your registered device. Please use your registered phone/computer or contact HR/Admin for a device reset.',
    };
  },

  /**
   * Administrative reset of employee hardware device
   */
  async resetDevice(
    employeeId: string,
    adminId: string,
    adminName: string,
    ipAddress: string = '127.0.0.1'
  ): Promise<void> {
    const employee = await employeesRepository.getById(employeeId);
    if (!employee) throw new Error('Employee not found.');

    const oldDeviceId = employee.activeDeviceId;
    await devicesRepository.revokeAllForEmployee(employeeId, adminId, 'Administrative Hardware Reset');

    await employeesRepository.update(employeeId, {
      boundHardwareSignature: null,
      activeDeviceId: null,
    });

    await auditRepository.log({
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      action: 'DEVICE_RESET',
      targetId: employeeId,
      details: { message: 'Hardware binding cleared by Admin', previousDeviceId: oldDeviceId },
      ipAddress,
    });
  },

  async resetDeviceBinding(
    employeeId: string,
    adminId: string,
    adminName: string = 'Admin',
    ipAddress: string = '127.0.0.1'
  ): Promise<void> {
    return this.resetDevice(employeeId, adminId, adminName, ipAddress);
  },
};
