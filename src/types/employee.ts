export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  employeeId: string;
  joiningDate: string;
  status: string;
  kycVerified: boolean;
  address: Address;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeResponse {
  success: boolean;
  data: Employee[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  employeeId: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}