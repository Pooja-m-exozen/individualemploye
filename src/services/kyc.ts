import { KYCResponse } from '@/types/kyc';
import { BASE_URL, getAuthHeaders } from './api';
import { getAuthToken, getUserRole } from './auth';

export interface ComplianceUpdateResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface DocumentVerifyResponse {
  success: boolean;
  message: string;
  data?: any;
}

const EMPLOYEE_ID = "67ecbe7d8c75f122c26617ab";

export const getAllKYCRecords = async (): Promise<KYCResponse> => {
  try {
    const userRole = getUserRole();
    const endpoint = userRole === 'Employee' 
      ? `${BASE_URL}/api/kyc/employees/${EMPLOYEE_ID}`
      : `${BASE_URL}/api/kyc`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch KYC records');
    }

    const data = await response.json();
    
    // Transform employee response to match admin response format
    if (userRole === 'Employee') {
      return {
        success: data.success,
        data: [data.data], // Wrap single record in array
        count: 1 // Single record count
      };
    }

    return data;
  } catch (error) {
    console.error('Error fetching KYC records:', error);
    throw error;
  }
};

export const updateKYCCompliance = async (employeeId: string | null, status: string): Promise<ComplianceUpdateResponse> => {
  const userRole = getUserRole();
  if (userRole === 'Employee') {
    throw new Error('Unauthorized: Employees cannot update compliance status');
  }

  const FIXED_EMPLOYEE_ID = "67ecbe7d8c75f122c26617ab";
  
  try {
    console.log('Updating compliance for employee:', FIXED_EMPLOYEE_ID);
    
    const response = await fetch(`${BASE_URL}/api/kyc/employees/${FIXED_EMPLOYEE_ID}/compliance`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status }),
      credentials: 'include'
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update compliance status');
    }

    return data;
  } catch (error) {
    console.error('Error updating compliance:', error);
    throw new Error('Failed to update compliance status');
  }
};

export const verifyDocument = async (employeeId: string, documentId: string, data: { status: string }): Promise<DocumentVerifyResponse> => {
  const userRole = getUserRole();
  if (userRole === 'Employee') {
    throw new Error('Unauthorized: Employees cannot verify documents');
  }

  try {
    const headers = getAuthHeaders();
    const userRole = getUserRole();
    const targetEmployeeId = userRole === 'Employee' ? EMPLOYEE_ID : employeeId;

    const response = await fetch(
      `${BASE_URL}/api/kyc/employees/${targetEmployeeId}/documents/${documentId}/verify`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to verify document');
    }

    return result;
  } catch (error: any) {
    console.error('Error verifying document:', error);
    throw new Error(error.message || 'Failed to verify document');
  }
};

export const uploadKYCDocuments = async (formData: FormData): Promise<any> => {
  const userRole = getUserRole();
  if (userRole === 'Employee') {
    throw new Error('Unauthorized: Employees cannot upload documents');
  }

  try {
    const token = getAuthToken();
    const userRole = getUserRole();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    };
    
    const endpoint = userRole === 'Employee'
      ? `${BASE_URL}/api/kyc/employees/${EMPLOYEE_ID}/documents`
      : `${BASE_URL}/api/kyc/employees/6805f9b86c3823add8364782/documents`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload documents');
    }

    return data;
  } catch (error) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};

export default {
  getAllKYCRecords,
  updateKYCCompliance,
  verifyDocument,
  uploadKYCDocuments
};