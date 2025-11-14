"use client";
import React, { useState, useMemo, useRef, ChangeEvent, FormEvent, useEffect, useCallback } from "react";
import { FaProjectDiagram, FaDownload, FaEye, FaSearch, FaFilePdf,FaFilter } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from 'next/image';

// Toast notification
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-lg font-bold">&times;</button>
    </div>
  );
}

// Helper function to get logo as base64
const getBase64FromUrl = async (url: string, retries = 3): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying image fetch, ${retries} attempts remaining`);
      return getBase64FromUrl(url, retries - 1);
    }
    throw error;
  }
};

// Helper function to add logo to PDF
const addLogoToPDF = async (doc: { addImage: (img: string, format: string, x: number, y: number, w: number, h: number) => void; setFontSize: (size: number) => void; setTextColor: (r: number, g: number, b: number) => void; text: (text: string, x: number, y: number) => void }, x: number, y: number, width: number, height: number): Promise<void> => {
  try {
    const logoBase64 = await getBase64FromUrl("/v1/employee/exozen_logo1.png");
    doc.addImage(logoBase64, 'PNG', x, y, width, height);
  } catch {
    console.warn('Failed to load primary logo, trying fallback logo');
    try {
      const fallbackLogoBase64 = await getBase64FromUrl('/exozen_logo.png');
      doc.addImage(fallbackLogoBase64, 'PNG', x, y, width, height);
    } catch (fallbackError) {
      console.error('Failed to load both logos:', fallbackError);
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('EXOZEN', x, y + height / 2);
    }
  }
};

interface Project {
  _id?: string;
  projectName: string;
  address: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
  updatedDate: string;
}

interface DesignationCount {
  designation: string;
  count: string;
}

// Attendance interfaces
interface AttendanceEmployee {
  employeeId: string;
  fullName: string;
  designation: string;
  projectName: string;
  imageUrl: string;
}

interface AttendanceRecord {
  date: string;
  status: string;
  punchInTime?: string;
  punchOutTime?: string;
}

interface LeaveRecord {
  leaveId?: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function ProjectManagementPage() {
  const { theme } = useTheme();
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    projectName: string;
    address: string;
    totalManpower: string;
    designationWiseCount: DesignationCount[];
  }>({
    projectName: "",
    address: "",
    totalManpower: "",
    designationWiseCount: [{ designation: "", count: "" }],
  });
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [projectDistribution, setProjectDistribution] = useState<Array<{_id: string; count: number; totalManpower: number; shortageManpower: number}>>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'attendance'>('projects');
  
  // Attendance state
  const [attendanceEmployees, setAttendanceEmployees] = useState<AttendanceEmployee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord[]>>({});
  const [leaveData, setLeaveData] = useState<Record<string, LeaveRecord[]>>({});
  const [monthlySummaryData, setMonthlySummaryData] = useState<Record<string, { 
    holidays: number; 
    weekOffs: number; 
    weekOffsWorked?: number;
    halfDays?: number;
    presentDays?: number;
    el?: number;
    sl?: number;
    cl?: number;
    compOff?: number;
    totalDays?: number;
    lop?: number;
    partiallyAbsentDays?: number;
    regularizedPresentDays?: number;
  }>>({});
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState<string>("");
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [showAttendanceDownloadDropdown, setShowAttendanceDownloadDropdown] = useState(false);
  const [selectedAttendanceEmployeeIds, setSelectedAttendanceEmployeeIds] = useState<string[]>([]);

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idx: number | null = null
  ) => {
    const { name, value } = e.target;
    if (idx !== null) {
      const field = name.split("-")[0] as keyof DesignationCount;
      setForm((prev) => {
        const updated = [...prev.designationWiseCount];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, designationWiseCount: updated };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addDesignationField = () => {
    setForm((prev) => ({
      ...prev,
      designationWiseCount: [...prev.designationWiseCount, { designation: "", count: "" }],
    }));
  };

  const removeDesignationField = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      designationWiseCount: prev.designationWiseCount.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const designationObj: Record<string, number> = {};
    form.designationWiseCount.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10);
      }
    });
    const payload = {
      projectName: form.projectName,
      address: form.address,
      totalManpower: parseInt(form.totalManpower, 10),
      designationWiseCount: designationObj,
    };
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      setShowModal(false);
      setForm({
        projectName: "",
        address: "",
        totalManpower: "",
        designationWiseCount: [{ designation: "", count: "" }],
      });
      setToast(data.message || "Project created successfully");
      await fetchProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setToast(message);
    }
  };

  // Fetch projects from API
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/project/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchProjectDistribution();
  }, []);

  // Attendance useEffect hooks
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceEmployees();
    }
  }, [activeTab]);

  // Government holidays - memoized to prevent recreation on every render
  const GOVERNMENT_HOLIDAYS = useMemo(() => [
    { date: '2025-01-14', description: 'Makar Sankranti' },
    { date: '2025-01-26', description: 'Republic Day' },
    { date: '2025-02-26', description: 'Maha Shivratri' },
    { date: '2025-03-30', description: 'Ugadi' },
    { date: '2025-03-31', description: 'Eid al Fitr' },
    { date: '2025-04-10', description: 'Mahavira Janma Kalyanaka' },
    { date: '2025-04-14', description: 'Ambedkar Jayanti' },
    { date: '2025-05-01', description: 'Labour Day' },
    { date: '2025-08-08', description: 'Varamahalakshmi' },
    { date: '2025-08-15', description: 'Independence Day' },
    { date: '2025-08-27', description: 'Ganesh Chaturthi' },
    { date: '2025-10-01', description: 'Vijayadashami' },
    { date: '2025-10-02', description: 'Gandhi Jayanti' },
    { date: '2025-10-20', description: 'Deepavali' },
    { date: '2025-10-22', description: 'Deepavali' },
  ], []);

  const isSecondOrFourthSaturday = (date: Date): boolean => {
    if (date.getDay() !== 6) return false;
    const saturday = Math.floor((date.getDate() - 1) / 7) + 1;
    return saturday === 2 || saturday === 4;
  };

  const isHoliday = useCallback((date: Date, projectName?: string): boolean => {
    const day = date.getDay();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (projectName === "Exozen - Ops") {
      if (day === 0) return true;
      return GOVERNMENT_HOLIDAYS.some(holiday => holiday.date === dateString);
    }
    
    if (day === 0) return true;
    if (isSecondOrFourthSaturday(date)) return true;
    return GOVERNMENT_HOLIDAYS.some(holiday => holiday.date === dateString);
  }, [GOVERNMENT_HOLIDAYS]);

  const getAttendanceStatus = useCallback((date: Date, leaves: LeaveRecord[], projectName?: string, status?: string, punchInTime?: string, punchOutTime?: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > today) {
      return '';
    }

    const onLeave = leaves.find(leave => {
      const startDate = new Date(leave.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(leave.endDate);
      endDate.setHours(0, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate && leave.status === 'Approved';
    });

    if (onLeave) {
      const leaveType = (onLeave.leaveType || '').toLowerCase().replace(/\s+/g, '');
      if (leaveType === 'compoff' || leaveType === 'cfl' || leaveType === 'compoffleave') return 'CFL';
      return onLeave.leaveType;
    }

    if (projectName === "Exozen - Ops" && date.getDay() === 0) {
      if (punchInTime && punchOutTime) return 'CF';
      return 'H';
    }

    if (isHoliday(date, projectName)) {
      if (punchInTime && punchOutTime) return 'CF';
      return 'H';
    }

    const isToday = checkDate.getTime() === today.getTime();
    return (status === 'Present' && punchInTime && (punchOutTime || isToday)) ? 'P' : 'A';
  }, [isHoliday]);

  const fetchAttendanceData = useCallback(async () => {
    if (attendanceEmployees.length === 0) return;
    setAttendanceLoading(true);
    try {
      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/all`);
      const data = await response.json();
      
      const attendanceMap: Record<string, AttendanceRecord[]> = {};
      const summaryMap: Record<string, { 
        holidays: number; 
        weekOffs: number; 
        weekOffsWorked?: number;
        halfDays?: number;
        presentDays?: number;
        el?: number;
        sl?: number;
        cl?: number;
        compOff?: number;
        totalDays?: number;
        lop?: number;
        partiallyAbsentDays?: number;
      }> = {};
      
      // Fetch monthly summary for all employees in parallel
      const summaryPromises = attendanceEmployees.map(async (employee) => {
        try {
          const monthStr = String(attendanceMonth).padStart(2, '0');
          const summaryResponse = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employee.employeeId}/monthly-summary?month=${monthStr}&year=${attendanceYear}`);
          const summaryData = await summaryResponse.json();
          if (summaryData.success && summaryData.data?.summary) {
            const summary = summaryData.data.summary;
            return {
              employeeId: employee.employeeId,
              holidays: summary.holidays || 0,
              weekOffs: summary.weekOffs || 0,
              weekOffsWorked: summary.weekOffsWorked || 0,
              halfDays: summary.halfDays || 0,
              presentDays: summary.presentDays || 0,
              el: summary.el || 0,
              sl: summary.sl || 0,
              cl: summary.cl || 0,
              compOff: summary.compOff || 0,
              totalDays: summary.totalDays || 0,
              lop: summary.lop || 0,
              partiallyAbsentDays: summary.partiallyAbsentDays || 0
            };
          }
        } catch (error) {
          console.error(`Error fetching monthly summary for ${employee.employeeId}:`, error);
        }
        return {
          employeeId: employee.employeeId,
          holidays: 0,
          weekOffs: 0,
          weekOffsWorked: 0,
          halfDays: 0,
          presentDays: 0,
          el: 0,
          sl: 0,
          cl: 0,
          compOff: 0,
          totalDays: 0,
          lop: 0,
          partiallyAbsentDays: 0
        };
      });
      
      const summaryResults = await Promise.all(summaryPromises);
      summaryResults.forEach(result => {
        summaryMap[result.employeeId] = {
          holidays: result.holidays,
          weekOffs: result.weekOffs,
          weekOffsWorked: result.weekOffsWorked,
          halfDays: result.halfDays,
          presentDays: result.presentDays,
          el: result.el,
          sl: result.sl,
          cl: result.cl,
          compOff: result.compOff,
          totalDays: result.totalDays,
          lop: result.lop,
          partiallyAbsentDays: result.partiallyAbsentDays
        };
      });
      
      attendanceEmployees.forEach((employee) => {
        const employeeAttendance = data.attendance.filter((record: { employeeId: string }) => 
          record.employeeId === employee.employeeId
        );
        const employeeLeaves = leaveData[employee.employeeId] || [];

        const daysInMonth = new Date(attendanceYear, attendanceMonth, 0).getDate();
        const monthAttendance: AttendanceRecord[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(attendanceYear, attendanceMonth - 1, day);
          const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          
          const dayRecord = employeeAttendance.find((record: { date: string }) => {
            const recordDate = new Date(record.date);
            return recordDate.getFullYear() === currentDate.getFullYear() &&
                   recordDate.getMonth() === currentDate.getMonth() &&
                   recordDate.getDate() === currentDate.getDate();
          });
          
          monthAttendance.push({
            date: dateString,
            status: getAttendanceStatus(currentDate, employeeLeaves, employee.projectName, dayRecord?.status, dayRecord?.punchInTime, dayRecord?.punchOutTime),
            punchInTime: dayRecord?.punchInTime,
            punchOutTime: dayRecord?.punchOutTime
          });
        }

        attendanceMap[employee.employeeId] = monthAttendance;
      });

      setAttendanceData(attendanceMap);
      setMonthlySummaryData(summaryMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceEmployees, attendanceMonth, attendanceYear, leaveData, getAttendanceStatus]);

  useEffect(() => {
    if (activeTab === 'attendance' && attendanceEmployees.length > 0) {
      fetchAttendanceData();
    }
  }, [attendanceEmployees, attendanceMonth, attendanceYear, activeTab, fetchAttendanceData]);

  // Fetch project distribution data - matching coordinator dashboard logic
  const fetchProjectDistribution = async () => {
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/dashboard/project-distribution");
      const data = await res.json() as { distribution: Array<{ _id: string; count: number }> };
      
      if (data.distribution && Array.isArray(data.distribution)) {
        console.log('Project Distribution API Data:', data.distribution.slice(0, 5)); // Log first 5 entries
        
        // Map the API response to our format and add totalManpower from projects API
        const distribution = data.distribution.map((item: { _id: string; count: number }) => ({
          _id: item._id,
          count: item.count,
          totalManpower: 0, // Will be populated from projects API
          shortageManpower: 0 // Will be calculated after getting manpower data
        }));
        
        // Fetch projects data to get manpower information
        try {
          const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
          const projectsData = await projectsRes.json() as Array<{ projectName?: string; totalManpower?: number; manpower?: number; total_manpower?: number }>;
          
          if (Array.isArray(projectsData)) {
            // Create a map of project names to total manpower
            const manpowerMap: { [key: string]: number } = {};
            
            projectsData.forEach((project: { projectName?: string; totalManpower?: number; manpower?: number; total_manpower?: number }) => {
              const projectName = project.projectName || 'Unknown Project';
              const manpower = project.totalManpower || project.manpower || project.total_manpower || 0;
              
              if (!manpowerMap[projectName]) {
                manpowerMap[projectName] = 0;
              }
              manpowerMap[projectName] += Number(manpower) || 0;
            });
            
            // Update distribution with manpower data and calculate shortage
            const updatedDistribution = distribution.map((item: { _id: string; count: number; totalManpower: number; shortageManpower: number }) => ({
              ...item,
              totalManpower: manpowerMap[item._id] || 0,
              shortageManpower: (manpowerMap[item._id] || 0) - item.count
            })).sort((a, b) => b.totalManpower - a.totalManpower); // Sort by manpower descending
            
            console.log('Final Distribution with Manpower:', updatedDistribution.slice(0, 5));
            setProjectDistribution(updatedDistribution);
          }
        } catch (projectsError) {
          console.error('Error fetching projects data:', projectsError);
          // Use distribution without manpower data
          setProjectDistribution(distribution);
        }
      }
    } catch (error) {
      console.error('Error fetching project distribution:', error);
      setProjectDistribution([]);
    }
  };


  // Attendance functions
  const fetchAttendanceEmployees = async () => {
    setAttendanceLoading(true);
    try {
      const kycResponse = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const kycData = await kycResponse.json();

      if (kycData.kycForms) {
        const filteredEmployees: AttendanceEmployee[] = kycData.kycForms.map((form: { personalDetails: { employeeId: string; fullName: string; designation: string; projectName: string; employeeImage?: string } }) => ({
          employeeId: form.personalDetails.employeeId,
          fullName: form.personalDetails.fullName,
          designation: form.personalDetails.designation,
          projectName: form.personalDetails.projectName,
          imageUrl: form.personalDetails.employeeImage || "/default-avatar.png",
        }));
        setAttendanceEmployees(filteredEmployees);

        // Fetch leave data for all employees
        const leavePromises = filteredEmployees.map(emp =>
          fetch(`https://cafm.zenapi.co.in/api/leave/history/${emp.employeeId}`)
            .then(res => res.json())
            .then((data: { leaveHistory?: LeaveRecord[] }) => ({
              employeeId: emp.employeeId,
              leaves: data.leaveHistory || []
            }))
        );
        
        const allLeaves = await Promise.all(leavePromises);
        const leaveMap: Record<string, LeaveRecord[]> = {};
        allLeaves.forEach(empLeaves => {
          leaveMap[empLeaves.employeeId] = empLeaves.leaves;
        });
        setLeaveData(leaveMap);
      }
    } catch (error) {
      console.error("Error fetching attendance employees:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Update designation options based on fetched projects
  const designationOptions = useMemo(() => [
    "All Designations",
    ...Array.from(
      new Set(
        projects.flatMap((p) => Object.keys(p.designationWiseCount || {}))
      )
    ),
  ], [projects]);

  // Project options for dropdown
  const projectOptions = useMemo(() => [
    "All Projects",
    ...Array.from(new Set(projects.map((p) => p.projectName)))
  ], [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesDesignation =
        designationFilter === "All Designations" ||
        Object.keys(project.designationWiseCount || {}).includes(designationFilter);
      const matchesProject =
        projectFilter === "All Projects" ||
        project.projectName === projectFilter;
      const matchesSearch = 
        search === "" ||
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        project.address.toLowerCase().includes(search.toLowerCase());
      return matchesDesignation && matchesProject && matchesSearch;
    });
  }, [designationFilter, projectFilter, projects, search]);

  // Sort projects by name
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [filteredProjects]);

  // Attendance filtering logic
  const filteredAttendanceEmployees = useMemo(() => {
    return attendanceEmployees.filter(emp => {
      const matchesProject = selectedProjects.length > 0 ? selectedProjects.includes(emp.projectName) : true;
      const matchesDesignation = selectedDesignation ? emp.designation === selectedDesignation : true;
      const matchesSearch = attendanceSearchQuery
        ? emp.fullName.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
          emp.employeeId.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
        : true;
      return matchesProject && matchesDesignation && matchesSearch;
    });
  }, [attendanceEmployees, selectedProjects, selectedDesignation, attendanceSearchQuery]);

  // Select/Deselect all attendance employees
  const handleSelectAllAttendance = (checked: boolean) => {
    if (checked) {
      setSelectedAttendanceEmployeeIds(filteredAttendanceEmployees.map(emp => emp.employeeId));
    } else {
      setSelectedAttendanceEmployeeIds([]);
    }
  };

  const handleAttendanceEmployeeSelect = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedAttendanceEmployeeIds(prev => [...prev, employeeId]);
    } else {
      setSelectedAttendanceEmployeeIds(prev => prev.filter(id => id !== employeeId));
    }
  };

  const allAttendanceSelected = filteredAttendanceEmployees.length > 0 && selectedAttendanceEmployeeIds.length === filteredAttendanceEmployees.length;
  const someAttendanceSelected = selectedAttendanceEmployeeIds.length > 0 && selectedAttendanceEmployeeIds.length < filteredAttendanceEmployees.length;

  // Extract unique project names and designations for attendance
  const attendanceProjectNames = Array.from(new Set(attendanceEmployees.map(e => e.projectName).filter(Boolean)));
  const attendanceDesignations = Array.from(new Set(attendanceEmployees.map(e => e.designation).filter(Boolean)));

  // Get active count for a project
  const getActiveCount = (projectName: string) => {
    const distribution = projectDistribution.find(item => item._id === projectName);
    return distribution ? distribution.count : 0;
  };

  // Get shortage manpower for a project
  const getShortageManpower = (projectName: string) => {
    const distribution = projectDistribution.find(item => item._id === projectName);
    return distribution ? distribution.shortageManpower : 0;
  };

  // Delete handler
  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    try {
      const res = await fetch(`https://cafm.zenapi.co.in/api/project/projects/${encodeURIComponent(deleteProject.projectName)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      const data = await res.json();
      setProjects((prev) => prev.filter((p) => p._id !== deleteProject._id));
      setToast(data.message || "Project deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete project";
      setToast(message);
    } finally {
      setDeleteProject(null);
    }
  };

  // Export to Excel
  const handleExportToExcel = async () => {
    try {
      const worksheet = sortedProjects.map(project => ({
        'Project Name': project.projectName,
        'Address': project.address,
        'Active Count': getActiveCount(project.projectName),
        'Total Manpower': project.totalManpower,
        'Shortage Manpower': getShortageManpower(project.projectName),
        'Designation-wise Count': Object.entries(project.designationWiseCount || {})
          .map(([designation, count]) => `${designation}: ${count}`)
          .join(", "),
        'Last Updated': new Date(project.updatedDate).toLocaleDateString()
      }));

      const workbook = {
        SheetNames: ['Projects'],
        Sheets: {
          'Projects': {
            '!ref': `A1:G${worksheet.length + 1}`,
            A1: { v: 'Project Name' },
            B1: { v: 'Address' },
            C1: { v: 'Active Count' },
            D1: { v: 'Total Manpower' },
            E1: { v: 'Shortage Manpower' },
            F1: { v: 'Designation-wise Count' },
            G1: { v: 'Last Updated' },
            ...worksheet.reduce<Record<string, { v: string }>>((acc, row, idx) => {
              const rowNum = idx + 2;
              acc[`A${rowNum}`] = { v: row['Project Name'] != null ? row['Project Name'].toString() : '' };
              acc[`B${rowNum}`] = { v: row['Address'] != null ? row['Address'].toString() : '' };
              acc[`C${rowNum}`] = { v: row['Active Count'] != null ? row['Active Count'].toString() : '' };
              acc[`D${rowNum}`] = { v: row['Total Manpower'] != null ? row['Total Manpower'].toString() : '' };
              acc[`E${rowNum}`] = { v: row['Shortage Manpower'] != null ? row['Shortage Manpower'].toString() : '' };
              acc[`F${rowNum}`] = { v: row['Designation-wise Count'] != null ? row['Designation-wise Count'].toString() : '' };
              acc[`G${rowNum}`] = { v: row['Last Updated'] != null ? row['Last Updated'].toString() : '' };
              return acc;
            }, {})
          }
        }
      };

      const xlsx = await import('xlsx');
      const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-report.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      setToast('Project report exported to Excel successfully!');
    } catch {
      setToast('Failed to export to Excel');
    }
  };

  // Export to PDF
  const handleExportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Project Report', 14, 22);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
      
      // Prepare table data
      const tableData = sortedProjects.map(project => [
        project.projectName,
        project.address,
        getActiveCount(project.projectName).toString(),
        project.totalManpower.toString(),
        getShortageManpower(project.projectName).toString(),
        Object.entries(project.designationWiseCount || {})
          .map(([designation, count]) => `${designation}: ${count}`)
          .join(", "),
        new Date(project.updatedDate).toLocaleDateString()
      ]);
      
      autoTable.default(doc, {
        head: [['Project Name', 'Address', 'Active Count', 'Total Manpower', 'Shortage Manpower', 'Designation-wise Count', 'Last Updated']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      doc.save('project-report.pdf');
      setToast('Project report exported to PDF successfully!');
    } catch {
      setToast('Failed to export to PDF');
    }
  };

  // Export Attendance to Excel
  const handleExportAttendanceToExcel = async () => {
    try {
      // Only include selected employees (require at least one selection)
      if (selectedAttendanceEmployeeIds.length === 0) {
        alert('Please select at least one employee to download.');
        return;
      }
      const employeesToDownload = filteredAttendanceEmployees.filter(e => selectedAttendanceEmployeeIds.includes(e.employeeId));
      
      const xlsx = await import('xlsx');
      
      const worksheetData = employeesToDownload.map(employee => {
        const empAttendance = attendanceData[employee.employeeId] || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getCount = (status: string) => {
          return empAttendance.filter(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return a.status === status && d <= today;
          }).length;
        };

        const monthlySummary = monthlySummaryData[employee.employeeId];
        const hasMonthlySummary = monthlySummary !== undefined;
        
        let payableDays: number;
        if (hasMonthlySummary && monthlySummary.totalDays && monthlySummary.totalDays > 0) {
          const totalPayableDays = (monthlySummary.presentDays ?? 0) + 
                                (monthlySummary.halfDays ?? 0) + 
                                (monthlySummary.weekOffs ?? 0) +
                                (monthlySummary.holidays ?? 0) + 
                                (monthlySummary.el ?? 0) + 
                                (monthlySummary.cl ?? 0) +
                                (monthlySummary.sl ?? 0) + 
                                (monthlySummary.compOff ?? 0) +
                                (monthlySummary.weekOffsWorked ?? 0);
          payableDays = Math.min(totalPayableDays, monthlySummary.totalDays);
        } else {
          payableDays = getCount('P') + getCount('H') + getCount('CF') + getCount('CFL') + getCount('EL') + getCount('SL') + getCount('CL');
        }

        const row: Record<string, string | number> = {
          'Employee Name': employee.fullName,
          'Employee ID': employee.employeeId,
          'Project': employee.projectName,
          'Present': getCount('P'),
          'Absent': getCount('A'),
          'Holidays': monthlySummary?.holidays || 0,
          'CF': getCount('CF'),
          'CFL': getCount('CFL'),
          'EL': getCount('EL'),
          'SL': getCount('SL'),
          'CL': getCount('CL'),
          'Payable Days': payableDays % 1 === 0 ? payableDays : payableDays.toFixed(1)
        };

        // Add date columns for the month
        const daysInMonth = new Date(attendanceYear, attendanceMonth, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dateObj = new Date(attendanceYear, attendanceMonth - 1, day);
          const date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          const record = empAttendance.find(r => r.date === date);
          row[`${day}`] = record?.status || '-';
        }

        return row;
      });

      const worksheet = xlsx.utils.json_to_sheet(worksheetData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Attendance");
      xlsx.writeFile(workbook, `Attendance_Report_${attendanceMonth}_${attendanceYear}.xlsx`);
      
      setToast('Attendance report exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setToast('Failed to export to Excel');
    }
  };

  // Export Attendance to PDF
  const handleExportAttendanceToPDF = async () => {
    try {
      // Only include selected employees (require at least one selection)
      if (selectedAttendanceEmployeeIds.length === 0) {
        alert('Please select at least one employee to download.');
        return;
      }
      const employeesToDownload = filteredAttendanceEmployees.filter(e => selectedAttendanceEmployeeIds.includes(e.employeeId));
      
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 15;
      
      // Add logo
      await addLogoToPDF(doc, (pageWidth / 2) - 30, yPosition, 60, 25);
      
      // Add title
      yPosition += 30;
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text('Attendance Report', pageWidth / 2, yPosition, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`${new Date(0, attendanceMonth - 1).toLocaleString("default", { month: "long" })} ${attendanceYear}`, pageWidth / 2, yPosition + 6, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition + 12, { align: 'center' });
      
      yPosition += 20;
      
      // Get days in month
      const daysInMonth = new Date(attendanceYear, attendanceMonth, 0).getDate();
      
      // Prepare header row with dates and summary columns
      const headerRow: string[] = ['Employee', 'ID'];
      
      // Add date columns
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(attendanceYear, attendanceMonth - 1, day);
        const dateStr = dateObj.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
        headerRow.push(dateStr);
      }
      
      // Add summary columns
      headerRow.push('P', 'A', 'H', 'CF', 'CFL', 'EL', 'SL', 'CL', 'Payable');
      
      // Prepare table data with all columns
      const tableData = employeesToDownload.map(employee => {
        const empAttendance = attendanceData[employee.employeeId] || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getCount = (status: string) => {
          return empAttendance.filter(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return a.status === status && d <= today;
          }).length;
        };

        const monthlySummary = monthlySummaryData[employee.employeeId];
        const hasMonthlySummary = monthlySummary !== undefined;
        
        let payableDays: number;
        if (hasMonthlySummary && monthlySummary.totalDays && monthlySummary.totalDays > 0) {
          const totalPayableDays = (monthlySummary.presentDays ?? 0) + 
                                (monthlySummary.halfDays ?? 0) + 
                                (monthlySummary.weekOffs ?? 0) +
                                (monthlySummary.holidays ?? 0) + 
                                (monthlySummary.el ?? 0) + 
                                (monthlySummary.cl ?? 0) +
                                (monthlySummary.sl ?? 0) + 
                                (monthlySummary.compOff ?? 0) +
                                (monthlySummary.weekOffsWorked ?? 0);
          payableDays = Math.min(totalPayableDays, monthlySummary.totalDays);
        } else {
          payableDays = getCount('P') + getCount('H') + getCount('CF') + getCount('CFL') + getCount('EL') + getCount('SL') + getCount('CL');
        }

        const row: string[] = [
          employee.fullName,
          employee.employeeId
        ];
        
        // Add daily status columns
        for (let day = 1; day <= daysInMonth; day++) {
          const dateObj = new Date(attendanceYear, attendanceMonth - 1, day);
          const date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          const record = empAttendance.find(r => r.date === date);
          row.push(record?.status || '-');
        }
        
        // Add summary columns
        row.push(
          getCount('P').toString(),
          getCount('A').toString(),
          (monthlySummary?.holidays || 0).toString(),
          getCount('CF').toString(),
          getCount('CFL').toString(),
          getCount('EL').toString(),
          getCount('SL').toString(),
          getCount('CL').toString(),
          (payableDays % 1 === 0 ? payableDays : payableDays.toFixed(1)).toString()
        );
        
        return row;
      });
      
      // Build column styles dynamically
      // Landscape page width in mm: ~279.4mm (A4 landscape)
      // Margins: 5mm left + 5mm right = 10mm
      // Available width: ~269.4mm
      const availableWidth = pageWidth - 10; // Subtract margins
      
      // Fixed column widths
      const employeeNameWidth = 25; // Employee Name
      const employeeIdWidth = 15; // Employee ID
      const summaryColumnsWidth = 9 * 6; // 9 summary columns @ 6mm each = 54mm
      const fixedWidth = employeeNameWidth + employeeIdWidth + summaryColumnsWidth; // ~94mm
      
      // Calculate width for date columns (remaining space divided by number of days)
      const dateColumnsWidth = availableWidth - fixedWidth;
      const dateColumnWidth = dateColumnsWidth / daysInMonth;
      
      const columnStyles: Record<string | number, { cellWidth?: number; fontSize?: number; halign?: 'left' | 'center' | 'right' }> = {
        0: { cellWidth: employeeNameWidth, fontSize: 6 }, // Employee Name
        1: { cellWidth: employeeIdWidth, fontSize: 6 }, // Employee ID
      };
      
      // Set styles for date columns (dynamically sized to fit)
      for (let i = 2; i < 2 + daysInMonth; i++) {
        columnStyles[i] = { 
          cellWidth: dateColumnWidth, 
          halign: 'center' as const, 
          fontSize: 5 
        };
      }
      
      // Set styles for summary columns (compact width)
      const summaryStartIndex = 2 + daysInMonth;
      columnStyles[summaryStartIndex] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // P
      columnStyles[summaryStartIndex + 1] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // A
      columnStyles[summaryStartIndex + 2] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // H
      columnStyles[summaryStartIndex + 3] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // CF
      columnStyles[summaryStartIndex + 4] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // CFL
      columnStyles[summaryStartIndex + 5] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // EL
      columnStyles[summaryStartIndex + 6] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // SL
      columnStyles[summaryStartIndex + 7] = { cellWidth: 6, halign: 'center' as const, fontSize: 5 }; // CL
      columnStyles[summaryStartIndex + 8] = { cellWidth: 7, halign: 'center' as const, fontSize: 5 }; // Payable
      
      autoTable.default(doc, {
        head: [headerRow],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 5,
          cellPadding: 0.5,
          overflow: 'linebreak',
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 5,
          cellPadding: 1,
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 5, right: 5 },
        tableWidth: 'wrap',
      });
      
      doc.save(`Attendance_Report_${attendanceMonth}_${attendanceYear}.pdf`);
      setToast('Attendance report exported to PDF successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setToast('Failed to export to PDF');
    }
  };

  return (
    <>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* Delete Confirmation Modal */}
      {deleteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-2xl shadow-xl p-8 w-full max-w-md relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
              onClick={() => setDeleteProject(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>Delete Project</h2>
            <p className="mb-6 text-lg">Are you sure you want to delete the project <span className="font-semibold">&quot;{deleteProject.projectName}&quot;</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteProject(null)}
                className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-900 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-red-700 text-white hover:bg-red-800" : "bg-red-600 text-white hover:bg-red-700"}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-2xl shadow-xl p-8 w-full max-w-2xl relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}>
            <button
              className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
              onClick={() => setSelectedProject(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className={`text-2xl font-bold mb-6 text-center ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>
              Project Details
            </h2>
            <div className="space-y-4">
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Project Name:</span>
                <span className={`font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{selectedProject.projectName}</span>
              </div>
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Address:</span>
                <span className={`text-right max-w-[60%] ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>{selectedProject.address}</span>
              </div>
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Total Manpower:</span>
                <span className={theme === "dark" ? "text-gray-100" : "text-gray-900"}>{selectedProject.totalManpower}</span>
              </div>
              <div className={`flex flex-col border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"} mb-2`}>Designation-wise Count:</span>
                <div className="ml-4 space-y-1">
                  {Object.entries(selectedProject.designationWiseCount || {}).map(([designation, count]) => (
                    <div key={designation} className="flex justify-between">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>{designation}:</span>
                      <span className={theme === "dark" ? "text-gray-100" : "text-gray-900"}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`flex justify-between border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"} pb-2`}>
                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Last Updated:</span>
                <span className={theme === "dark" ? "text-gray-100" : "text-gray-900"}>{new Date(selectedProject.updatedDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedProject(null)}
                className={`px-4 py-2 rounded-lg font-semibold ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`flex flex-col gap-4 p-2 lg:p-4 w-full font-sans h-screen overflow-y-auto ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900'}`}>
        {/* Navigation Tabs */}
        <div className="flex flex-row flex-wrap gap-4 items-center w-full mb-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="view"
                value="projects"
                checked={activeTab === 'projects'}
                onChange={(e) => setActiveTab(e.target.value as 'projects' | 'attendance')}
                className="accent-blue-600"
              />
              <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                <FaProjectDiagram className="inline mr-2" />
                Projects
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="view"
                value="attendance"
                checked={activeTab === 'attendance'}
                onChange={(e) => setActiveTab(e.target.value as 'projects' | 'attendance')}
                className="accent-blue-600"
              />
              <span className={`font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                <FaFilePdf className="inline mr-2" />
                Attendance
              </span>
            </label>
            </div>
            </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
            >
              {projectOptions.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            <select
              value={designationFilter}
              onChange={e => setDesignationFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
            >
              {designationOptions.map((designation) => (
                <option key={designation} value={designation}>{designation}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 placeholder:text-gray-400 ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
              />
          </div>
        </div>
          <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Download options"
                className={`p-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'}`}
                  onClick={() => setShowDownloadDropdown(v => !v)}
                >
                  <FaDownload className="w-5 h-5" />
                </button>
                {showDownloadDropdown && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-10 py-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
                    <div className="flex justify-end px-2 pb-1">
                      <button
                        aria-label="Close download menu"
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                        onClick={() => setShowDownloadDropdown(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-t-xl"
                      onClick={() => { setShowDownloadDropdown(false); handleExportToExcel(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export to Excel
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-b-xl"
                      onClick={() => { setShowDownloadDropdown(false); handleExportToPDF(); }}
                    >
                      <FaDownload className="w-4 h-4" /> Export to PDF
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowModal(true)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'}`}
              >
                + Create Project
              </button>
            </div>
          </div>
        {/* Tab Content */}
        {activeTab === 'attendance' ? (
          <>
            {/* Attendance Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <select
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(Number(e.target.value))}
                  className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
                <select
                  value={attendanceYear}
                  onChange={(e) => setAttendanceYear(Number(e.target.value))}
                  className={`px-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
                >
                  {[2025, 2024, 2023].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    value={attendanceSearchQuery}
                    onChange={e => setAttendanceSearchQuery(e.target.value)}
                    placeholder="Search by name or ID"
                    className={`pl-10 pr-4 py-2 rounded-lg border-none shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-white text-gray-900 focus:ring-blue-500'}`}
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <FaSearch className="w-4 h-4" />
                  </span>
                </div>
                            <button
                  type="button"
                  className={`p-2 rounded-lg border-none shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100 hover:bg-blue-900' : 'bg-white text-blue-900 hover:bg-blue-100 focus:ring-blue-500'}`}
                  title="Advanced Filters"
                  onClick={() => setFilterModalOpen(true)}
                >
                  <FaFilter className="w-5 h-5" />
                            </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Download attendance options"
                    className={`p-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100 focus:ring-blue-300' : 'bg-blue-600 text-white focus:ring-blue-300'} ${selectedAttendanceEmployeeIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setShowAttendanceDownloadDropdown(v => !v)}
                    disabled={selectedAttendanceEmployeeIds.length === 0}
                  >
                    <FaDownload className="w-5 h-5" />
                    {selectedAttendanceEmployeeIds.length > 0 && <span className="text-xs">({selectedAttendanceEmployeeIds.length})</span>}
                  </button>
                  {showAttendanceDownloadDropdown && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-10 py-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
                      <div className="flex justify-end px-2 pb-1">
                        <button
                          aria-label="Close download menu"
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                          onClick={() => setShowAttendanceDownloadDropdown(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-t-xl"
                        onClick={() => { setShowAttendanceDownloadDropdown(false); handleExportAttendanceToExcel(); }}
                      >
                        <FaDownload className="w-4 h-4" /> Export to Excel
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3 text-base hover:bg-blue-100 dark:hover:bg-blue-900/20 transition rounded-b-xl"
                        onClick={() => { setShowAttendanceDownloadDropdown(false); handleExportAttendanceToPDF(); }}
                      >
                        <FaFilePdf className="w-4 h-4" /> Export to PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Modal */}
            {filterModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-sm relative`}>
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white text-lg"
                    onClick={() => setFilterModalOpen(false)}
                  >
                    ×
                  </button>
                  <h2 className="text-base font-bold mb-3 text-gray-900 dark:text-white">Filters</h2>
                  <div className="mb-3">
                    <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">Projects:</label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {attendanceProjectNames.map(project => (
                        <label key={project} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(project)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedProjects(prev => [...prev, project]);
                              } else {
                                setSelectedProjects(prev => prev.filter(p => p !== project));
                              }
                            }}
                            className="w-3 h-3"
                          />
                          <span className="text-xs truncate max-w-20" title={project}>{project}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">Designation</label>
                    <select
                      value={selectedDesignation}
                      onChange={e => setSelectedDesignation(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">All Designations</option>
                      {attendanceDesignations.map(designation => (
                        <option key={designation} value={designation}>{designation}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors text-sm"
                    onClick={() => setFilterModalOpen(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Attendance Table */}
            <div className="flex-1 overflow-auto px-3 md:px-4 pb-4">
              <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
                {attendanceLoading ? (
                  <div className="py-12 text-center text-lg font-semibold">Loading attendance data...</div>
                ) : filteredAttendanceEmployees.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 font-semibold">No employees found matching your filters.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-md" style={{ maxHeight: '70vh' }}>
                    <table className={`w-full min-w-[1200px] rounded-lg overflow-hidden text-sm ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'}`}>
                      <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-blue-600/90 backdrop-blur-sm'} text-white`}>
                        <tr>
                          <th className={`py-3 pl-4 text-center font-semibold sticky left-0 bg-inherit z-20 w-12 ${theme === 'dark' ? 'bg-blue-600/90' : 'bg-blue-600/90'}`}>
                            <input
                              type="checkbox"
                              checked={allAttendanceSelected}
                              ref={(input) => {
                                if (input) input.indeterminate = someAttendanceSelected;
                              }}
                              onChange={(e) => handleSelectAllAttendance(e.target.checked)}
                              className="w-5 h-5 cursor-pointer accent-blue-500"
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                          <th className="py-3 pl-4 pr-8 text-left font-semibold sticky left-12 bg-inherit z-20 w-64">Employee</th>
                          {Array.from({ length: new Date(attendanceYear, attendanceMonth, 0).getDate() }, (_, i) => (
                            <th key={i + 1} className="p-3 text-center font-semibold">
                              {new Date(attendanceYear, attendanceMonth - 1, i + 1).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
                            </th>
                          ))}
                          <th className="p-3 text-center font-semibold bg-green-600">P</th>
                          <th className="p-3 text-center font-semibold bg-red-600">A</th>
                          <th className="p-3 text-center font-semibold bg-purple-600">H</th>
                          <th className="p-3 text-center font-semibold bg-cyan-600">CF</th>
                          <th className="p-3 text-center font-semibold bg-blue-400">CFL</th>
                          <th className="p-3 text-center font-semibold bg-yellow-600">EL</th>
                          <th className="p-3 text-center font-semibold bg-yellow-600">SL</th>
                          <th className="p-3 text-center font-semibold bg-yellow-600">CL</th>
                          <th className="p-3 text-center font-semibold bg-blue-600">Payable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAttendanceEmployees.map((employee) => {
                          const empAttendance = attendanceData[employee.employeeId] || [];
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          const getCount = (status: string) => {
                            return empAttendance.filter(a => {
                              const d = new Date(a.date);
                              d.setHours(0, 0, 0, 0);
                              return a.status === status && d <= today;
                            }).length;
                          };

                          // Calculate individual counts from attendance records
                          const presentCount = getCount('P');
                          const absentCount = getCount('A');
                          const cfCount = getCount('CF');
                          const cflCount = getCount('CFL');
                          const elCount = getCount('EL');
                          const slCount = getCount('SL');
                          const clCount = getCount('CL');
                          
                          // Use monthly summary data if available, otherwise fallback to attendance record counts
                          const hasMonthlySummary = monthlySummaryData[employee.employeeId] !== undefined;
                          const monthlySummary: typeof monthlySummaryData[string] = monthlySummaryData[employee.employeeId] ?? { 
                            holidays: 0, 
                            weekOffs: 0, 
                            weekOffsWorked: 0,
                            halfDays: 0,
                            presentDays: 0,
                            el: 0,
                            sl: 0,
                            cl: 0,
                            compOff: 0,
                            totalDays: 0,
                            lop: 0,
                            partiallyAbsentDays: 0,
                            regularizedPresentDays: 0
                          };
                          
                          // Calculate payable days using component-based calculation
                          // Based on API response analysis: weekOffs are all payable (they represent paid week offs)
                          // weekOffsWorked are also payable (employee worked on week offs, earning those days)
                          let payableDays: number;
                          if (hasMonthlySummary && monthlySummary.totalDays && monthlySummary.totalDays > 0) {
                            // Calculate total payable days:
                            // Present + Half Days + Week Offs + Holidays + EL + CL + SL + Comp Off + Week Offs Worked
                            // All weekOffs are payable (paid week offs), weekOffsWorked are additional payable days
                            // Note: halfDays from API is already in decimal format (0.5, not count)
                            const totalPayableDays = (monthlySummary.presentDays ?? 0) + 
                                                  (monthlySummary.halfDays ?? 0) + 
                                                  (monthlySummary.weekOffs ?? 0) +
                                                  (monthlySummary.holidays ?? 0) + 
                                                  (monthlySummary.el ?? 0) + 
                                                  (monthlySummary.cl ?? 0) +
                                                  (monthlySummary.sl ?? 0) + 
                                                  (monthlySummary.compOff ?? 0) +
                                                  (monthlySummary.weekOffsWorked ?? 0);
                            
                            // Cap payable days to not exceed total days
                            payableDays = Math.min(totalPayableDays, monthlySummary.totalDays);
                            
                            // Debug logging for troubleshooting
                            if (employee.employeeId === 'EFMS3309') {
                              console.log('=== PAYABLE DAYS CALCULATION DEBUG ===');
                              console.log('Employee:', employee.fullName);
                              console.log('Present Days:', monthlySummary.presentDays);
                              console.log('Half Days:', monthlySummary.halfDays);
                              console.log('Week Offs:', monthlySummary.weekOffs);
                              console.log('Week Offs Worked:', monthlySummary.weekOffsWorked);
                              console.log('Holidays:', monthlySummary.holidays);
                              console.log('EL:', monthlySummary.el);
                              console.log('SL:', monthlySummary.sl);
                              console.log('CL:', monthlySummary.cl);
                              console.log('Comp Off:', monthlySummary.compOff);
                              console.log('Total Payable Days:', totalPayableDays);
                              console.log('Capped Payable Days:', payableDays);
                            }
                          } else {
                            // Fallback to component-based calculation if monthly summary not available
                            const netWeekOffs = (monthlySummary.weekOffs ?? 0) - (monthlySummary.weekOffsWorked ?? 0);
                            payableDays = 
                              (hasMonthlySummary ? (monthlySummary.presentDays ?? 0) : presentCount) +
                              (hasMonthlySummary ? ((monthlySummary.halfDays ?? 0) / 2) : 0) +
                              (hasMonthlySummary ? (netWeekOffs > 0 ? netWeekOffs : 0) : 0) +
                              (hasMonthlySummary ? (monthlySummary.holidays ?? 0) : 0) +
                              (hasMonthlySummary ? (monthlySummary.el ?? 0) : elCount) +
                              (hasMonthlySummary ? (monthlySummary.cl ?? 0) : clCount) +
                              (hasMonthlySummary ? (monthlySummary.sl ?? 0) : slCount) +
                              (hasMonthlySummary ? (monthlySummary.compOff ?? 0) : cflCount);
                          }
                          
                          // Use holidays + weekOffs for display in H column
                          const holidayCount = monthlySummary.holidays + monthlySummary.weekOffs;
                          
                          // Debug logging
                          if (employee.employeeId === filteredAttendanceEmployees[0]?.employeeId) {
                            console.log('Debug - Employee:', employee.employeeId);
                            console.log('Debug - Attendance Data:', empAttendance.slice(0, 5));
                            console.log('Debug - Counts:', { presentCount, absentCount, holidayCount, cfCount, cflCount, elCount, slCount, clCount, payableDays });
                          }
                          
                          return (
                            <tr key={employee.employeeId} className={`transition-colors duration-150 ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50/50'}`}>
                              <td className={`py-3 pl-4 text-center sticky left-0 bg-inherit z-10 w-12 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedAttendanceEmployeeIds.includes(employee.employeeId)}
                                  onChange={(e) => handleAttendanceEmployeeSelect(employee.employeeId, e.target.checked)}
                                  className="w-5 h-5 cursor-pointer accent-blue-500"
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
                              <td className={`py-3 pl-4 pr-8 sticky left-12 bg-inherit z-10 whitespace-nowrap ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <Image src={employee.imageUrl} alt={employee.fullName} width={40} height={40} className="rounded-full object-cover" />
                                  <div>
                                    <div className="font-bold">{employee.fullName}</div>
                                    <div className="text-xs opacity-70">{employee.employeeId}</div>
                                  </div>
                          </div>
                        </td>
                              {Array.from({ length: new Date(attendanceYear, attendanceMonth, 0).getDate() }, (_, i) => {
                                const dateObj = new Date(attendanceYear, attendanceMonth - 1, i + 1);
                                const date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                                const record = empAttendance.find(r => r.date === date);
                                const status = record?.status || '';
                                
                                let badgeColor = '';
                                if (status === 'P') badgeColor = theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
                                else if (status === 'A') badgeColor = theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
                                else if (status === 'H') badgeColor = theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700';
                                else if (status === 'CF') badgeColor = theme === 'dark' ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700';
                                else if (status === 'CFL') badgeColor = theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
                                else if (['EL', 'SL', 'CL'].includes(status)) badgeColor = theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
                                else badgeColor = theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500';
                                
                                return (
                                  <td key={i + 1} className="p-3 text-center font-semibold">
                                    <span className={`inline-block rounded-full w-8 py-1 text-xs font-bold shadow-sm ${badgeColor}`}>{status || '-'}</span>
                                  </td>
                                );
                              })}
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>{presentCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-red-900' : 'bg-red-100'}`}>{absentCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}>{holidayCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-cyan-900' : 'bg-cyan-100'}`}>{cfCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>{cflCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{elCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{slCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>{clCount}</td>
                              <td className={`p-3 text-center font-bold ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
                                {payableDays % 1 === 0 ? payableDays : payableDays.toFixed(1)}
                              </td>
                      </tr>
                          );
                        })}
                </tbody>
              </table>
            </div>
                )}
          </div>
            </div>
          </>
        ) : (
          <>
            {/* Project Table - Matching Coordinator Dashboard */}
            <div className="flex-1 overflow-auto px-3 md:px-4 pb-4">
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {loading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading projects...</div>
            ) : sortedProjects.length === 0 ? (
              <div className="py-12 text-center text-gray-500 font-semibold">No projects found matching your filters.</div>
            ) : (
              <table className="w-full text-xs table-fixed border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-1 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`} style={{ width: '3%' }}>#</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '20%' }}>Project Name</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '30%' }}>Location</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Active Count</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Total Manpower</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '12%' }}>Shortage Manpower</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '10%' }}>Designations</th>
                    <th className={`px-1 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`} style={{ width: '5%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {sortedProjects.map((project, idx) => (
                    <tr key={project._id || idx} className={`${theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"} even:bg-gray-50 dark:even:bg-gray-900`}>
                      <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                      <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}>
                        <div className="truncate" title={project.projectName}>{project.projectName}</div>
                      </td>
                      <td className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}>
                        <div className="truncate" title={project.address}>{project.address}</div>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                        <span className="font-semibold">{getActiveCount(project.projectName)}</span>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                        <span className="font-semibold">{getActiveCount(project.projectName) > 0 ? projectDistribution.find(item => item._id === project.projectName)?.totalManpower || 0 : project.totalManpower}</span>
                      </td>
                      <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                        <span className={`font-semibold ${getShortageManpower(project.projectName) >= 0 ? (theme === 'dark' ? 'text-green-300' : 'text-green-600') : (theme === 'dark' ? 'text-red-300' : 'text-red-600')}`}>
                          {getShortageManpower(project.projectName) >= 0 ? `+${getShortageManpower(project.projectName)}` : getShortageManpower(project.projectName)}
                        </span>
                      </td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>
                        <div className="text-xs">
                          {Object.entries(project.designationWiseCount || {}).map(([designation, count]) => (
                            <div key={designation} className="truncate" title={`${designation}: ${count}`}>
                              {designation}: <span className="font-semibold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={`px-2 py-1 border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                        <div className="flex items-center gap-1">
              <button
                            onClick={() => setSelectedProject(project)}
                            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${theme === 'dark' ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            title="View Details"
                          >
                            <FaEye className="w-2 h-2" />
              </button>
            </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
        </div>
        </div>
          </>
        )}
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div
              ref={modalRef}
              className={`rounded-2xl shadow-xl p-8 w-full max-w-lg relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              <button
                className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Create Project</h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Project Name</label>
                  <input
                    name="projectName"
                    value={form.projectName}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Total Manpower</label>
                  <input
                    name="totalManpower"
                    type="number"
                    min="1"
                    value={form.totalManpower}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Designation-wise Count</label>
                  {form.designationWiseCount.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        name={`designation-${idx}`}
                        value={item.designation}
                        onChange={e => handleFormChange(e, idx)}
                        placeholder="Designation"
                        required
                        className={`flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                      <input
                        name={`count-${idx}`}
                        type="number"
                        min="1"
                        value={item.count}
                        onChange={e => handleFormChange(e, idx)}
                        placeholder="Count"
                        required
                        className={`w-24 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                      {form.designationWiseCount.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDesignationField(idx)}
                          className="text-red-500 hover:text-red-700 text-lg px-2"
                          aria-label="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDesignationField}
                    className={`text-sm mt-1 ${theme === "dark" ? "text-blue-400 hover:underline" : "text-blue-600 hover:underline"}`}
                  >
                    + Add Designation
                  </button>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-900 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}