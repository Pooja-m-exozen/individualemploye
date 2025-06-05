'use client'
import  {  useEffect } from 'react';
// import { FaFileAlt, FaCalendarAlt, FaSearch, FaDownload, FaEye, FaFilter, FaArrowLeft, FaFileExcel, FaCalendar } from 'react-icons/fa';
// import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useRouter,  } from 'next/navigation';
// import * as XLSX from 'xlsx';








export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to leave report by default
    router.push('/reports/leave');
  }, [router]);

  return null;
} 