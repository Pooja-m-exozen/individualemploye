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

export interface PersonalDetails {
  employeeId: string;
  projectName: string;
  fullName: string;
  fathersName: string;
  mothersName: string;
  gender: string;
  dob: string;
  phoneNumber: string;
  designation: string;
  dateOfJoining: string;
  nationality: string;
  religion: string;
  maritalStatus: string;
  bloodGroup: string;
  uanNumber: string;
  esicNumber: string;
  experience: string;
  educationalQualification: string;
  languages: string[];
  employeeImage: string;
  email: string;
  workType: string;
}

export interface Address {
  state: string;
  city: string;
  street: string;
  postalCode: string;
}

export interface AddressDetails {
  permanentAddress: Address;
  currentAddress: Address;
}

export interface BankDetails {
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface IdentificationDetails {
  identificationType: string;
  identificationNumber: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  aadhar: string;
}

export interface KYCRecord {
  documents: KYCDocument[];
  _id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  personalDetails: PersonalDetails;
  addressDetails: AddressDetails;
  bankDetails: BankDetails;
  identificationDetails: IdentificationDetails;
  emergencyContact: EmergencyContact;
  __v: number;
}

export interface KYCResponse {
  message: string;
  kycForms: KYCRecord[];
}
