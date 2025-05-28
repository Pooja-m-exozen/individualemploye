export interface MonthlyStats {
  success: boolean;
  message: string;
  data: {
    month: number;
    year: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    overtimeDays: number;
    lateArrivals: number;
    earlyArrivals: number;
    earlyLeaves: number;
    attendanceRate: string;
    summary: {
      totalDays: number;
      daysPresent: number;
      daysAbsent: number;
      punctualityIssues: {
        lateArrivals: number;
        earlyArrivals: number;
        earlyLeaves: number;
      }
    }
  }
}

export interface BirthdayResponse {
  success: boolean;
  message: string;
  data?: {
    fullName: string;
    employeeId: string;
    designation: string;
    employeeImage: string;
    personalizedWish: string;
  }[];
}

export interface WorkAnniversaryResponse {
  success: boolean;
  message: string;
  data?: {
    fullName: string;
    employeeId: string;
    designation: string;
    employeeImage: string;
    yearsOfService: number;
    personalizedWish: string;
  }[];
}

export interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

export interface LeaveBalances {
  EL: LeaveBalance;
  SL: LeaveBalance;
  CL: LeaveBalance;
  CompOff: LeaveBalance;
}

export interface LeaveBalanceResponse {
  employeeId: string;
  employeeName: string;
  year: number;
  balances: LeaveBalances;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  totalPending: number;
}

export interface EmployeeInfo {
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
}

const BASE_URL = 'https://cafm.zenapi.co.in/api';

export const getDashboardData = async (
  employeeId: string,
  month: number,
  year: number
): Promise<{
  birthdays: BirthdayResponse;
  anniversaries: WorkAnniversaryResponse;
  leaveBalance: LeaveBalanceResponse;
  attendanceActivities: any[];
  monthlyStats: MonthlyStats;
}> => {
  try {
    const [birthdaysRes, anniversariesRes, leaveBalanceRes, attendanceRes, monthlyStatsRes] = await Promise.all([
      fetch(`${BASE_URL}/kyc/birthdays/today`),
      fetch(`${BASE_URL}/kyc/work-anniversaries/today`),
      fetch(`${BASE_URL}/leave/balance/${employeeId}`),
      fetch(`${BASE_URL}/attendance/${employeeId}/recent-activities`),
      fetch(`${BASE_URL}/attendance/${employeeId}/monthly-stats?month=${month}&year=${year}`)
    ]);

    const [birthdays, anniversaries, leaveBalance, attendanceActivities, monthlyStats] = await Promise.all([
      birthdaysRes.json(),
      anniversariesRes.json(),
      leaveBalanceRes.json(),
      attendanceRes.json(),
      monthlyStatsRes.json()
    ]);

    return {
      birthdays,
      anniversaries,
      leaveBalance,
      attendanceActivities,
      monthlyStats
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export const getMonthlyStats = async (
  employeeId: string,
  month: number,
  year: number
): Promise<MonthlyStats> => {
  try {
    const response = await fetch(
      `${BASE_URL}/attendance/${employeeId}/monthly-stats?month=${month}&year=${year}`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    throw error;
  }
};