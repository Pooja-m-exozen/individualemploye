export interface LeaveRecord {
  leaveId?: string;
  employeeId: string;
  employeeImage?: string;
  fullName: string;
  designation: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: string;
} 