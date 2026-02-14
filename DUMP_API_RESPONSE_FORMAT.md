# Dump Attendance API Response Format

## API Endpoint

**GET** `/api/attendance/dump`

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectName` | string | Yes | Name of the project |
| `month` | number | Yes | Month (1-12) |
| `year` | number | Yes | Year (e.g., 2025) |

### Example Request

```
GET /api/attendance/dump?projectName=Exozen-Ops&month=1&year=2025
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Dump attendance data retrieved successfully",
  "data": {
    "projectName": "Exozen-Ops",
    "month": 1,
    "year": 2025,
    "employees": [
      {
        "employeeId": "EMP001",
        "name": "John Doe",
        "photo": "https://example.com/photos/emp001.jpg",
        "dateOfJoining": "2024-01-15",
        "attendance": {
          "2025-01-01": "P",
          "2025-01-02": "P",
          "2025-01-03": "A",
          "2025-01-04": "P",
          "2025-01-05": "",
          "2025-01-06": "P",
          "2025-01-07": "P",
          "2025-01-08": "A",
          "2025-01-09": "P",
          "2025-01-10": "P"
          // ... all dates in the month
        },
        "otWeekoff": {
          "2025-01-01": "2.30",
          "2025-01-02": "1.15",
          "2025-01-03": "W/O",
          "2025-01-04": "",
          "2025-01-05": "",
          "2025-01-06": "3.00",
          "2025-01-07": "",
          "2025-01-08": "LOP",
          "2025-01-09": "",
          "2025-01-10": ""
          // ... all dates in the month
        }
      },
      {
        "employeeId": "EMP002",
        "name": "Jane Smith",
        "photo": "https://example.com/photos/emp002.jpg",
        "dateOfJoining": "2024-03-20",
        "attendance": {
          "2025-01-01": "P",
          "2025-01-02": "P",
          "2025-01-03": "P",
          // ... all dates in the month
        },
        "otWeekoff": {
          "2025-01-01": "",
          "2025-01-02": "1.45",
          "2025-01-03": "",
          // ... all dates in the month
        }
      }
      // ... all employees in the project
    ]
  }
}
```

### Error Response (400/404/500)

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error description"
}
```

## Data Structure Details

### Employee Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string | Yes | Unique employee identifier |
| `name` | string | Yes | Full name of the employee |
| `photo` | string | No | URL to employee photo (optional) |
| `dateOfJoining` | string | No | Date of joining in YYYY-MM-DD format (optional) |
| `attendance` | object | Yes | Object with dates as keys and attendance status as values |
| `otWeekoff` | object | Yes | Object with dates as keys and OT/W/O/LOP as values |

### Attendance Object

- **Key**: Date string in `YYYY-MM-DD` format (e.g., "2025-01-15")
- **Value**: One of:
  - `"P"` - Present
  - `"A"` - Absent
  - `""` - Empty/Not marked

**Note**: Should include ALL dates in the requested month (1-31, depending on the month).

### OT/Weekoff Object

- **Key**: Date string in `YYYY-MM-DD` format (e.g., "2025-01-15")
- **Value**: One of:
  - `"W/O"` - Week Off
  - `"LOP"` - Loss of Pay
  - `"1.15"` - OT hours in H.MM format (1 hour 15 minutes)
  - `"2.30"` - OT hours in H.MM format (2 hours 30 minutes)
  - `"3"` - OT hours (just hours, no minutes)
  - `""` - Empty/No OT or Weekoff

**Note**: 
- OT hours should be in `H.MM` format (e.g., "1.15" for 1 hour 15 minutes, "2.30" for 2 hours 30 minutes)
- Should include ALL dates in the requested month

### Frontend Display Behavior

**Important**: The frontend displays attendance values with special handling:

- **When `attendance = "A"` and `otWeekoff = "W/O"`**: 
  - The attendance cell displays as **"H"** (Holiday/Week Off) with purple styling
  - The stored value remains `"A"` in the attendance object
  - This is a visual representation only - the backend should still send `"A"` in the attendance field

- **When `attendance = "A"` and `otWeekoff = "LOP"`**: 
  - The attendance cell displays as **"A"** (Absent) with red styling
  - This represents Loss of Pay

- **When `attendance = "P"`**: 
  - The attendance cell displays as **"P"** (Present) with green styling
  - OT hours can be entered in the otWeekoff field

**Display Summary**:
- `"P"` → Green background (Present)
- `"A"` + `"W/O"` → Purple background, displays as **"H"** (Holiday/Week Off)
- `"A"` + `"LOP"` → Red background, displays as **"A"** (Absent - Loss of Pay)
- `"A"` only → Red background, displays as **"A"** (Absent)

