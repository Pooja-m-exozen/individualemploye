import { BASE_URL, getAuthHeaders } from './api';

export interface Department {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CreateDepartmentData {
  name: string;
  description: string;
}

interface DepartmentResponse {
  success: boolean;
  data: Department[];
  message?: string;
}

interface SingleDepartmentResponse {
  success: boolean;
  data: Department;
  message?: string;
}

export const getDepartments = async (): Promise<Department[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: DepartmentResponse = await response.json();
    
    if (!result.success) {
      throw new Error('Failed to fetch departments');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
};

export const createDepartment = async (data: CreateDepartmentData): Promise<Department> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SingleDepartmentResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to create department');
    }

    return result.data;
  } catch (error) {
    console.error('Error creating department:', error);
    throw error;
  }
};

export const updateDepartment = async (id: string, data: CreateDepartmentData): Promise<Department> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SingleDepartmentResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to update department');
    }

    return result.data;
  } catch (error) {
    console.error('Error updating department:', error);
    throw error;
  }
};

export const deleteDepartment = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: { success: boolean; message?: string } = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete department');
    }

    return true;
  } catch (error) {
    console.error('Error deleting department:', error);
    throw error;
  }
};
