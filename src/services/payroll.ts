// Payroll API integration for creating payroll records
import axios from "axios";

export interface CreatePayrollPayload {
  employeeId: string;
  month: string; // format: YYYY-MM
  year: string;
  amount: number;
  payableDays: number;
  status: string;
  projectId?: string;
  basicSalary?: number;
  hrAllowance?: number;
  conveyanceAllowance?: number;
  specialAllowance?: number;
  otherAllowance?: number;
  washingAllowance?: number;
  pf?: number;
  esi?: number;
  pt?: number;
  medicalInsurance?: number;
  uniformDeduction?: number;
  roomRent?: number;
  totalEarnings?: number;
  totalDeductions?: number;
  netPay?: number;
}

export interface PayrollResponse {
  message: string;
  data: {
    employeeId: string;
    employeeName: string;
    project: string;
    designation: string;
    month: string;
    year: string;
    amount: number;
    payableDays: number;
    status: string;
    _id: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}

export async function createPayroll(payload: CreatePayrollPayload): Promise<PayrollResponse> {
  const response = await axios.post("https://cafm.zenapi.co.in/api/salary-disbursement/payrolls", payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
}
