import { ChartData, ChartOptions } from 'chart.js';

export interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
  pending: number;
}

export type LeaveType = 'EL' | 'SL' | 'CL' | 'CompOff';

export type LeaveBalances = {
  [key in LeaveType]: LeaveBalance;
};

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
    monthlyPresent?: number[];
    monthlyLateArrivals?: number[];
    monthlyEarlyArrivals?: number[];
    monthlyAbsent?: number[];
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

export interface DepartmentStats {
  success: boolean;
  message: string;
  data: {
    departmentId: string;
    departmentName: string;
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    overtimeHours: number;
  }[];
}

export type AnalyticsViewType = 'attendance' | 'leave';
export type ChartType = 'bar' | 'pie';

export interface DashboardState {
  analyticsView: AnalyticsViewType;
  attendanceChartType: ChartType;
  leaveChartType: ChartType;
  currentMonth: number;
  monthlyStats: MonthlyStats | null;
  departmentStats: DepartmentStats | null;
  leaveBalance: LeaveBalanceResponse | null;
}

export interface AttendanceChartData extends ChartData<'bar'> {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderRadius: number;
    maxBarThickness: number;
  }[];
}

export interface LeaveRequestForm {
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  isHalfDay: boolean;
  halfDayType: string | null;
  reason: string;
  emergencyContact: string;
  attachments: File[];
}

export interface RegularizationForm {
  date: string;
  punchInTime: string;
  punchOutTime: string;
  reason: string;
  status: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
  };
}