## Important Notes

1. **Date Range**: The response must include attendance data for ALL dates in the requested month (1st to last day of the month).

2. **Date Format**: All dates must be in `YYYY-MM-DD` format (ISO 8601).

3. **Empty Values**: 
   - If attendance is not marked for a date, use empty string `""`
   - If OT/Weekoff is not applicable, use empty string `""`

4. **Date of Joining**: 
   - If an employee joined after the start of the month, dates before joining should still be included but with empty values
   - The frontend will handle filtering based on `dateOfJoining`

5. **OT Hours Format**: 
   - Use `H.MM` format where MM is always 2 digits (e.g., "1.05", "2.30", "10.45")
   - For whole hours only, use just the number (e.g., "3" for 3 hours)

6. **Project Filtering**: Only return employees who belong to the specified project.

## Example Response (Minimal)

```json
{
  "success": true,
  "message": "Dump attendance data retrieved successfully",
  "data": {
    "projectName": "Exozen-Ops",
    "month": 1,
    "year": 2025,
    "employees": [
      {
        "employeeId": "EMP001",
        "name": "John Doe",
        "photo": null,
        "dateOfJoining": "2024-01-15",
        "attendance": {
          "2025-01-01": "P",
          "2025-01-02": "P",
          "2025-01-03": "A"
        },
        "otWeekoff": {
          "2025-01-01": "2.30",
          "2025-01-02": "",
          "2025-01-03": "W/O"
        }
      }
    ]
  }
}
```

## Frontend Integration

The frontend expects the response to match the `ManualAttendanceEntry[]` interface:

```typescript
interface ManualAttendanceEntry {
  employeeId: string;
  name: string;
  photo?: string;
  dateOfJoining?: string;
  attendance: { [date: string]: 'P' | 'A' | '' };
  otWeekoff: { [date: string]: string };
}
```

The frontend will:
1. Receive the response from the API
2. Map it to `dumpManualAttendance` state
3. Display it in the table format with special handling:
   - When `attendance = "A"` and `otWeekoff = "W/O"`, displays as **"H"** (Holiday/Week Off) with purple styling
   - When `attendance = "A"` and `otWeekoff = "LOP"`, displays as **"A"** (Absent) with red styling
   - When `attendance = "P"`, displays as **"P"** (Present) with green styling
4. Allow editing and saving back to the backend using PUT method

## Save/Update Endpoint

**PUT** `/api/attendance/dump/update`

### Request Body

```json
{
  "projectName": "Exozen-Ops",
  "month": 1,
  "year": 2025,
  "employees": [
    {
      "employeeId": "EMP001",
      "attendance": {
        "2025-01-01": "P",
        "2025-01-02": "A",
        "2025-01-03": "A"
      },
      "otWeekoff": {
        "2025-01-01": "2.30",
        "2025-01-02": "W/O",
        "2025-01-03": "LOP"
      }
    }
  ]
}
```

### Request Body Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectName` | string | Yes | Name of the project |
| `month` | number | Yes | Month (1-12) |
| `year` | number | Yes | Year (e.g., 2025) |
| `employees` | array | Yes | Array of employee attendance data |

### Employee Object in Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string | Yes | Unique employee identifier |
| `attendance` | object | Yes | Object with dates as keys and attendance status ("P", "A", or "") as values |
| `otWeekoff` | object | Yes | Object with dates as keys and OT/W/O/LOP values |

**Important Notes**:
- Only include dates that have attendance or otWeekoff data (non-empty values)
- When `attendance = "A"` and `otWeekoff = "W/O"`, send both fields - the frontend will display it as "H"
- When `attendance = "A"` and `otWeekoff = "LOP"`, send both fields - the frontend will display it as "A" (red)
- OT hours should be in `H.MM` format (e.g., "1.15", "2.30")

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Dump attendance data updated successfully",
  "data": {
    "updated": 15,
    "created": 5,
    "totalProcessed": 20,
    "errors": 0,
    "summary": {
      "updatedRecords": [...],
      "createdRecords": [...],
      "errors": [...]
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the operation was successful |
| `message` | string | Success or error message |
| `data.updated` | number | Number of records updated |
| `data.created` | number | Number of records created |
| `data.totalProcessed` | number | Total number of records processed |
| `data.errors` | number | Number of errors encountered |
| `data.summary.updatedRecords` | array | Details of updated records |
| `data.summary.createdRecords` | array | Details of created records |
| `data.summary.errors` | array | Details of any errors |

### Error Response (400/404/500)

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error description"
}
```

