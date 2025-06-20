export interface RawAttendanceRecord {
    _id: string;
    employeeId: string;
    projectName: string | null;
    designation: string | null;
    date: string;
    punchInTime: string | null;
    punchOutTime: string | null;
    punchInPhoto: string | null;
    punchOutPhoto: string | null;
    punchInLatitude?: number;
    punchInLongitude?: number;
    punchOutLatitude?: number;
    punchOutLongitude?: number;
    status?: string;
    isLate?: boolean;
    remarks?: string;
    punchInUtc?: string;
    punchOutUtc?: string;
}

export interface TransformedAttendanceRecord {
    _id: string;
    employeeId: string;
    date: string;
    punchInUtc?: string;
    punchOutUtc?: string;
    punchInTime: string | null;
    punchOutTime: string | null;
    projectName: string | null;
    designation: string | null;
    punchInPhoto: string | null;
    punchOutPhoto: string | null;
    status: string;
}

export interface MonthlySummary {
    daysInMonth: number;
    presentDays: number;
    weekoffDays: number;
    leaveBreakdown: {
        SL: number;
        CL: number;
        EL: number;
        CompOff: number;
    };
    halfDays: number;
    lopDays: number;
    totalCount: number;
    discrepancy: boolean;
}

export interface MonthSummaryResponse {
    success: boolean;
    message: string;
    data: {
        employeeId: string;
        month: string;
        year: string;
        attendance?: RawAttendanceRecord[];
        summary: {
            totalDays: number;
            presentDays: number;
            halfDays: number;
            partiallyAbsentDays: number;
            weekOffs: number;
            holidays: number;
            el: number;
            sl: number;
            cl: number;
            compOff: number;
            lop: number;
        }
    }
}