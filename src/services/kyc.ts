import { KYCResponse } from '@/types/kyc';
import { BASE_URL, getAuthHeaders } from './api';

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

export const getAllKYCRecords = async (): Promise<KYCResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/api/kyc`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch KYC records');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching KYC records:', error);
    throw error;
  }
};

export const updateKYCCompliance = async (employeeId: string | null, status: string): Promise<ComplianceUpdateResponse> => {
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

export const verifyKYCDocument = async (
  employeeId: string,
  documentId: string,
  status: string
): Promise<DocumentVerifyResponse> => {
  try {
    console.log(`Verifying document ${documentId} for employee ${employeeId}`);
    
    const response = await fetch(
      `${BASE_URL}/api/kyc/employees/${employeeId}/documents/${documentId}/verify`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    const data = await response.json();
    console.log('Verification response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify document');
    }

    return data;
  } catch (error) {
    console.error('Error verifying document:', error);
    throw error;
  }
};

export const verifyDocument = async (employeeId: string, documentId: string, data: { status: string }) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/kyc/employees/${employeeId}/documents/${documentId}/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    return await response.json();
  } catch (error) {
    throw new Error('Failed to verify document');
  }
};

export default {
  getAllKYCRecords,
  updateKYCCompliance,
  verifyKYCDocument,
  verifyDocument,
};