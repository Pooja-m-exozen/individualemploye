export interface KYCDocument {
  _id: string;
  documentType?: string;
  type?: string;
  documentNumber: string;
  documentPath: string;
  documentName: string;
  verificationStatus: string;
  verifiedBy?: string;
  uploadedAt: string;
  verificationDate?: string;
  verifiedAt?: string;
  verificationNotes?: string;
}

export interface ComplianceCheck {
  status: string;
  checkedAt: string;
  notes: string;
}

export interface KYCRecord {
  _id: string;
  employeeId: string;
  employee?: string;
  documents: KYCDocument[];
  complianceStatus: string;
  overallStatus?: string;
  complianceCheck?: ComplianceCheck;
  remarks?: string;
  complianceNotes?: string;
  verificationDate?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface KYCResponse {
  success: boolean;
  count: number;
  data: KYCRecord[];
}
