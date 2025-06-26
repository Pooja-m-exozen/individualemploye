import axios from "axios";

export interface EmployeeApi {
  employeeId: string;
  fullName: string;
  projectName: string;
  designation: string;
  employeeImage: string;
  hasPayroll: boolean;
}

export async function fetchEmployees(): Promise<EmployeeApi[]> {
  // Replace with your actual API endpoint for fetching employees
  const response = await axios.get("https://cafm.zenapi.co.in/api/salary-disbursement/employees");
  return response.data.data || [];
}
