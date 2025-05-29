import type { 
  BirthdayResponse, 
  WorkAnniversaryResponse, 
  LeaveBalanceResponse, 
  MonthlyStats, 
  DepartmentStats,
  LeaveRequestForm,
  RegularizationForm,
  DocumentUploadResponse
} from '../types/dashboard';

const BASE_URL = 'https://cafm.zenapi.co.in/api';

export const getDashboardData = async (
  employeeId: string,
  month?: number,
  year?: number
): Promise<{
  birthdays: BirthdayResponse;
  anniversaries: WorkAnniversaryResponse;
  leaveBalance: LeaveBalanceResponse;
  attendanceActivities: any[];
  monthlyStats: MonthlyStats;
}> => {
  try {
    const response = await fetch(`/api/dashboard?employeeId=${employeeId}&month=${month}&year=${year}`);
    const data = await response.json();
    return data;
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
    if (!response.ok) {
      throw new Error('Failed to fetch monthly stats');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    throw error;
  }
};

export const submitLeaveRequest = async (employeeId: string, leaveData: LeaveRequestForm) => {
  try {
    const response = await fetch('/api/leave-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employeeId, ...leaveData }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error submitting leave request:', error);
    throw error;
  }
};

export const submitRegularization = async (employeeId: string, regularizationData: RegularizationForm) => {
  try {
    const response = await fetch('/api/regularization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employeeId, ...regularizationData }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error submitting regularization:', error);
    throw error;
  }
};

export const uploadDocument = async (employeeId: string, file: File, type: string, description: string): Promise<DocumentUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('description', description);
    formData.append('employeeId', employeeId);

    const response = await fetch('/api/upload-document', {
      method: 'POST',
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const getDepartmentStats = async (): Promise<DepartmentStats> => {
  try {
    const response = await fetch(`${BASE_URL}/departments/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch department stats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching department stats:', error);
    throw error;
  }
};

export const getLeaveBalance = async (employeeId: string): Promise<LeaveBalanceResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/leave/balance/${employeeId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch leave balance');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    throw error;
  }
};