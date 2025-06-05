import { KYCResponse, KYCRecord, KYCDocument } from '@/types/kyc';
import { api } from './api';
import {  getUserRole, getUserEmail } from './auth';

export interface ComplianceUpdateResponse {
  success: boolean;
  message: string;
  data?: KYCRecord;
}

export interface DocumentVerifyResponse {
  success: boolean;
  message: string;
  data?: KYCDocument;
}



export const getAllKYCRecords = async (): Promise<KYCResponse> => {
  try {
    const userRole = getUserRole();
    const userEmail = getUserEmail();

    console.log('Fetching KYC records for:', { userRole, userEmail });

    const response = await api.get('https://cafm.zenapi.co.in/api/kyc');
    
    // Ensure we have a valid response
    if (!response.data || !response.data.kycForms) {
      throw new Error('Invalid KYC response format');
    }

    const kycData = response.data as KYCResponse;

    if (userRole === 'Employee' && userEmail) {
      // Transform email to match KYC system format if needed
      const kycEmail = userEmail.includes('.dn@') ? userEmail : userEmail.replace('@exozen.in', '.dn@exozen.in');
      console.log('Looking for KYC records with email:', kycEmail);

      // Filter with null checks and proper email comparison
      kycData.kycForms = kycData.kycForms.filter(record => {
        if (!record || !record.personalDetails || !record.personalDetails.email) {
          console.log('Skipping invalid record:', record);
          return false;
        }
        const matches = record.personalDetails.email.toLowerCase() === kycEmail.toLowerCase();
        if (matches) {
          console.log('Found matching KYC record:', record._id);
        }
        return matches;
      });
    }

    if (kycData.kycForms.length === 0) {
      console.log('No KYC records found after filtering');
    }

    return {
      message: kycData.message || 'KYC records retrieved',
      kycForms: kycData.kycForms
    };
  } catch (error) {
    console.error('Error fetching KYC records:', error);
    return {
      message: 'Error fetching KYC records',
      kycForms: []
    };
  }
};

export const getKYCByEmail = async (email: string): Promise<KYCRecord | null> => {
  try {
    if (!email) {
      console.error('Email parameter is required');
      return null;
    }

    // Transform email to match KYC system format if needed
    const kycEmail = email.includes('.dn@') ? email : email.replace('@exozen.in', '.dn@exozen.in');
    console.log('Fetching KYC for email:', kycEmail);

    const response = await api.get('https://cafm.zenapi.co.in/api/kyc');
    
    if (!response.data || !response.data.kycForms) {
      console.error('Invalid API response format');
      return null;
    }

    const kycData = response.data as KYCResponse;
    const kycRecord = kycData.kycForms.find(record => 
      record?.personalDetails?.email?.toLowerCase() === kycEmail.toLowerCase()
    );

    if (!kycRecord) {
      console.log('No KYC record found for email:', kycEmail);
      return null;
    }

    console.log('Found KYC record:', kycRecord._id);
    return kycRecord;
  } catch (error) {
    console.error('Error fetching KYC by email:', error);
    return null;
  }
};

export const updateKYCStatus = async (kycId: string, status: string): Promise<KYCRecord> => {
  try {
    const userRole = getUserRole();
    if (userRole === 'Employee') {
      throw new Error('Unauthorized: Employees cannot update KYC status');
    }

    const response = await api.patch(`/kyc/${kycId}`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating KYC status:', error);
    throw error;
  }
};

export const updateKYCCompliance = async (employeeId: string | null, status: string): Promise<ComplianceUpdateResponse> => {
  const userRole = getUserRole();
  if (userRole === 'Employee') {
    throw new Error('Unauthorized: Employees cannot update compliance status');
  }

  try {
    const response = await api.patch(`/kyc/employees/${employeeId}/compliance`, { status });
    return response.data;
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
    const response = await api.patch(
      `/kyc/employees/${employeeId}/documents/${documentId}/verify`,
      data
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Error verifying document:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to verify document');
  }
};

export const uploadKYCDocuments = async (formData: FormData): Promise<{ success: boolean; message: string; data: KYCDocument[] }> => {
  const userEmail = localStorage.getItem('userEmail');

  if (!userEmail) {
    throw new Error('User email not found');
  }

  try {
    const response = await api.post(`/kyc/employees/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};

export const updateKYCInformation = async (employeeId: string, kycData: Partial<KYCRecord>): Promise<{ message: string; updatedKYC: KYCRecord }> => {
  try {
    const response = await api.put(`https://cafm.zenapi.co.in/api/kyc/${employeeId}`, kycData);
    return response.data;
  } catch (error) {
    console.error('Error updating KYC information:', error);
    throw error;
  }
};

// Create a named export object
export const kycService = {
  getAllKYCRecords,
  getKYCByEmail,
  updateKYCStatus,
  updateKYCCompliance,
  verifyDocument,
  uploadKYCDocuments,
  updateKYCInformation
};

// Export the service as default
export default kycService;