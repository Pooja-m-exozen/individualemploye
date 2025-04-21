import { BASE_URL, getAuthHeaders } from './api';
import { Department } from './departments';

export interface Designation {
  _id: string;
  title: string;
  department: Department;
  description: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface DesignationResponse {
  success: boolean;
  data: Designation[];
}

export interface UpdateDesignationData {
  title: string;
  description: string;
  departmentId: string;
}

export const getDesignations = async (): Promise<Designation[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/designations`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: DesignationResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching designations:', error);
    throw error;
  }
};

export const getDesignationsByDepartment = async (departmentId: string): Promise<Designation[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments/designations?departmentId=${departmentId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: DesignationResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching department designations:', error);
    throw error;
  }
};

export const updateDesignation = async (id: string, data: UpdateDesignationData): Promise<Designation> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments/designations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error updating designation:', error);
    throw error;
  }
};

export const deleteDesignation = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/api/departments/designations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting designation:', error);
    throw error;
  }
};
