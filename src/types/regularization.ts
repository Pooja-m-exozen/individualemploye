export interface RegularizationRecord {
  _id: string;
  employeeId: string;
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  status: string;
  remarks?: string;
  isRegularized?: boolean;
  regularizationStatus: string;
  regularizationReason?: string;
  regularizedBy?: string;
  regularizationDate?: string;
  originalStatus?: string;
}
