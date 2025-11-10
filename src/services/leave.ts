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

// Cache for leave history to prevent excessive API calls
const leaveHistoryCache = new Map<string, { data: LeaveHistoryResponse | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getAllEmployeesLeaveHistory = async (): Promise<EmployeeWithLeaveHistory[]> => {
  const employees = await getAllKYCEmployees();
  const results: EmployeeWithLeaveHistory[] = [];
  
  // Process employees in batches to avoid overwhelming the server
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 100; // 100ms delay between batches
  
  for (let i = 0; i < employees.length; i += BATCH_SIZE) {
    const batch = employees.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (emp) => {
      const employeeId = emp.personalDetails.employeeId;
      if (!employeeId) {
        return { kyc: emp, leaveHistory: null };
      }

      // Check cache first
      const cached = leaveHistoryCache.get(employeeId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return { kyc: emp, leaveHistory: cached.data };
      }

      try {
        const leaveHistory = await getLeaveHistory(employeeId);
        // Cache successful responses
        leaveHistoryCache.set(employeeId, { data: leaveHistory, timestamp: Date.now() });
        return { kyc: emp, leaveHistory };
      } catch (error: unknown) {
        // Silently handle 404s and other errors - don't spam the console
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 404) {
          // Employee has no leave history - cache null to avoid repeated 404s
          leaveHistoryCache.set(employeeId, { data: null, timestamp: Date.now() });
        }
        return { kyc: emp, leaveHistory: null };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to avoid overwhelming the server
    if (i + BATCH_SIZE < employees.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  return results;
};

// Function to clear cache (useful when leave data is updated)
export const clearLeaveHistoryCache = () => {
  leaveHistoryCache.clear();
};
