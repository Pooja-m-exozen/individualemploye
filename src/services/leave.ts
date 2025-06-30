import { api } from "./api";
import { KYCRecord } from "@/types/kyc";

export interface LeaveHistoryItem {
  leaveId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  isHalfDay: boolean;
  halfDayType: string | null;
  status: string;
  reason: string;
  emergencyContact: string;
  attachments: string[];
  appliedOn: string;
  lastUpdated: string;
}

export interface LeaveHistoryResponse {
  employeeId: string;
  employeeName: string;
  totalLeaves: number;
  leaveBalances: Record<string, number>;
  leaveHistory: LeaveHistoryItem[];
}

export const getAllKYCEmployees = async (): Promise<KYCRecord[]> => {
  const response = await api.get("/kyc");
  if (!response.data || !response.data.kycForms) return [];
  // Only return those with a valid employeeId
  return response.data.kycForms.filter((k: KYCRecord) => k.personalDetails?.employeeId);
};

export const getLeaveHistory = async (employeeId: string): Promise<LeaveHistoryResponse> => {
  const response = await api.get(`/leave/history/${employeeId}`);
  return response.data;
};

export interface EmployeeWithLeaveHistory {
  kyc: KYCRecord;
  leaveHistory: LeaveHistoryResponse | null;
}

export const getAllEmployeesLeaveHistory = async (): Promise<EmployeeWithLeaveHistory[]> => {
  const employees = await getAllKYCEmployees();
  const results: EmployeeWithLeaveHistory[] = [];
  for (const emp of employees) {
    try {
      const leaveHistory = await getLeaveHistory(emp.personalDetails.employeeId);
      results.push({ kyc: emp, leaveHistory });
    } catch {
      results.push({ kyc: emp, leaveHistory: null });
    }
  }
  return results;
};
