import {
  Employee,
  AttendanceRecord,
  LeaveRecord,
  Holiday,
  PayrollItem,
  PayrollRun,
  MasterRegisterEntry,
  DayWiseAttendanceEntry,
} from '../../src/types';

// Helper to convert number to Indian currency words
export function convertNumberToIndianWords(num: number): string {
  if (num === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(Math.abs(num));
  let output = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  if (crore > 0) output += inWords(crore) + 'Crore ';
  if (lakh > 0) output += inWords(lakh) + 'Lakh ';
  if (thousand > 0) output += inWords(thousand) + 'Thousand ';
  if (remainder > 0) output += inWords(remainder);

  return `Rupees ${output.trim()} Only`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const payrollService = {
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  },

  calculateMasterRegisterEntry(params: {
    employee: Employee;
    month: string; // YYYY-MM
    records: AttendanceRecord[];
    leaves: LeaveRecord[];
    holidays: Holiday[];
    siteName?: string;
    leaveBalance?: number;
  }): MasterRegisterEntry {
    const { employee, month, records, leaves, holidays, siteName, leaveBalance = 0 } = params;
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const totalDaysInMonth = this.getDaysInMonth(year, monthNum);

    const holidayDateMap = new Map<string, Holiday>();
    for (const h of holidays) {
      if (h.date.startsWith(month) && h.isActive !== false) {
        holidayDateMap.set(h.date, h);
      }
    }

    const empRecords = records.filter(
      (r) => r.employeeId === employee.employeeId && (r.businessDate || r.attendanceDate || '').startsWith(month)
    );

    const recordByDate = new Map<string, AttendanceRecord[]>();
    for (const r of empRecords) {
      const d = r.businessDate || r.attendanceDate || '';
      if (!recordByDate.has(d)) recordByDate.set(d, []);
      recordByDate.get(d)!.push(r);
    }

    const empApprovedLeaves = leaves.filter(
      (l) =>
        l.employeeId === employee.employeeId &&
        l.status === 'APPROVED' &&
        (l.startDate.startsWith(month) || l.endDate.startsWith(month))
    );

    const dayWiseBreakdown: DayWiseAttendanceEntry[] = [];
    let presentFullDays = 0;
    let presentHalfDays = 0;
    let absentDays = 0;
    let lateMarksCount = 0;
    let extraNightsCount = 0;
    let extraDaysCount = 0;
    let holidaysWorked = 0;
    let weeklyOffs = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(year, monthNum - 1, day);
      const dayOfWeek = dateObj.getDay();
      const dayName = DAY_NAMES[dayOfWeek];
      const isSunday = dayOfWeek === 0;
      if (isSunday) weeklyOffs++;

      const dayRecs = recordByDate.get(dateStr) || [];
      const primaryRec = dayRecs[0];
      const holiday = holidayDateMap.get(dateStr);

      let status: any = 'ABSENT';
      let shiftType = primaryRec?.shiftType;
      let isExtra = false;
      let signInTime = primaryRec?.signInTime || null;
      let signOutTime = primaryRec?.signOutTime || null;
      let workingMinutes = primaryRec?.workingMinutes || 0;
      let isLate = !!primaryRec?.isLate;
      let isReg = !!primaryRec?.isCorrected;

      if (dayRecs.length > 0) {
        const hasFullDay = dayRecs.some((r) => r.attendanceStatus === 'PRESENT_FULL_DAY');
        const hasHalfDay = dayRecs.some((r) => r.attendanceStatus === 'PRESENT_HALF_DAY');
        const hasExtraShift = dayRecs.some((r) => r.isExtraShift);

        if (hasExtraShift) {
          extraNightsCount++;
          isExtra = true;
        }

        if (holiday) {
          status = 'HOLIDAY_WORKED';
          holidaysWorked++;
          presentFullDays++;
        } else if (hasFullDay) {
          status = 'PRESENT_FULL_DAY';
          presentFullDays++;
        } else if (hasHalfDay) {
          status = 'PRESENT_HALF_DAY';
          presentHalfDays++;
        } else if (dayRecs[0].attendanceStatus === 'LEAVE') {
          status = 'LEAVE';
        }

        if (dayRecs.some((r) => r.isLate)) {
          lateMarksCount++;
          isLate = true;
        }
      } else {
        // Check if on approved leave
        const onLeave = empApprovedLeaves.find((l) => l.startDate <= dateStr && l.endDate >= dateStr);
        if (onLeave) {
          status = 'LEAVE';
        } else if (holiday) {
          status = 'HOLIDAY';
        } else if (isSunday) {
          status = 'WEEKLY_OFF';
        } else {
          status = 'ABSENT';
          absentDays++;
        }
      }

      dayWiseBreakdown.push({
        date: dateStr,
        dayName,
        status,
        shiftType,
        isExtraShift: isExtra,
        signInTime,
        signOutTime,
        workingMinutes,
        isLate,
        isRegularized: isReg,
      });
    }

    let paidLeaves = 0;
    let unpaidLeaves = 0;
    for (const l of empApprovedLeaves) {
      if (l.leaveType === 'UNPAID') {
        unpaidLeaves += l.unpaidDays ?? l.totalDays ?? 1;
      } else {
        paidLeaves += l.paidDays ?? l.totalDays ?? 1;
      }
    }

    const paidHolidays = holidayDateMap.size;
    const totalWorkingDays = totalDaysInMonth - weeklyOffs - paidHolidays;

    // Late penalty (3 late marks = 0.5 day LOP)
    const lateDeductionDays = Math.floor(lateMarksCount / 3) * 0.5;

    // Effective present
    const effectivePresentDays = presentFullDays + presentHalfDays * 0.5;
    let totalPayableDays = effectivePresentDays + weeklyOffs + paidHolidays + paidLeaves - lateDeductionDays;
    if (totalPayableDays > totalDaysInMonth) totalPayableDays = totalDaysInMonth;
    if (totalPayableDays < 0) totalPayableDays = 0;
    totalPayableDays = Number(totalPayableDays.toFixed(1));

    const id = `mr_${month}_${employee.employeeId}`;

    return {
      id,
      month,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      siteId: employee.assignedSiteIds?.[0] || 'SITE_MAIN',
      siteName: siteName || employee.assignedProjectSite || 'Milestone Main Site',
      joiningDate: employee.joiningDate,
      totalDaysInMonth,
      totalWorkingDays,
      
      actualPresentDays: effectivePresentDays,
      actualAbsentDays: absentDays,
      adminFinalPresentDays: effectivePresentDays,
      adminFinalAbsentDays: absentDays,
      
      paidLeaves,
      unpaidLeaves,
      leaveBalance,
      holidays: paidHolidays,
      holidaysWorked,
      weeklyOffs,
      lateMarksCount,
      halfDaysCount: presentHalfDays,
      extraDaysCount,
      extraNightsCount,
      totalPayableDays,
      
      status: 'DRAFT',
      dayWiseBreakdown,
    };
  },

  calculateItemFromMasterRegister(params: {
    employee: Employee;
    entry: MasterRegisterEntry;
    payrollRunId: string;
  }): PayrollItem {
    const { employee, entry, payrollRunId } = params;
    const month = entry.month;
    const [yearStr, monthStr] = month.split('-');
    const monthNum = parseInt(monthStr, 10);
    const totalDaysInMonth = entry.totalDaysInMonth;
    const paidDays = entry.totalPayableDays;
    const lopDays = Math.max(0, Number((totalDaysInMonth - paidDays).toFixed(1)));

    // Salary Structure
    const struct = employee.salaryStructure || {
      monthlyGross: 35000,
      basicSalary: 17500,
      hra: 7000,
      specialAllowance: 7000,
      conveyanceAllowance: 2000,
      medicalAllowance: 1500,
      otherAllowances: 0,
      pfApplicable: true,
      ptApplicable: true,
      tdsMonthly: 0,
    };

    const grossSalary = struct.monthlyGross || 35000;
    const basicSalary = struct.basicSalary || Math.round(grossSalary * 0.5);
    const hra = struct.hra || Math.round(basicSalary * 0.4);
    const conveyanceAllowance = struct.conveyanceAllowance || 1600;
    const medicalAllowance = struct.medicalAllowance || 1250;
    const specialAllowance = struct.specialAllowance || Math.max(0, grossSalary - (basicSalary + hra + conveyanceAllowance + medicalAllowance));
    const otherAllowances = struct.otherAllowances || 0;

    // Proration Factor
    const prorationRatio = totalDaysInMonth > 0 ? paidDays / totalDaysInMonth : 1;

    const earnedBasic = Math.round(basicSalary * prorationRatio);
    const earnedHra = Math.round(hra * prorationRatio);
    const earnedConveyance = Math.round(conveyanceAllowance * prorationRatio);
    const earnedMedical = Math.round(medicalAllowance * prorationRatio);
    const earnedSpecialAllowance = Math.round(specialAllowance * prorationRatio);
    const earnedOtherAllowances = Math.round(otherAllowances * prorationRatio);

    // Extra Night Shifts Allowance (₹500 per extra night shift)
    const extraNightAllowanceRate = 500;
    const extraNightBonus = entry.extraNightsCount * extraNightAllowanceRate;
    const incentivesBonus = 0;

    const totalGrossEarned =
      earnedBasic +
      earnedHra +
      earnedConveyance +
      earnedMedical +
      earnedSpecialAllowance +
      earnedOtherAllowances +
      extraNightBonus +
      incentivesBonus;

    // Deductions
    // 1. PF: 12% of earned basic if applicable
    let pfDeduction = 0;
    if (struct.pfApplicable !== false) {
      if (struct.pfFixedAmount) {
        pfDeduction = struct.pfFixedAmount;
      } else {
        const rate = (struct.pfRatePercent || 12) / 100;
        pfDeduction = Math.round(earnedBasic * rate);
      }
    }

    // 2. PT (Maharashtra Slab)
    let ptDeduction = 0;
    if (struct.ptApplicable !== false) {
      if (struct.ptFixedAmount !== undefined) {
        ptDeduction = struct.ptFixedAmount;
      } else {
        if (totalGrossEarned > 10000) {
          ptDeduction = monthNum === 2 ? 300 : 200;
        } else if (totalGrossEarned > 7500) {
          ptDeduction = 175;
        } else {
          ptDeduction = 0;
        }
      }
    }

    // 3. TDS & Other
    const tdsDeduction = struct.tdsMonthly || 0;
    const otherDeductions = struct.otherDeductions || 0;

    const totalDeductions = pfDeduction + ptDeduction + tdsDeduction + otherDeductions;
    const netSalary = Math.max(0, totalGrossEarned - totalDeductions);
    const netSalaryInWords = convertNumberToIndianWords(netSalary);

    const nowIso = new Date().toISOString();
    const itemId = `item_${payrollRunId}_${employee.employeeId}`;

    return {
      id: itemId,
      payrollRunId,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      joiningDate: employee.joiningDate,
      bankName: struct.bankName || 'HDFC Bank Ltd',
      accountNumber: struct.accountNumber || '•••• •••• ' + (employee.employeeId.slice(-4) || '1234'),
      ifscCode: struct.ifscCode || 'HDFC0001234',
      panNumber: struct.panNumber || 'ABCDE1234F',
      uanNumber: struct.uanNumber || '100987654321',
      
      month,
      totalDaysInMonth,
      workingDaysInMonth: entry.totalWorkingDays,
      
      presentFullDays: Math.floor(entry.adminFinalPresentDays),
      presentHalfDays: entry.halfDaysCount,
      paidLeaves: entry.paidLeaves,
      unpaidLeaves: entry.unpaidLeaves,
      weeklyOffs: entry.weeklyOffs,
      paidHolidays: entry.holidays,
      absentDays: entry.adminFinalAbsentDays,
      lateDays: entry.lateMarksCount,
      lateDeductionDays: Math.floor(entry.lateMarksCount / 3) * 0.5,
      extraNightShifts: entry.extraNightsCount,
      extraNightAllowanceRate,
      
      paidDays: entry.totalPayableDays,
      lopDays,
      
      grossSalary,
      basicSalary,
      hra,
      specialAllowance,
      conveyanceAllowance,
      medicalAllowance,
      otherAllowances,
      
      earnedBasic,
      earnedHra,
      earnedSpecialAllowance,
      earnedConveyance,
      earnedMedical,
      earnedOtherAllowances,
      extraNightBonus,
      incentivesBonus,
      totalGrossEarned,
      
      pfDeduction,
      ptDeduction,
      tdsDeduction,
      otherDeductions,
      totalDeductions,
      
      netSalary,
      netSalaryInWords,
      
      paymentStatus: 'UNPAID',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  },

  calculateItem(params: {
    employee: Employee;
    month: string; // YYYY-MM
    payrollRunId: string;
    records: AttendanceRecord[];
    leaves: LeaveRecord[];
    holidays: Holiday[];
  }): PayrollItem {
    const entry = this.calculateMasterRegisterEntry({
      employee: params.employee,
      month: params.month,
      records: params.records,
      leaves: params.leaves,
      holidays: params.holidays,
    });

    return this.calculateItemFromMasterRegister({
      employee: params.employee,
      entry,
      payrollRunId: params.payrollRunId,
    });
  },
};

