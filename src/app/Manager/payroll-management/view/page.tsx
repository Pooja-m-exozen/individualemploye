"use client";

import React, { useState, useMemo, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaSearch, FaChevronLeft, FaChevronRight, FaFileInvoiceDollar, FaTimes, FaPrint, FaDownload, FaPlus, FaUser, FaBuilding, FaBriefcase, FaCheckCircle } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import domtoimage from "dom-to-image";
import jsPDF from "jspdf";
import { createPayroll } from "@/services/payroll";
import { getAllKYCRecords } from "@/services/kyc";
import { KYCRecord } from "@/types/kyc";

const statusOptions = ["All", "Paid", "Pending"];
const monthOptions = [
  "All Months", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface PayrollMaster {
  _id?: string;
  employeeId: string;
  employeeName?: string;
  year: string;
  basicSalary: number;
  hrAllowance: number;
  conveyanceAllowance: number; // DA
  specialAllowance: number;
  otherAllowance: number;
  pf: number;
  pt: number;
  esi?: number;
  medicalInsurance?: number;
  uniformDeduction?: number;
  roomRent?: number;
  washingAllowance?: number;
  grossSalary: number;
  netSalary: number;
  project?: string;
  designation?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PayrollRecord {
  _id?: string;
  employeeName?: string;
  employeeId?: string;
  month?: string;
  year?: string;
  amount?: number;
  status?: string;
  project?: string;
  designation?: string;
  basicSalary?: number;
  hrAllowance?: number;
  conveyanceAllowance?: number;
  specialAllowance?: number;
  otherAllowance?: number;
  washingAllowance?: number;
  pf?: number;
  esi?: number;
  pt?: number;
  medicalInsurance?: number;
  uniformDeduction?: number;
  roomRent?: number;
  payableDays?: number;
  totalEarnings?: number;
  totalDeductions?: number;
  netPay?: number;
}

interface PayslipData {
  employeeId: string;
  employeeName: string;
  designation: string;
  project: string;
  month: string;
  year: string;
  basicSalary: number;
  hrAllowance: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  otherAllowance: number;
  washingAllowance: number;
  totalEarnings: number;
  pf: number;
  esi: number;
  pt: number;
  medicalInsurance: number;
  uniformDeduction: number;
  roomRent: number;
  totalDeductions: number;
  netPay: number;
  payableDays: number;
  employeeImage?: string;
}

const monthOptionsForCreate = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollViewPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All Projects");
  const [monthFilter, setMonthFilter] = useState("All Months");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Payroll Master State
  const [payrollMasters, setPayrollMasters] = useState<PayrollMaster[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [mastersError, setMastersError] = useState<string | null>(null);
  
  // Monthly Payroll Records (for tracking generated payslips)
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [projectOptions, setProjectOptions] = useState<string[]>(["All Projects"]);
  const [designationOptions, setDesignationOptions] = useState<string[]>(["All Designations"]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payslipError, setPayslipError] = useState<string | null>(null);
  
  // Create Payroll Master Modal State
  const [showCreateMasterModal, setShowCreateMasterModal] = useState(false);
  const [editingTypeField, setEditingTypeField] = useState<string | null>(null);
  const [masterForm, setMasterForm] = useState<{
    employeeId: string;
    year: string;
    // Salary Components
    basicSalary: string;
    daVda: string;
    hrAllowance: string;
    conveyanceAllowance: string;
    leaveTravelAllowance: string;
    medicalAllowance: string;
    specialAllowance: string;
    otherAllowance: string;
    // Other Benefits
    washingAllowance: string;
    leaveWithWages: string;
    bonus: string;
    nationalFestivalHolidays: string;
    wagesAdditionalHours: string;
    relieverCharges: string;
    // Employee Deductions
    employeePf: string;
    employeeEsi: string;
    pt: string;
    uniformDeduction: string;
    medicalInsurance: string;
    trainingCost: string;
    labourWelfareFundEmployee: string;
    // Employer Deductions
    employerPf: string;
    employerEsi: string;
    labourLicense: string;
    labourWelfareFundEmployer: string;
    gratuity: string;
    // Legacy fields (keeping for backward compatibility)
    pf: string;
    esi: string;
    roomRent: string;
    // Applicable checkboxes
    basicSalaryApplicable: boolean;
    daVdaApplicable: boolean;
    hrAllowanceApplicable: boolean;
    conveyanceAllowanceApplicable: boolean;
    leaveTravelAllowanceApplicable: boolean;
    medicalAllowanceApplicable: boolean;
    specialAllowanceApplicable: boolean;
    otherAllowanceApplicable: boolean;
    washingAllowanceApplicable: boolean;
    leaveWithWagesApplicable: boolean;
    bonusApplicable: boolean;
    nationalFestivalHolidaysApplicable: boolean;
    wagesAdditionalHoursApplicable: boolean;
    relieverChargesApplicable: boolean;
    employeePfApplicable: boolean;
    employeeEsiApplicable: boolean;
    ptApplicable: boolean;
    uniformDeductionApplicable: boolean;
    medicalInsuranceApplicable: boolean;
    trainingCostApplicable: boolean;
    labourWelfareFundEmployeeApplicable: boolean;
    employerPfApplicable: boolean;
    employerEsiApplicable: boolean;
    labourLicenseApplicable: boolean;
    labourWelfareFundEmployerApplicable: boolean;
    gratuityApplicable: boolean;
    // Fixed/Variable dropdowns
    basicSalaryType: string;
    daVdaType: string;
    hrAllowanceType: string;
    conveyanceAllowanceType: string;
    leaveTravelAllowanceType: string;
    medicalAllowanceType: string;
    specialAllowanceType: string;
    otherAllowanceType: string;
    washingAllowanceType: string;
    leaveWithWagesType: string;
    bonusType: string;
    nationalFestivalHolidaysType: string;
    wagesAdditionalHoursType: string;
    relieverChargesType: string;
    employeePfType: string;
    employeeEsiType: string;
    ptType: string;
    uniformDeductionType: string;
    medicalInsuranceType: string;
    trainingCostType: string;
    labourWelfareFundEmployeeType: string;
    employerPfType: string;
    employerEsiType: string;
    labourLicenseType: string;
    labourWelfareFundEmployerType: string;
    gratuityType: string;
    // Percentage/Calculation fields
    basicSalaryPercentage: string;
    daVdaPercentage: string;
    hrAllowancePercentage: string;
    conveyanceAllowancePercentage: string;
    leaveTravelAllowancePercentage: string;
    medicalAllowancePercentage: string;
    specialAllowancePercentage: string;
    otherAllowancePercentage: string;
    washingAllowancePercentage: string;
    leaveWithWagesPercentage: string;
    bonusPercentage: string;
    nationalFestivalHolidaysPercentage: string;
    wagesAdditionalHoursPercentage: string;
    relieverChargesPercentage: string;
    employeePfPercentage: string;
    employeeEsiPercentage: string;
    ptPercentage: string;
    uniformDeductionPercentage: string;
    medicalInsurancePercentage: string;
    trainingCostPercentage: string;
    labourWelfareFundEmployeePercentage: string;
    employerPfPercentage: string;
    employerEsiPercentage: string;
    labourLicensePercentage: string;
    labourWelfareFundEmployerPercentage: string;
    gratuityPercentage: string;
  }>({
    employeeId: "",
    year: new Date().getFullYear().toString(),
    // Salary Components
    basicSalary: "",
    daVda: "",
    hrAllowance: "",
    conveyanceAllowance: "",
    leaveTravelAllowance: "",
    medicalAllowance: "",
    specialAllowance: "",
    otherAllowance: "",
    // Other Benefits
    washingAllowance: "",
    leaveWithWages: "",
    bonus: "",
    nationalFestivalHolidays: "",
    wagesAdditionalHours: "",
    relieverCharges: "",
    // Employee Deductions
    employeePf: "",
    employeeEsi: "",
    pt: "",
    uniformDeduction: "",
    medicalInsurance: "",
    trainingCost: "",
    labourWelfareFundEmployee: "",
    // Employer Deductions
    employerPf: "",
    employerEsi: "",
    labourLicense: "",
    labourWelfareFundEmployer: "",
    gratuity: "",
    // Legacy fields
    pf: "",
    esi: "",
    roomRent: "",
    // Applicable checkboxes
    basicSalaryApplicable: false,
    daVdaApplicable: false,
    hrAllowanceApplicable: false,
    conveyanceAllowanceApplicable: false,
    leaveTravelAllowanceApplicable: false,
    medicalAllowanceApplicable: false,
    specialAllowanceApplicable: false,
    otherAllowanceApplicable: false,
    washingAllowanceApplicable: false,
    leaveWithWagesApplicable: false,
    bonusApplicable: false,
    nationalFestivalHolidaysApplicable: false,
    wagesAdditionalHoursApplicable: false,
    relieverChargesApplicable: false,
    employeePfApplicable: false,
    employeeEsiApplicable: false,
    ptApplicable: false,
    uniformDeductionApplicable: false,
    medicalInsuranceApplicable: false,
    trainingCostApplicable: false,
    labourWelfareFundEmployeeApplicable: false,
    employerPfApplicable: false,
    employerEsiApplicable: false,
    labourLicenseApplicable: false,
    labourWelfareFundEmployerApplicable: false,
    gratuityApplicable: false,
    // Fixed/Variable dropdowns
    basicSalaryType: "",
    daVdaType: "",
    hrAllowanceType: "",
    conveyanceAllowanceType: "",
    leaveTravelAllowanceType: "",
    medicalAllowanceType: "",
    specialAllowanceType: "",
    otherAllowanceType: "",
    washingAllowanceType: "",
    leaveWithWagesType: "",
    bonusType: "",
    nationalFestivalHolidaysType: "",
    wagesAdditionalHoursType: "",
    relieverChargesType: "",
    employeePfType: "",
    employeeEsiType: "",
    ptType: "",
    uniformDeductionType: "",
    medicalInsuranceType: "",
    trainingCostType: "",
    labourWelfareFundEmployeeType: "",
    employerPfType: "",
    employerEsiType: "",
    labourLicenseType: "",
    labourWelfareFundEmployerType: "",
    gratuityType: "",
    // Percentage/Calculation fields
    basicSalaryPercentage: "",
    daVdaPercentage: "",
    hrAllowancePercentage: "",
    conveyanceAllowancePercentage: "",
    leaveTravelAllowancePercentage: "",
    medicalAllowancePercentage: "",
    specialAllowancePercentage: "",
    otherAllowancePercentage: "",
    washingAllowancePercentage: "",
    leaveWithWagesPercentage: "",
    bonusPercentage: "",
    nationalFestivalHolidaysPercentage: "",
    wagesAdditionalHoursPercentage: "",
    relieverChargesPercentage: "",
    employeePfPercentage: "",
    employeeEsiPercentage: "",
    ptPercentage: "",
    uniformDeductionPercentage: "",
    medicalInsurancePercentage: "",
    trainingCostPercentage: "",
    labourWelfareFundEmployeePercentage: "",
    employerPfPercentage: "",
    employerEsiPercentage: "",
    labourLicensePercentage: "",
    labourWelfareFundEmployerPercentage: "",
    gratuityPercentage: "",
  });
  const [masterCreateLoading, setMasterCreateLoading] = useState(false);
  const [masterCreateError, setMasterCreateError] = useState<string | null>(null);
  const [masterCreateSuccess, setMasterCreateSuccess] = useState<string | null>(null);
  
  // Auto-calculate amounts for Variable components
  useEffect(() => {
    const basicSalary = Number(masterForm.basicSalary) || 0;
    const daVda = Number(masterForm.daVda) || 0;
    const basicPlusDa = basicSalary + daVda;

    // Helper function to calculate ROUNDUP
    const roundUp = (value: number): number => {
      return Math.ceil(value);
    };

    // Update amounts based on Variable type and percentage
    const updates: Partial<typeof masterForm> = {};

    // DA/VDA: ROUNDUP(Basic Salary * percentage%)
    if (masterForm.daVdaType === "Variable" && masterForm.daVdaPercentage) {
      const percentage = Number(masterForm.daVdaPercentage) || 0;
      const calculated = roundUp(basicSalary * (percentage / 100));
      if (masterForm.daVda !== calculated.toString()) {
        updates.daVda = calculated.toString();
      }
    }

    // HR Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.hrAllowanceType === "Variable" && masterForm.hrAllowancePercentage) {
      const percentage = Number(masterForm.hrAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.hrAllowance !== calculated.toString()) {
        updates.hrAllowance = calculated.toString();
      }
    }

    // Conveyance Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.conveyanceAllowanceType === "Variable" && masterForm.conveyanceAllowancePercentage) {
      const percentage = Number(masterForm.conveyanceAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.conveyanceAllowance !== calculated.toString()) {
        updates.conveyanceAllowance = calculated.toString();
      }
    }

    // Leave Travel Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.leaveTravelAllowanceType === "Variable" && masterForm.leaveTravelAllowancePercentage) {
      const percentage = Number(masterForm.leaveTravelAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.leaveTravelAllowance !== calculated.toString()) {
        updates.leaveTravelAllowance = calculated.toString();
      }
    }

    // Medical Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.medicalAllowanceType === "Variable" && masterForm.medicalAllowancePercentage) {
      const percentage = Number(masterForm.medicalAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.medicalAllowance !== calculated.toString()) {
        updates.medicalAllowance = calculated.toString();
      }
    }

    // Special Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.specialAllowanceType === "Variable" && masterForm.specialAllowancePercentage) {
      const percentage = Number(masterForm.specialAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.specialAllowance !== calculated.toString()) {
        updates.specialAllowance = calculated.toString();
      }
    }

    // Other Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.otherAllowanceType === "Variable" && masterForm.otherAllowancePercentage) {
      const percentage = Number(masterForm.otherAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.otherAllowance !== calculated.toString()) {
        updates.otherAllowance = calculated.toString();
      }
    }

    // Washing Allowance: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.washingAllowanceType === "Variable" && masterForm.washingAllowancePercentage) {
      const percentage = Number(masterForm.washingAllowancePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.washingAllowance !== calculated.toString()) {
        updates.washingAllowance = calculated.toString();
      }
    }

    // Leave with Wages: ROUNDUP(SUM((Basic+VDA/DA)/26*30/12),0)
    if (masterForm.leaveWithWagesType === "Variable") {
      const calculated = roundUp((basicPlusDa / 26) * 30 / 12);
      if (masterForm.leaveWithWages !== calculated.toString()) {
        updates.leaveWithWages = calculated.toString();
      }
    }

    // Bonus: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.bonusType === "Variable" && masterForm.bonusPercentage) {
      const percentage = Number(masterForm.bonusPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.bonus !== calculated.toString()) {
        updates.bonus = calculated.toString();
      }
    }

    // National Festival Holidays: ROUNDUP(SUM((Basic+VDA/DA)/26*10/12),0)
    if (masterForm.nationalFestivalHolidaysType === "Variable") {
      const calculated = roundUp((basicPlusDa / 26) * 10 / 12);
      if (masterForm.nationalFestivalHolidays !== calculated.toString()) {
        updates.nationalFestivalHolidays = calculated.toString();
      }
    }

    // Wages for additional Hours: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.wagesAdditionalHoursType === "Variable" && masterForm.wagesAdditionalHoursPercentage) {
      const percentage = Number(masterForm.wagesAdditionalHoursPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.wagesAdditionalHours !== calculated.toString()) {
        updates.wagesAdditionalHours = calculated.toString();
      }
    }

    // Reliever Charges: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.relieverChargesType === "Variable" && masterForm.relieverChargesPercentage) {
      const percentage = Number(masterForm.relieverChargesPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.relieverCharges !== calculated.toString()) {
        updates.relieverCharges = calculated.toString();
      }
    }

    // Employee PF: ROUNDUP(+IF((Basic+VDA/DA)>15000,(15000*percentage%),(Basic+VDA/DA)*percentage%),0)
    if (masterForm.employeePfType === "Variable" && masterForm.employeePfPercentage) {
      const percentage = Number(masterForm.employeePfPercentage) || 0;
      let calculated: number;
      if (basicPlusDa > 15000) {
        calculated = roundUp(15000 * (percentage / 100));
      } else {
        calculated = roundUp(basicPlusDa * (percentage / 100));
      }
      if (masterForm.employeePf !== calculated.toString()) {
        updates.employeePf = calculated.toString();
      }
    }

    // Employee ESI: +ROUND(IF(Gross salary+National festival holiday)>21000,0,((Gross salary+National festival holiday)*percentage%),0)
    if (masterForm.employeeEsiType === "Variable" && masterForm.employeeEsiPercentage) {
      const percentage = Number(masterForm.employeeEsiPercentage) || 0;
      // Calculate Gross Salary = Basic + DA/VDA + HR Allowance + Conveyance + Leave Travel + Medical + Special + Other
      const grossSalary = 
        (Number(masterForm.basicSalary) || 0) +
        (Number(masterForm.daVda) || 0) +
        (Number(masterForm.hrAllowance) || 0) +
        (Number(masterForm.conveyanceAllowance) || 0) +
        (Number(masterForm.leaveTravelAllowance) || 0) +
        (Number(masterForm.medicalAllowance) || 0) +
        (Number(masterForm.specialAllowance) || 0) +
        (Number(masterForm.otherAllowance) || 0);
      
      const grossSalaryPlusNationalFestival = grossSalary + (Number(masterForm.nationalFestivalHolidays) || 0);
      
      const calculated = grossSalaryPlusNationalFestival > 21000 
        ? 0 
        : Math.round(grossSalaryPlusNationalFestival * (percentage / 100));
      
      if (masterForm.employeeEsi !== calculated.toString()) {
        updates.employeeEsi = calculated.toString();
      }
    }

    // PT: +IF((Gross Salary)<25000,0,200)
    if (masterForm.ptType === "Variable") {
      // Calculate Gross Salary = Basic + DA/VDA + HR Allowance + Conveyance + Leave Travel + Medical + Special + Other
      const grossSalary = 
        (Number(masterForm.basicSalary) || 0) +
        (Number(masterForm.daVda) || 0) +
        (Number(masterForm.hrAllowance) || 0) +
        (Number(masterForm.conveyanceAllowance) || 0) +
        (Number(masterForm.leaveTravelAllowance) || 0) +
        (Number(masterForm.medicalAllowance) || 0) +
        (Number(masterForm.specialAllowance) || 0) +
        (Number(masterForm.otherAllowance) || 0);
      
      const calculated = grossSalary < 25000 ? 0 : 200;
      if (masterForm.pt !== calculated.toString()) {
        updates.pt = calculated.toString();
      }
    }

    // Uniform Deduction: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.uniformDeductionType === "Variable" && masterForm.uniformDeductionPercentage) {
      const percentage = Number(masterForm.uniformDeductionPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.uniformDeduction !== calculated.toString()) {
        updates.uniformDeduction = calculated.toString();
      }
    }

    // Medical Insurance: IF(SUM(Gross salary )>21000,700,0)
    if (masterForm.medicalInsuranceType === "Variable") {
      // Calculate Gross Salary = Basic + DA/VDA + HR Allowance + Conveyance + Leave Travel + Medical + Special + Other
      const grossSalary = 
        (Number(masterForm.basicSalary) || 0) +
        (Number(masterForm.daVda) || 0) +
        (Number(masterForm.hrAllowance) || 0) +
        (Number(masterForm.conveyanceAllowance) || 0) +
        (Number(masterForm.leaveTravelAllowance) || 0) +
        (Number(masterForm.medicalAllowance) || 0) +
        (Number(masterForm.specialAllowance) || 0) +
        (Number(masterForm.otherAllowance) || 0);
      
      const calculated = grossSalary > 21000 ? 700 : 0;
      if (masterForm.medicalInsurance !== calculated.toString()) {
        updates.medicalInsurance = calculated.toString();
      }
    }

    // Training Cost: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.trainingCostType === "Variable" && masterForm.trainingCostPercentage) {
      const percentage = Number(masterForm.trainingCostPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.trainingCost !== calculated.toString()) {
        updates.trainingCost = calculated.toString();
      }
    }

    // Labour Welfare Fund Employee: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.labourWelfareFundEmployeeType === "Variable" && masterForm.labourWelfareFundEmployeePercentage) {
      const percentage = Number(masterForm.labourWelfareFundEmployeePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.labourWelfareFundEmployee !== calculated.toString()) {
        updates.labourWelfareFundEmployee = calculated.toString();
      }
    }

    // Employer PF: +IF((Basic+VDA/DA)>15000,(15000*percentage%),(Basic+VDA/DA)*percentage%)
    if (masterForm.employerPfType === "Variable" && masterForm.employerPfPercentage) {
      const percentage = Number(masterForm.employerPfPercentage) || 0;
      const calculated = basicPlusDa > 15000 
        ? roundUp(15000 * (percentage / 100))
        : roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.employerPf !== calculated.toString()) {
        updates.employerPf = calculated.toString();
      }
    }

    // Employer ESI: +ROUND(IF((Gross salary+National festival holidays)>21000,0,((Gross salary+National festival holidays)*percentage%),0)
    if (masterForm.employerEsiType === "Variable" && masterForm.employerEsiPercentage) {
      const percentage = Number(masterForm.employerEsiPercentage) || 0;
      // Calculate Gross Salary = Basic + DA/VDA + HR Allowance + Conveyance + Leave Travel + Medical + Special + Other
      const grossSalary = 
        (Number(masterForm.basicSalary) || 0) +
        (Number(masterForm.daVda) || 0) +
        (Number(masterForm.hrAllowance) || 0) +
        (Number(masterForm.conveyanceAllowance) || 0) +
        (Number(masterForm.leaveTravelAllowance) || 0) +
        (Number(masterForm.medicalAllowance) || 0) +
        (Number(masterForm.specialAllowance) || 0) +
        (Number(masterForm.otherAllowance) || 0);
      
      const grossSalaryPlusNationalFestival = grossSalary + (Number(masterForm.nationalFestivalHolidays) || 0);
      
      const calculated = grossSalaryPlusNationalFestival > 21000 
        ? 0 
        : Math.round(grossSalaryPlusNationalFestival * (percentage / 100));
      
      if (masterForm.employerEsi !== calculated.toString()) {
        updates.employerEsi = calculated.toString();
      }
    }

    // Labour License: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.labourLicenseType === "Variable" && masterForm.labourLicensePercentage) {
      const percentage = Number(masterForm.labourLicensePercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.labourLicense !== calculated.toString()) {
        updates.labourLicense = calculated.toString();
      }
    }

    // Labour Welfare Fund Employer: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.labourWelfareFundEmployerType === "Variable" && masterForm.labourWelfareFundEmployerPercentage) {
      const percentage = Number(masterForm.labourWelfareFundEmployerPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.labourWelfareFundEmployer !== calculated.toString()) {
        updates.labourWelfareFundEmployer = calculated.toString();
      }
    }

    // Gratuity: ROUNDUP(SUM(Basic Salary:DA/VDA) * percentage%)
    if (masterForm.gratuityType === "Variable" && masterForm.gratuityPercentage) {
      const percentage = Number(masterForm.gratuityPercentage) || 0;
      const calculated = roundUp(basicPlusDa * (percentage / 100));
      if (masterForm.gratuity !== calculated.toString()) {
        updates.gratuity = calculated.toString();
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      setMasterForm(prev => ({ ...prev, ...updates }));
    }
  }, [
    masterForm.basicSalary,
    masterForm.daVda,
    masterForm.daVdaType,
    masterForm.daVdaPercentage,
    masterForm.hrAllowanceType,
    masterForm.hrAllowancePercentage,
    masterForm.conveyanceAllowanceType,
    masterForm.conveyanceAllowancePercentage,
    masterForm.leaveTravelAllowanceType,
    masterForm.leaveTravelAllowancePercentage,
    masterForm.medicalAllowanceType,
    masterForm.medicalAllowancePercentage,
    masterForm.specialAllowanceType,
    masterForm.specialAllowancePercentage,
    masterForm.otherAllowanceType,
    masterForm.otherAllowancePercentage,
    masterForm.washingAllowanceType,
    masterForm.washingAllowancePercentage,
    masterForm.leaveWithWagesType,
    masterForm.bonusType,
    masterForm.bonusPercentage,
    masterForm.nationalFestivalHolidaysType,
    masterForm.wagesAdditionalHoursType,
    masterForm.wagesAdditionalHoursPercentage,
    masterForm.relieverChargesType,
    masterForm.relieverChargesPercentage,
    masterForm.employeePfType,
    masterForm.employeePfPercentage,
    masterForm.employeeEsiType,
    masterForm.employeeEsiPercentage,
    masterForm.nationalFestivalHolidays,
    masterForm.ptType,
    masterForm.basicSalary,
    masterForm.daVda,
    masterForm.hrAllowance,
    masterForm.conveyanceAllowance,
    masterForm.leaveTravelAllowance,
    masterForm.medicalAllowance,
    masterForm.specialAllowance,
    masterForm.otherAllowance,
    masterForm.uniformDeductionType,
    masterForm.uniformDeductionPercentage,
    masterForm.medicalInsuranceType,
    masterForm.trainingCostType,
    masterForm.trainingCostPercentage,
    masterForm.labourWelfareFundEmployeeType,
    masterForm.labourWelfareFundEmployeePercentage,
    masterForm.employerPfType,
    masterForm.employerPfPercentage,
    masterForm.employerEsiType,
    masterForm.employerEsiPercentage,
    masterForm.labourLicenseType,
    masterForm.labourLicensePercentage,
    masterForm.labourWelfareFundEmployerType,
    masterForm.labourWelfareFundEmployerPercentage,
    masterForm.gratuityType,
    masterForm.gratuityPercentage,
  ]);
  
  // Master Modal Employee Selection State
  const [masterModalProjectFilter, setMasterModalProjectFilter] = useState("");
  const [masterModalKycRecords, setMasterModalKycRecords] = useState<KYCRecord[]>([]);
  const [masterModalLoading, setMasterModalLoading] = useState(false);
  const [masterModalEmployeeSearch, setMasterModalEmployeeSearch] = useState("");
  const [masterModalEmployeeConfirmed, setMasterModalEmployeeConfirmed] = useState(false);
  
  // Monthly Payslip Generation State (for each master)
  const [selectedMasterForMonth, setSelectedMasterForMonth] = useState<Record<string, { month: string; year: string; payableDays: number; amount: number; loading: boolean }>>({});
  const [generatedPayslips, setGeneratedPayslips] = useState<Set<string>>(new Set()); // Track employeeId-month-year combinations
  
  // Create Payroll Modal State (keeping for backward compatibility)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeProjectFilter, setEmployeeProjectFilter] = useState("");
  const [employeeDesignationFilter, setEmployeeDesignationFilter] = useState("");
  const [createForms, setCreateForms] = useState<Record<string, { 
    month: string; 
    year: string; 
    amount: string; 
    payableDays: string;
    basicSalary: string;
    hrAllowance: string;
    conveyanceAllowance: string;
    specialAllowance: string;
    otherAllowance: string;
    washingAllowance: string;
    pf: string;
    esi: string;
    pt: string;
    medicalInsurance: string;
    uniformDeduction: string;
    roomRent: string;
  }>>({});
  const [employeeSalaryDetails, setEmployeeSalaryDetails] = useState<Record<string, { basicSalary: number; hrAllowance: number; conveyanceAllowance: number; specialAllowance: number; otherAllowance: number; washingAllowance: number; pf: number; esi: number; pt: number; medicalInsurance: number; uniformDeduction: number; roomRent: number; totalEarnings: number; totalDeductions: number }>>({});
  const [employeeAttendance, setEmployeeAttendance] = useState<Record<string, { payableDays: number; loading: boolean }>>({});

  // Fetch Payroll Masters
  useEffect(() => {
    const fetchPayrollMasters = async () => {
      setMastersLoading(true);
      setMastersError(null);
      try {
        // Fetch payroll details for all employees (masters)
        const response = await fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/employees`);
        if (!response.ok) throw new Error("Failed to fetch employees");
        const employeesData = await response.json();
        const employees = employeesData.data || employeesData.employees || [];
        
        // Fetch payroll details for each employee
        const mastersPromises = employees.map(async (emp: any) => {
          try {
            const detailsRes = await fetch(
              `https://cafm.zenapi.co.in/api/salary-disbursement/employees/${emp.employeeId || emp._id}/payroll-details`
            );
            if (detailsRes.ok) {
              const details = await detailsRes.json();
              if (details && details.basicSalary !== undefined) {
                const basic = details.basicSalary || 0;
                const hra = details.hrAllowance || 0;
                const da = details.conveyanceAllowance || 0;
                const special = details.specialAllowance || 0;
                const other = details.otherAllowance || 0;
                const pf = details.pf || 0;
                const pt = details.pt || 0;
                const esi = details.esi || 0;
                const medical = details.medicalInsurance || 0;
                const uniform = details.uniformDeduction || 0;
                const roomRent = details.roomRent || 0;
                const washing = details.washingAllowance || 0;
                
                const gross = basic + hra + da + special + other + washing;
                const deductions = pf + pt + esi + medical + uniform + roomRent;
                const net = gross - deductions;
                
                return {
                  _id: details._id,
                  employeeId: emp.employeeId || emp._id,
                  employeeName: emp.fullName || emp.employeeName,
                  year: new Date().getFullYear().toString(),
                  basicSalary: basic,
                  hrAllowance: hra,
                  conveyanceAllowance: da,
                  specialAllowance: special,
                  otherAllowance: other,
                  pf,
                  pt,
                  esi,
                  medicalInsurance: medical,
                  uniformDeduction: uniform,
                  roomRent,
                  washingAllowance: washing,
                  grossSalary: gross,
                  netSalary: net,
                  project: emp.projectName,
                  designation: emp.designation,
                } as PayrollMaster;
              }
            }
            return null;
          } catch {
            return null;
          }
        });
        
        const masters = (await Promise.all(mastersPromises)).filter((m): m is PayrollMaster => m !== null);
        setPayrollMasters(masters);
        
        // Update project and designation options
        setProjectOptions([
          "All Projects",
          ...Array.from(new Set(masters.map((m) => m.project).filter(Boolean))) as string[],
        ]);
        setDesignationOptions([
          "All Designations",
          ...Array.from(new Set(masters.map((m) => m.designation).filter(Boolean))) as string[],
        ]);
      } catch (err) {
        setMastersError("Could not load payroll masters.");
        console.error("Error fetching masters:", err);
      } finally {
        setMastersLoading(false);
      }
    };
    
    fetchPayrollMasters();
  }, []);

  // Fetch Monthly Payroll Records (for tracking generated payslips)
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: recordsPerPage.toString(),
    });
    fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payroll-details?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch payroll records");
        return res.json();
      })
      .then((res) => {
        const data = res.data || res || [];
        setPayrollData(data as PayrollRecord[]);
        setTotalRecords(res.pagination?.totalRecords || res.totalRecords || data.length);
        setTotalPages(res.pagination?.totalPages || res.totalPages || 1);
        
        // Track generated payslips
        const generated = new Set<string>();
        data.forEach((p: PayrollRecord) => {
          if (p.employeeId && p.month && p.year) {
            generated.add(`${p.employeeId}-${p.month}-${p.year}`);
          }
        });
        setGeneratedPayslips(generated);
        
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load payroll records.");
        setLoading(false);
      });
  }, [currentPage, recordsPerPage]);

  // Filter Payroll Masters
  const filteredMasters = useMemo(() => {
    return payrollMasters.filter((master) => {
      const matchesSearch =
        search === "" ||
        (master.employeeName && master.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        master.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        master.year.includes(search);
      const matchesProject = projectFilter === "All Projects" || master.project === projectFilter;
      const matchesDesignation = designationFilter === "All Designations" || master.designation === designationFilter;
      return matchesSearch && matchesProject && matchesDesignation;
    });
  }, [payrollMasters, search, projectFilter, designationFilter]);

  const paginatedMasters = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    return filteredMasters.slice(start, end);
  }, [filteredMasters, currentPage, recordsPerPage]);

  // Filter Payroll Records
  const filteredPayroll = useMemo(() => {
    return payrollData.filter((pay) => {
      // Search filter (employee name)
      const matchesSearch =
        search === "" ||
        (pay.employeeName && pay.employeeName.toLowerCase().includes(search.toLowerCase())) ||
        (pay.employeeId && pay.employeeId.toLowerCase().includes(search.toLowerCase()));

      // Month filter
      let matchesMonth = true;
      if (monthFilter !== "All Months") {
        if (pay.month) {
          let monthIdx = 0;
          if (typeof pay.month === "string" && pay.month.includes("-")) {
            const idxVal = parseInt(pay.month.split("-")[1], 10);
            if (!isNaN(idxVal) && idxVal >= 1 && idxVal <= 12) monthIdx = idxVal;
          }
          const monthStr = monthOptions[monthIdx] || "";
          matchesMonth = monthStr === monthFilter;
        } else {
          matchesMonth = false;
        }
      }

      // Status filter
      const matchesStatus =
        statusFilter === "All" ||
        (pay.status && pay.status.toLowerCase() === statusFilter.toLowerCase());

      // Date range filter
      let matchesDateRange = true;
      if (fromDate || toDate) {
        if (pay.month && pay.year) {
          let monthIdx = 0;
          if (typeof pay.month === "string" && pay.month.includes("-")) {
            const idxVal = parseInt(pay.month.split("-")[1], 10);
            if (!isNaN(idxVal) && idxVal >= 1 && idxVal <= 12) monthIdx = idxVal;
          }
          const recordDate = new Date(Number(pay.year), monthIdx - 1, 1);
          
          if (fromDate) {
            const from = new Date(fromDate);
            if (recordDate < from) matchesDateRange = false;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setMonth(to.getMonth() + 1); // End of month
            if (recordDate >= to) matchesDateRange = false;
          }
        } else {
          matchesDateRange = false;
        }
      }

      // Project filter
      const matchesProject =
        projectFilter === "All Projects" ||
        (pay.project && pay.project === projectFilter);

      return matchesSearch && matchesMonth && matchesStatus && matchesDateRange && matchesProject;
    });
  }, [payrollData, search, monthFilter, statusFilter, fromDate, toDate, projectFilter]);

  const paginatedPayroll = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    return filteredPayroll.slice(start, end);
  }, [filteredPayroll, currentPage, recordsPerPage]);

  // Create Payroll Master
  const handleCreatePayrollMaster = async () => {
    if (!masterForm.employeeId || !masterForm.year || !masterForm.basicSalary) {
      setMasterCreateError("Please fill Employee ID, Year, and Basic Salary");
      return;
    }

    setMasterCreateLoading(true);
    setMasterCreateError(null);
    setMasterCreateSuccess(null);

    try {
      const basic = Number(masterForm.basicSalary) || 0;
      const hra = Number(masterForm.hrAllowance) || 0;
      const da = Number(masterForm.conveyanceAllowance) || 0;
      const special = Number(masterForm.specialAllowance) || 0;
      const other = Number(masterForm.otherAllowance) || 0;
      const pf = Number(masterForm.pf) || 0;
      const pt = Number(masterForm.pt) || 0;
      const esi = Number(masterForm.esi) || 0;
      const medical = Number(masterForm.medicalInsurance) || 0;
      const uniform = Number(masterForm.uniformDeduction) || 0;
      const roomRent = Number(masterForm.roomRent) || 0;
      const washing = Number(masterForm.washingAllowance) || 0;

      const gross = basic + hra + da + special + other + washing;
      const deductions = pf + pt + esi + medical + uniform + roomRent;
      const net = gross - deductions;

      // Prepare payload with all fields
      const payload = {
        employeeId: masterForm.employeeId,
        year: masterForm.year,
        // Salary Components
        basicSalary: basic,
        daVda: Number(masterForm.daVda) || 0,
        hrAllowance: hra,
        conveyanceAllowance: da,
        leaveTravelAllowance: Number(masterForm.leaveTravelAllowance) || 0,
        medicalAllowance: Number(masterForm.medicalAllowance) || 0,
        specialAllowance: special,
        otherAllowance: other,
        // Other Benefits
        washingAllowance: washing,
        leaveWithWages: Number(masterForm.leaveWithWages) || 0,
        bonus: Number(masterForm.bonus) || 0,
        nationalFestivalHolidays: Number(masterForm.nationalFestivalHolidays) || 0,
        wagesAdditionalHours: Number(masterForm.wagesAdditionalHours) || 0,
        relieverCharges: Number(masterForm.relieverCharges) || 0,
        // Employee Deductions
        employeePf: Number(masterForm.employeePf) || 0,
        employeeEsi: Number(masterForm.employeeEsi) || 0,
        pt: pt,
        uniformDeduction: uniform,
        medicalInsurance: medical,
        trainingCost: Number(masterForm.trainingCost) || 0,
        labourWelfareFundEmployee: Number(masterForm.labourWelfareFundEmployee) || 0,
        // Employer Deductions
        employerPf: Number(masterForm.employerPf) || 0,
        employerEsi: Number(masterForm.employerEsi) || 0,
        labourLicense: Number(masterForm.labourLicense) || 0,
        labourWelfareFundEmployer: Number(masterForm.labourWelfareFundEmployer) || 0,
        gratuity: Number(masterForm.gratuity) || 0,
        // Legacy fields
        pf: Number(masterForm.employeePf) || 0,
        esi: Number(masterForm.employeeEsi) || 0,
        roomRent,
        // Applicable flags
        basicSalaryApplicable: masterForm.basicSalaryApplicable,
        daVdaApplicable: masterForm.daVdaApplicable,
        hrAllowanceApplicable: masterForm.hrAllowanceApplicable,
        conveyanceAllowanceApplicable: masterForm.conveyanceAllowanceApplicable,
        leaveTravelAllowanceApplicable: masterForm.leaveTravelAllowanceApplicable,
        medicalAllowanceApplicable: masterForm.medicalAllowanceApplicable,
        specialAllowanceApplicable: masterForm.specialAllowanceApplicable,
        otherAllowanceApplicable: masterForm.otherAllowanceApplicable,
        washingAllowanceApplicable: masterForm.washingAllowanceApplicable,
        leaveWithWagesApplicable: masterForm.leaveWithWagesApplicable,
        bonusApplicable: masterForm.bonusApplicable,
        nationalFestivalHolidaysApplicable: masterForm.nationalFestivalHolidaysApplicable,
        wagesAdditionalHoursApplicable: masterForm.wagesAdditionalHoursApplicable,
        relieverChargesApplicable: masterForm.relieverChargesApplicable,
        employeePfApplicable: masterForm.employeePfApplicable,
        employeeEsiApplicable: masterForm.employeeEsiApplicable,
        ptApplicable: masterForm.ptApplicable,
        uniformDeductionApplicable: masterForm.uniformDeductionApplicable,
        medicalInsuranceApplicable: masterForm.medicalInsuranceApplicable,
        trainingCostApplicable: masterForm.trainingCostApplicable,
        labourWelfareFundEmployeeApplicable: masterForm.labourWelfareFundEmployeeApplicable,
        employerPfApplicable: masterForm.employerPfApplicable,
        employerEsiApplicable: masterForm.employerEsiApplicable,
        labourLicenseApplicable: masterForm.labourLicenseApplicable,
        labourWelfareFundEmployerApplicable: masterForm.labourWelfareFundEmployerApplicable,
        gratuityApplicable: masterForm.gratuityApplicable,
        // Fixed/Variable types
        basicSalaryType: masterForm.basicSalaryType,
        daVdaType: masterForm.daVdaType,
        hrAllowanceType: masterForm.hrAllowanceType,
        conveyanceAllowanceType: masterForm.conveyanceAllowanceType,
        leaveTravelAllowanceType: masterForm.leaveTravelAllowanceType,
        medicalAllowanceType: masterForm.medicalAllowanceType,
        specialAllowanceType: masterForm.specialAllowanceType,
        otherAllowanceType: masterForm.otherAllowanceType,
        washingAllowanceType: masterForm.washingAllowanceType,
        leaveWithWagesType: masterForm.leaveWithWagesType,
        bonusType: masterForm.bonusType,
        nationalFestivalHolidaysType: masterForm.nationalFestivalHolidaysType,
        wagesAdditionalHoursType: masterForm.wagesAdditionalHoursType,
        relieverChargesType: masterForm.relieverChargesType,
        employeePfType: masterForm.employeePfType,
        employeeEsiType: masterForm.employeeEsiType,
        ptType: masterForm.ptType,
        uniformDeductionType: masterForm.uniformDeductionType,
        medicalInsuranceType: masterForm.medicalInsuranceType,
        trainingCostType: masterForm.trainingCostType,
        labourWelfareFundEmployeeType: masterForm.labourWelfareFundEmployeeType,
        employerPfType: masterForm.employerPfType,
        employerEsiType: masterForm.employerEsiType,
        labourLicenseType: masterForm.labourLicenseType,
        labourWelfareFundEmployerType: masterForm.labourWelfareFundEmployerType,
        gratuityType: masterForm.gratuityType,
        // Percentage fields
        basicSalaryPercentage: masterForm.basicSalaryPercentage,
        daVdaPercentage: masterForm.daVdaPercentage,
        hrAllowancePercentage: masterForm.hrAllowancePercentage,
        conveyanceAllowancePercentage: masterForm.conveyanceAllowancePercentage,
        leaveTravelAllowancePercentage: masterForm.leaveTravelAllowancePercentage,
        medicalAllowancePercentage: masterForm.medicalAllowancePercentage,
        specialAllowancePercentage: masterForm.specialAllowancePercentage,
        otherAllowancePercentage: masterForm.otherAllowancePercentage,
        washingAllowancePercentage: masterForm.washingAllowancePercentage,
        leaveWithWagesPercentage: masterForm.leaveWithWagesPercentage,
        bonusPercentage: masterForm.bonusPercentage,
        nationalFestivalHolidaysPercentage: masterForm.nationalFestivalHolidaysPercentage,
        wagesAdditionalHoursPercentage: masterForm.wagesAdditionalHoursPercentage,
        relieverChargesPercentage: masterForm.relieverChargesPercentage,
        employeePfPercentage: masterForm.employeePfPercentage,
        employeeEsiPercentage: masterForm.employeeEsiPercentage,
        ptPercentage: masterForm.ptPercentage,
        uniformDeductionPercentage: masterForm.uniformDeductionPercentage,
        medicalInsurancePercentage: masterForm.medicalInsurancePercentage,
        trainingCostPercentage: masterForm.trainingCostPercentage,
        labourWelfareFundEmployeePercentage: masterForm.labourWelfareFundEmployeePercentage,
        employerPfPercentage: masterForm.employerPfPercentage,
        employerEsiPercentage: masterForm.employerEsiPercentage,
        labourLicensePercentage: masterForm.labourLicensePercentage,
        labourWelfareFundEmployerPercentage: masterForm.labourWelfareFundEmployerPercentage,
        gratuityPercentage: masterForm.gratuityPercentage,
      };

      const response = await fetch(
        `https://cafm.zenapi.co.in/api/salary-disbursement/employees/${masterForm.employeeId}/payroll-details`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payroll master");
      }

      setMasterCreateSuccess("Payroll master created successfully!");
      
      // Reset form
      setMasterForm({
        employeeId: "",
        year: new Date().getFullYear().toString(),
        // Salary Components
        basicSalary: "",
        daVda: "",
        hrAllowance: "",
        conveyanceAllowance: "",
        leaveTravelAllowance: "",
        medicalAllowance: "",
        specialAllowance: "",
        otherAllowance: "",
        // Other Benefits
        washingAllowance: "",
        leaveWithWages: "",
        bonus: "",
        nationalFestivalHolidays: "",
        wagesAdditionalHours: "",
        relieverCharges: "",
        // Employee Deductions
        employeePf: "",
        employeeEsi: "",
        pt: "",
        uniformDeduction: "",
        medicalInsurance: "",
        trainingCost: "",
        labourWelfareFundEmployee: "",
        // Employer Deductions
        employerPf: "",
        employerEsi: "",
        labourLicense: "",
        labourWelfareFundEmployer: "",
        gratuity: "",
        // Legacy fields
        pf: "",
        esi: "",
        roomRent: "",
        // Applicable checkboxes
        basicSalaryApplicable: false,
        daVdaApplicable: false,
        hrAllowanceApplicable: false,
        conveyanceAllowanceApplicable: false,
        leaveTravelAllowanceApplicable: false,
        medicalAllowanceApplicable: false,
        specialAllowanceApplicable: false,
        otherAllowanceApplicable: false,
        washingAllowanceApplicable: false,
        leaveWithWagesApplicable: false,
        bonusApplicable: false,
        nationalFestivalHolidaysApplicable: false,
        wagesAdditionalHoursApplicable: false,
        relieverChargesApplicable: false,
        employeePfApplicable: false,
        employeeEsiApplicable: false,
        ptApplicable: false,
        uniformDeductionApplicable: false,
        medicalInsuranceApplicable: false,
        trainingCostApplicable: false,
        labourWelfareFundEmployeeApplicable: false,
        employerPfApplicable: false,
        employerEsiApplicable: false,
        labourLicenseApplicable: false,
        labourWelfareFundEmployerApplicable: false,
        gratuityApplicable: false,
        // Fixed/Variable dropdowns
        basicSalaryType: "",
        daVdaType: "",
        hrAllowanceType: "",
        conveyanceAllowanceType: "",
        leaveTravelAllowanceType: "",
        medicalAllowanceType: "",
        specialAllowanceType: "",
        otherAllowanceType: "",
        washingAllowanceType: "",
        leaveWithWagesType: "",
        bonusType: "",
        nationalFestivalHolidaysType: "",
        wagesAdditionalHoursType: "",
        relieverChargesType: "",
        employeePfType: "",
        employeeEsiType: "",
        ptType: "",
        uniformDeductionType: "",
        medicalInsuranceType: "",
        trainingCostType: "",
        labourWelfareFundEmployeeType: "",
        employerPfType: "",
        employerEsiType: "",
        labourLicenseType: "",
        labourWelfareFundEmployerType: "",
        gratuityType: "",
        // Percentage/Calculation fields
        basicSalaryPercentage: "",
        daVdaPercentage: "",
        hrAllowancePercentage: "",
        conveyanceAllowancePercentage: "",
        leaveTravelAllowancePercentage: "",
        medicalAllowancePercentage: "",
        specialAllowancePercentage: "",
        otherAllowancePercentage: "",
        washingAllowancePercentage: "",
        leaveWithWagesPercentage: "",
        bonusPercentage: "",
        nationalFestivalHolidaysPercentage: "",
        wagesAdditionalHoursPercentage: "",
        relieverChargesPercentage: "",
        employeePfPercentage: "",
        employeeEsiPercentage: "",
        ptPercentage: "",
        uniformDeductionPercentage: "",
        medicalInsurancePercentage: "",
        trainingCostPercentage: "",
        labourWelfareFundEmployeePercentage: "",
        employerPfPercentage: "",
        employerEsiPercentage: "",
        labourLicensePercentage: "",
        labourWelfareFundEmployerPercentage: "",
        gratuityPercentage: "",
      });

      // Refresh masters list
      const refreshResponse = await fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/employees`);
      if (refreshResponse.ok) {
        const employeesData = await refreshResponse.json();
        const employees = employeesData.data || employeesData.employees || [];
        const mastersPromises = employees.map(async (emp: any) => {
          try {
            const detailsRes = await fetch(
              `https://cafm.zenapi.co.in/api/salary-disbursement/employees/${emp.employeeId || emp._id}/payroll-details`
            );
            if (detailsRes.ok) {
              const details = await detailsRes.json();
              if (details && details.basicSalary !== undefined) {
                const basic = details.basicSalary || 0;
                const hra = details.hrAllowance || 0;
                const da = details.conveyanceAllowance || 0;
                const special = details.specialAllowance || 0;
                const other = details.otherAllowance || 0;
                const pf = details.pf || 0;
                const pt = details.pt || 0;
                const esi = details.esi || 0;
                const medical = details.medicalInsurance || 0;
                const uniform = details.uniformDeduction || 0;
                const roomRent = details.roomRent || 0;
                const washing = details.washingAllowance || 0;
                
                const gross = basic + hra + da + special + other + washing;
                const deductions = pf + pt + esi + medical + uniform + roomRent;
                const net = gross - deductions;
                
                return {
                  _id: details._id,
                  employeeId: emp.employeeId || emp._id,
                  employeeName: emp.fullName || emp.employeeName,
                  year: new Date().getFullYear().toString(),
                  basicSalary: basic,
                  hrAllowance: hra,
                  conveyanceAllowance: da,
                  specialAllowance: special,
                  otherAllowance: other,
                  pf,
                  pt,
                  esi,
                  medicalInsurance: medical,
                  uniformDeduction: uniform,
                  roomRent,
                  washingAllowance: washing,
                  grossSalary: gross,
                  netSalary: net,
                  project: emp.projectName,
                  designation: emp.designation,
                } as PayrollMaster;
              }
            }
            return null;
          } catch {
            return null;
          }
        });
        const masters = (await Promise.all(mastersPromises)).filter((m): m is PayrollMaster => m !== null);
        setPayrollMasters(masters);
      }

      setTimeout(() => {
        setMasterCreateSuccess(null);
        setShowCreateMasterModal(false);
      }, 2000);
    } catch (err: any) {
      setMasterCreateError(err.message || "Failed to create payroll master");
    } finally {
      setMasterCreateLoading(false);
    }
  };

  // Handle Month Selection for Master
  const handleMasterMonthSelect = async (master: PayrollMaster, month: string, year: string) => {
    const key = master.employeeId;
    setSelectedMasterForMonth(prev => ({
      ...prev,
      [key]: { ...prev[key], month, year, loading: true }
    }));

    try {
      const monthIndex = monthOptionsForCreate.findIndex((m) => m === month) + 1;
      if (monthIndex === 0) return;

      // Fetch payable days from attendance
      const attendanceRes = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${master.employeeId}&month=${monthIndex}&year=${year}`
      );

      let payableDays = 0;
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        const attendanceRecords = attendanceData.attendance || [];
        const daysInMonth = new Date(Number(year), monthIndex, 0).getDate();

        // Fetch approved leaves
        try {
          const leaveRes = await fetch(`https://cafm.zenapi.co.in/api/leave/all`);
          const leaveDates = new Set<string>();
          
          if (leaveRes.ok) {
            const leaveData = await leaveRes.json();
            const approvedLeaves = (leaveData.leaves || []).filter((leave: any) => {
              if (!leave.startDate || !leave.employeeId) return false;
              const leaveMonth = new Date(leave.startDate).getMonth() + 1;
              const leaveYear = new Date(leave.startDate).getFullYear();
              return leave.employeeId === master.employeeId && 
                     leaveMonth === monthIndex && 
                     leaveYear === Number(year) && 
                     leave.status === "Approved";
            });

            approvedLeaves.forEach((leave: any) => {
              const start = new Date(leave.startDate);
              const end = new Date(leave.endDate);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                leaveDates.add(d.toISOString().split('T')[0]);
              }
            });
          }

          // Count payable days
          for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(Number(year), monthIndex - 1, i);
            const dayOfWeek = dateObj.getDay();
            const dateStr = dateObj.toISOString().split('T')[0];
            
            if (dayOfWeek === 0) continue; // Skip Sundays
            
            if (dayOfWeek === 6) {
              let saturdayCount = 0;
              for (let d = 1; d <= i; d++) {
                const tempDate = new Date(Number(year), monthIndex - 1, d);
                if (tempDate.getDay() === 6) saturdayCount++;
              }
              if (saturdayCount === 4) continue; // 4th Saturday
            }
            
            const isPresent = attendanceRecords.some((att: any) => {
              if (!att.date) return false;
              const attDate = new Date(att.date).toISOString().split('T')[0];
              return attDate === dateStr && (att.status === "Present" || att.status === "P");
            });
            
            if (isPresent || leaveDates.has(dateStr)) {
              payableDays++;
            }
          }
        } catch {
          payableDays = attendanceRecords.filter((att: any) => 
            att.status === "Present" || att.status === "P"
          ).length;
        }
      }

      // Calculate amount payable based on payable days
      const totalDaysInMonth = new Date(Number(year), monthIndex, 0).getDate();
      const workingDays = totalDaysInMonth - Math.floor(totalDaysInMonth / 7); // Approximate working days
      const dailyRate = master.grossSalary / workingDays;
      const amount = dailyRate * payableDays;

      setSelectedMasterForMonth(prev => ({
        ...prev,
        [key]: { month, year, payableDays, amount, loading: false }
      }));
    } catch (error) {
      console.error("Error fetching payable days:", error);
      setSelectedMasterForMonth(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: false }
      }));
    }
  };

  // Generate Payslip for Selected Month
  const handleGenerateMonthlyPayslip = async (master: PayrollMaster) => {
    const key = master.employeeId;
    const monthData = selectedMasterForMonth[key];
    if (!monthData || !monthData.month || !monthData.year) {
      setPayslipError("Please select a month first");
      return;
    }

    setPayslipLoading(true);
    setPayslipError(null);

    try {
      const monthIndex = monthOptionsForCreate.findIndex((m) => m === monthData.month) + 1;
      const monthStr = monthIndex < 10 ? `0${monthIndex}` : `${monthIndex}`;
      const monthValue = `${monthData.year}-${monthStr}`;

      // Calculate pro-rated salary components based on payable days
      const totalDaysInMonth = new Date(Number(monthData.year), monthIndex, 0).getDate();
      const workingDays = totalDaysInMonth - Math.floor(totalDaysInMonth / 7);
      const dailyRate = master.grossSalary / workingDays;
      const ratio = monthData.payableDays / workingDays;

      const basic = master.basicSalary * ratio;
      const hra = master.hrAllowance * ratio;
      const da = master.conveyanceAllowance * ratio;
      const special = master.specialAllowance * ratio;
      const other = master.otherAllowance * ratio;
      const washing = (master.washingAllowance || 0) * ratio;
      
      const totalEarnings = basic + hra + da + special + other + washing;
      
      // Deductions are usually fixed, but can be pro-rated if needed
      const pf = master.pf;
      const pt = master.pt;
      const esi = master.esi || 0;
      const medical = master.medicalInsurance || 0;
      const uniform = master.uniformDeduction || 0;
      const roomRent = master.roomRent || 0;
      
      const totalDeductions = pf + pt + esi + medical + uniform + roomRent;
      const netPay = totalEarnings - totalDeductions;

      // Create payroll record
      const projectName = master.project || "";
      let projectId: string | undefined;

      if (projectName) {
        try {
          const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
          if (projectsRes.ok) {
            const projectsData = await projectsRes.json();
            const project = Array.isArray(projectsData)
              ? projectsData.find((p: any) => p.projectName === projectName)
              : null;
            if (project && project._id) {
              projectId = project._id;
            }
          }
        } catch (error) {
          console.error("Error fetching project:", error);
        }
      }

      const payload: any = {
        employeeId: master.employeeId,
        month: monthValue,
        year: monthData.year,
        amount: netPay,
        payableDays: monthData.payableDays,
        status: "Pending",
        basicSalary: basic,
        hrAllowance: hra,
        conveyanceAllowance: da,
        specialAllowance: special,
        otherAllowance: other,
        washingAllowance: washing,
        pf,
        esi,
        pt,
        medicalInsurance: medical,
        uniformDeduction: uniform,
        roomRent,
        totalEarnings,
        totalDeductions,
        netPay,
      };

      if (projectId) {
        payload.projectId = projectId;
      }

      await createPayroll(payload);

      // Mark as generated
      setGeneratedPayslips(prev => new Set(prev).add(`${master.employeeId}-${monthValue}-${monthData.year}`));

      // Generate payslip data for display
      setPayslipData({
        employeeId: master.employeeId,
        employeeName: master.employeeName || "",
        designation: master.designation || "",
        project: master.project || "",
        month: monthData.month,
        year: monthData.year,
        basicSalary: basic,
        hrAllowance: hra,
        conveyanceAllowance: da,
        specialAllowance: special,
        otherAllowance: other,
        washingAllowance: washing,
        totalEarnings,
        pf,
        esi,
        pt,
        medicalInsurance: medical,
        uniformDeduction: uniform,
        roomRent,
        totalDeductions,
        netPay,
        payableDays: monthData.payableDays,
      });

      setSelectedPayslip({
        employeeId: master.employeeId,
        employeeName: master.employeeName,
        month: monthValue,
        year: monthData.year,
        amount: netPay,
        status: "Pending",
      });

      // Refresh payroll records
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
      });
      fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payrolls?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch payroll records");
          return res.json();
        })
        .then((res) => {
          const data = res.data || [];
          setPayrollData(data as PayrollRecord[]);
          const generated = new Set<string>();
          data.forEach((p: PayrollRecord) => {
            if (p.employeeId && p.month && p.year) {
              generated.add(`${p.employeeId}-${p.month}-${p.year}`);
            }
          });
          setGeneratedPayslips(generated);
        })
        .catch(() => {
          // Silent fail
        });
    } catch (err: any) {
      setPayslipError(err.message || "Failed to generate payslip");
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleGeneratePayslip = async (payroll: PayrollRecord) => {
    setSelectedPayslip(payroll);
    setPayslipLoading(true);
    setPayslipError(null);
    setPayslipData(null);

    try {
      let employeeId = payroll.employeeId || "";
      
      // If employeeId is not in payroll record, try to find it from KYC using employee name
      if (!employeeId && payroll.employeeName) {
        try {
          const kycSearchRes = await fetch(`https://cafm.zenapi.co.in/api/kyc`);
          const kycSearchData = await kycSearchRes.json();
          const matchingKyc = kycSearchData.kycForms?.find(
            (k: { personalDetails: { fullName: string; employeeId: string } }) =>
              k.personalDetails.fullName === payroll.employeeName
          );
          if (matchingKyc) {
            employeeId = matchingKyc.personalDetails.employeeId;
          }
        } catch (e) {
          console.error("Error searching for employee ID:", e);
        }
      }

      if (!employeeId) {
        throw new Error("Employee ID not found. Please ensure the payroll record has employee information.");
      }

      // Fetch employee details from KYC
      const kycRes = await fetch(`https://cafm.zenapi.co.in/api/kyc?employeeId=${employeeId}`);
      const kycData = await kycRes.json();
      const kycForm = kycData.kycForms?.[0];
      const personalDetails = kycForm?.personalDetails || {};

      // Use salary components from the created payroll record
      const basicSalary = payroll.basicSalary || 0;
      const hrAllowance = payroll.hrAllowance || 0;
      const conveyanceAllowance = payroll.conveyanceAllowance || 0; // DA
      const specialAllowance = payroll.specialAllowance || 0;
      const otherAllowance = payroll.otherAllowance || 0;
      const washingAllowance = payroll.washingAllowance || 0;
      const pf = payroll.pf || 0;
      const esi = payroll.esi || 0;
      const pt = payroll.pt || 0;
      const medicalInsurance = payroll.medicalInsurance || 0;
      const uniformDeduction = payroll.uniformDeduction || 0;
      const roomRent = payroll.roomRent || 0;
      
      // Calculate totals from payroll record
      const totalEarnings = payroll.totalEarnings || (basicSalary + hrAllowance + conveyanceAllowance + specialAllowance + otherAllowance + washingAllowance);
      const totalDeductions = payroll.totalDeductions || (pf + esi + pt + medicalInsurance + uniformDeduction + roomRent);
      const netPay = payroll.netPay || (totalEarnings - totalDeductions);

      // Fetch payable days from attendance (including weekoffs, holidays, and leaves)
      let payableDays = payroll.payableDays || 0;
      if (payroll.month && payroll.year) {
        try {
          const monthParts = payroll.month.split("-");
          if (monthParts.length === 2) {
            const monthIndex = parseInt(monthParts[1], 10);
            const year = parseInt(payroll.year, 10);
            
            // Fetch attendance data
            const attendanceRes = await fetch(
              `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${monthIndex}&year=${year}`
            );
            
            if (attendanceRes.ok) {
              const attendanceData = await attendanceRes.json();
              const attendanceRecords = attendanceData.attendance || [];
              const daysInMonth = new Date(year, monthIndex, 0).getDate();
              
              // Fetch approved leaves
              const leaveRes = await fetch(`https://cafm.zenapi.co.in/api/leave/all`);
              const leaveDates = new Set<string>();
              
              if (leaveRes.ok) {
                const leaveData = await leaveRes.json();
                const approvedLeaves = (leaveData.leaves || []).filter((leave: any) => {
                  if (!leave.startDate || !leave.employeeId) return false;
                  const leaveMonth = new Date(leave.startDate).getMonth() + 1;
                  const leaveYear = new Date(leave.startDate).getFullYear();
                  return leave.employeeId === employeeId && 
                         leaveMonth === monthIndex && 
                         leaveYear === year && 
                         leave.status === "Approved";
                });

                approvedLeaves.forEach((leave: any) => {
                  const start = new Date(leave.startDate);
                  const end = new Date(leave.endDate);
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    leaveDates.add(d.toISOString().split('T')[0]);
                  }
                });
              }
              
              // Count payable days (Present + Approved Leaves, excluding Sundays and 4th Saturday)
              let presentDays = 0;
              for (let i = 1; i <= daysInMonth; i++) {
                const dateObj = new Date(year, monthIndex - 1, i);
                const dayOfWeek = dateObj.getDay();
                const dateStr = dateObj.toISOString().split('T')[0];
                
                // Skip Sundays (weekoff)
                if (dayOfWeek === 0) continue;
                
                // Check if it's a holiday (4th Saturday)
                if (dayOfWeek === 6) {
                  let saturdayCount = 0;
                  for (let d = 1; d <= i; d++) {
                    const tempDate = new Date(year, monthIndex - 1, d);
                    if (tempDate.getDay() === 6) saturdayCount++;
                  }
                  if (saturdayCount === 4) continue; // 4th Saturday is holiday
                }
                
                // Check if present or on approved leave
                const isPresent = attendanceRecords.some((att: any) => {
                  if (!att.date) return false;
                  const attDate = new Date(att.date).toISOString().split('T')[0];
                  return attDate === dateStr && (att.status === "Present" || att.status === "P");
                });
                
                if (isPresent || leaveDates.has(dateStr)) {
                  presentDays++;
                }
              }
              
              payableDays = presentDays;
            }
          }
        } catch (error) {
          console.error("Error fetching payable days:", error);
          // Use payableDays from payroll record if fetch fails
        }
      }

      setPayslipData({
        employeeId,
        employeeName: payroll.employeeName || personalDetails.fullName || "",
        designation: payroll.designation || personalDetails.designation || "",
        project: payroll.project || personalDetails.projectName || "",
        month: payroll.month || "",
        year: payroll.year || "",
        basicSalary,
        hrAllowance,
        conveyanceAllowance,
        specialAllowance,
        otherAllowance,
        washingAllowance,
        totalEarnings,
        pf,
        esi,
        pt,
        medicalInsurance,
        uniformDeduction,
        roomRent,
        totalDeductions,
        netPay,
        payableDays,
        employeeImage: personalDetails.employeeImage,
      });
    } catch (error) {
      setPayslipError(error instanceof Error ? error.message : "Failed to load payslip data");
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleDownloadPayslip = async () => {
    if (typeof window !== "undefined" && payslipData) {
      const input = document.querySelector(".print-payslip-area") as HTMLElement;
      if (input) {
        try {
          input.classList.add("generating-pdf");
          const imgData = await domtoimage.toPng(input, {
            quality: 0.95,
            style: {
              "border-collapse": "collapse",
            },
          });
          const pdf = new jsPDF("p", "mm", "a4");
          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (input.offsetHeight * imgWidth) / input.offsetWidth;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position + pageHeight, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(`payslip-${payslipData.employeeId}-${payslipData.month}.pdf`);
          input.classList.remove("generating-pdf");
        } catch (error) {
          console.error("Error generating PDF:", error);
          alert("Failed to generate PDF. Please try again.");
        }
      }
    }
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  // Load KYC records when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      getAllKYCRecords().then((res) => {
        setKycRecords(res.kycForms || []);
      }).catch(() => {
        setCreateError("Failed to load employees");
      });
    }
  }, [showCreateModal]);

  // Load KYC records when master modal opens
  useEffect(() => {
    if (showCreateMasterModal) {
      setMasterModalLoading(true);
      getAllKYCRecords().then((res) => {
        setMasterModalKycRecords(res.kycForms || []);
        setMasterModalLoading(false);
      }).catch(() => {
        setMasterCreateError("Failed to load employees");
        setMasterModalLoading(false);
      });
    } else {
      // Reset when modal closes
      setMasterModalProjectFilter("");
      setMasterModalKycRecords([]);
      setMasterModalEmployeeSearch("");
      setMasterModalEmployeeConfirmed(false);
    }
  }, [showCreateMasterModal]);

  // Get selected employee details
  const selectedEmployeeDetails = useMemo(() => {
    if (!masterForm.employeeId) return null;
    return masterModalKycRecords.find(emp => emp.personalDetails.employeeId === masterForm.employeeId);
  }, [masterForm.employeeId, masterModalKycRecords]);

  // Filter employees for master modal by project and search
  const masterModalFilteredEmployees = useMemo(() => {
    if (!masterModalProjectFilter) return [];
    return masterModalKycRecords.filter((k) => {
      const matchesProject = k.personalDetails.projectName === masterModalProjectFilter;
      const matchesSearch = !masterModalEmployeeSearch || 
        k.personalDetails.fullName.toLowerCase().includes(masterModalEmployeeSearch.toLowerCase()) ||
        k.personalDetails.employeeId.toLowerCase().includes(masterModalEmployeeSearch.toLowerCase()) ||
        k.personalDetails.designation.toLowerCase().includes(masterModalEmployeeSearch.toLowerCase());
      return matchesProject && matchesSearch;
    });
  }, [masterModalKycRecords, masterModalProjectFilter, masterModalEmployeeSearch]);

  // Get unique project options for master modal
  const masterModalProjectOptions = useMemo(() => {
    return Array.from(new Set(masterModalKycRecords.map((k) => k.personalDetails.projectName).filter(Boolean)));
  }, [masterModalKycRecords]);

  const filteredEmployees = useMemo(() => {
    return kycRecords.filter((k) =>
      (employeeProjectFilter ? k.personalDetails.projectName === employeeProjectFilter : true) &&
      (employeeDesignationFilter ? k.personalDetails.designation === employeeDesignationFilter : true) &&
      (k.personalDetails.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        k.personalDetails.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()))
    );
  }, [kycRecords, employeeSearch, employeeProjectFilter, employeeDesignationFilter]);

  const handleFormChange = async (employeeId: string, field: string, value: string) => {
    const currentForm = createForms[employeeId] || {
      month: "", year: "", amount: "", payableDays: "",
      basicSalary: "", hrAllowance: "", conveyanceAllowance: "", specialAllowance: "",
      otherAllowance: "", washingAllowance: "", pf: "", esi: "", pt: "",
      medicalInsurance: "", uniformDeduction: "", roomRent: ""
    };
    
    const updatedForm = {
      ...currentForm,
      [field]: value,
    };
    
    setCreateForms(prev => ({
      ...prev,
      [employeeId]: updatedForm,
    }));

    // Auto-fetch payable days and calculate amount when month and year are selected
    if ((field === "month" || field === "year") && updatedForm.month && updatedForm.year) {
      // Set loading state
      setEmployeeAttendance(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], loading: true }
      }));

      // First fetch payable days, then calculate amount
      const payableDays = await fetchPayableDays(employeeId, updatedForm.month, updatedForm.year);
      
      // Calculate amount after payable days are fetched
      if (payableDays !== null) {
        await calculateAmount(employeeId, updatedForm.month, updatedForm.year, payableDays);
      }

      // Clear loading state
      setEmployeeAttendance(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], loading: false }
      }));
    }

    // Recalculate amount when salary components change
    const salaryFields = ["basicSalary", "hrAllowance", "conveyanceAllowance", "specialAllowance", 
                          "otherAllowance", "washingAllowance", "pf", "esi", "pt", 
                          "medicalInsurance", "uniformDeduction", "roomRent"];
    if (salaryFields.includes(field) && updatedForm.month && updatedForm.year) {
      const payableDays = Number(updatedForm.payableDays) || 0;
      if (payableDays > 0) {
        await calculateAmount(employeeId, updatedForm.month, updatedForm.year, payableDays);
      }
    }
  };

  const fetchPayableDays = async (employeeId: string, month: string, year: string): Promise<number | null> => {
    try {
      const monthIndex = monthOptionsForCreate.findIndex((m) => m === month) + 1;
      if (monthIndex === 0) return null;
      
      // Fetch attendance data
      const attendanceRes = await fetch(
        `https://cafm.zenapi.co.in/api/attendance/report/monthly/employee?employeeId=${employeeId}&month=${monthIndex}&year=${year}`
      );
      
      if (!attendanceRes.ok) {
        console.error("Failed to fetch attendance");
        return null;
      }

      const attendanceData = await attendanceRes.json();
      const attendanceRecords = attendanceData.attendance || [];
      
      // Count present days
      let presentDays = 0;
      const daysInMonth = new Date(Number(year), monthIndex, 0).getDate();
      
      // Check for leaves
      try {
        const leaveRes = await fetch(`https://cafm.zenapi.co.in/api/leave/all`);
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          const approvedLeaves = (leaveData.leaves || []).filter((leave: any) => {
            if (!leave.startDate || !leave.employeeId) return false;
            const leaveMonth = new Date(leave.startDate).getMonth() + 1;
            const leaveYear = new Date(leave.startDate).getFullYear();
            return leave.employeeId === employeeId && 
                   leaveMonth === monthIndex && 
                   leaveYear === Number(year) && 
                   leave.status === "Approved";
          });

          // Create a set of leave dates
          const leaveDates = new Set<string>();
          approvedLeaves.forEach((leave: any) => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              leaveDates.add(d.toISOString().split('T')[0]);
            }
          });

          // Count payable days (present + approved leaves)
          for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(Number(year), monthIndex - 1, i);
            const dayOfWeek = dateObj.getDay();
            const dateStr = dateObj.toISOString().split('T')[0];
            
            // Skip Sundays
            if (dayOfWeek === 0) continue;
            
            // Check if it's a holiday (4th Saturday)
            if (dayOfWeek === 6) {
              let saturdayCount = 0;
              for (let d = 1; d <= i; d++) {
                const tempDate = new Date(Number(year), monthIndex - 1, d);
                if (tempDate.getDay() === 6) saturdayCount++;
              }
              if (saturdayCount === 4) continue; // 4th Saturday is holiday
            }
            
            // Check if present or on approved leave
            const isPresent = attendanceRecords.some((att: any) => {
              if (!att.date) return false;
              const attDate = new Date(att.date).toISOString().split('T')[0];
              return attDate === dateStr && (att.status === "Present" || att.status === "P");
            });
            
            if (isPresent || leaveDates.has(dateStr)) {
              presentDays++;
            }
          }
        } else {
          // Fallback: count present days from attendance only
          presentDays = attendanceRecords.filter((att: any) => 
            att.status === "Present" || att.status === "P"
          ).length;
        }
      } catch (leaveError) {
        // Fallback: count present days from attendance only
        presentDays = attendanceRecords.filter((att: any) => 
          att.status === "Present" || att.status === "P"
        ).length;
      }

      // Update form with payable days
      setCreateForms(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          payableDays: presentDays.toString(),
        }
      }));

      // Update attendance state
      setEmployeeAttendance(prev => ({
        ...prev,
        [employeeId]: { payableDays: presentDays, loading: false }
      }));

      return presentDays;
    } catch (error) {
      console.error("Error fetching payable days:", error);
      setEmployeeAttendance(prev => ({
        ...prev,
        [employeeId]: { payableDays: 0, loading: false }
      }));
      return null;
    }
  };

  const calculateAmount = async (employeeId: string, month: string, year: string, payableDays: number) => {
    try {
      const monthIndex = monthOptionsForCreate.findIndex((m) => m === month) + 1;
      if (monthIndex === 0) return;

      // Fetch payroll details
      const payrollDetailsRes = await fetch(
        `https://cafm.zenapi.co.in/api/salary-disbursement/employees/${employeeId}/payroll-details`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId }),
        }
      );

      if (!payrollDetailsRes.ok) {
        console.error("Failed to fetch payroll details");
        return;
      }

      const payrollData = await payrollDetailsRes.json();
      const details = payrollData.data || {};
      
      const basicSalary = details.basicSalary || 0;
      const hrAllowance = details.hrAllowance || 0; // HRA (House Rent Allowance)
      const conveyanceAllowance = details.conveyanceAllowance || 0; // DA (Dearness Allowance)
      const specialAllowance = details.specialAllowance || 0;
      const otherAllowance = details.otherAllowance || 0;
      const washingAllowance = details.washingAllowance || 0;
      
      // Deductions
      const pf = details.pf || 0;
      const esi = details.esi || 0;
      const pt = details.pt || 0;
      const medicalInsurance = details.medicalInsurance || 0;
      const uniformDeduction = details.uniformDeduction || 0;
      const roomRent = details.roomRent || 0;
      
      // Calculate total earnings: Basic + HRA + DA (Conveyance) + Special + Other + Washing
      const totalEarnings = basicSalary + hrAllowance + conveyanceAllowance + specialAllowance + otherAllowance + washingAllowance;
      
      // Calculate total deductions
      const totalDeductions = pf + esi + pt + medicalInsurance + uniformDeduction + roomRent;
      
      // Get total working days in the month (excluding Sundays and 4th Saturday)
      const daysInMonth = new Date(Number(year), monthIndex, 0).getDate();
      let totalWorkingDays = 0;
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(Number(year), monthIndex - 1, i);
        const dayOfWeek = dateObj.getDay();
        
        // Skip Sundays
        if (dayOfWeek === 0) continue;
        
        // Check if it's a holiday (4th Saturday)
        if (dayOfWeek === 6) {
          let saturdayCount = 0;
          for (let d = 1; d <= i; d++) {
            const tempDate = new Date(Number(year), monthIndex - 1, d);
            if (tempDate.getDay() === 6) saturdayCount++;
          }
          if (saturdayCount === 4) continue; // 4th Saturday is holiday
        }
        
        totalWorkingDays++;
      }
      
      // Calculate amount based on payable days
      // Formula: (Total Earnings / Total Working Days) * Payable Days
      const calculatedAmount = totalWorkingDays > 0 && payableDays > 0
        ? Math.round((totalEarnings / totalWorkingDays) * payableDays)
        : totalEarnings;

      // Store salary details for reference (all components)
      setEmployeeSalaryDetails(prev => ({
        ...prev,
        [employeeId]: {
          basicSalary,
          hrAllowance,
          conveyanceAllowance,
          specialAllowance,
          otherAllowance,
          washingAllowance,
          pf,
          esi,
          pt,
          medicalInsurance,
          uniformDeduction,
          roomRent,
          totalEarnings,
          totalDeductions,
        }
      }));

      // Update form with salary components if they were fetched from API
      const currentForm = createForms[employeeId] || {
        month: "", year: "", amount: "", payableDays: "",
        basicSalary: "", hrAllowance: "", conveyanceAllowance: "", specialAllowance: "",
        otherAllowance: "", washingAllowance: "", pf: "", esi: "", pt: "",
        medicalInsurance: "", uniformDeduction: "", roomRent: ""
      };
      
      if (!currentForm.basicSalary) {
        setCreateForms(prev => ({
          ...prev,
          [employeeId]: {
            ...currentForm,
            basicSalary: basicSalary.toString(),
            hrAllowance: hrAllowance.toString(),
            conveyanceAllowance: conveyanceAllowance.toString(),
            specialAllowance: specialAllowance.toString(),
            otherAllowance: otherAllowance.toString(),
            washingAllowance: washingAllowance.toString(),
            pf: pf.toString(),
            esi: esi.toString(),
            pt: pt.toString(),
            medicalInsurance: medicalInsurance.toString(),
            uniformDeduction: uniformDeduction.toString(),
            roomRent: roomRent.toString(),
          }
        }));
      }

      // Update form with calculated amount
      setCreateForms(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          amount: calculatedAmount.toString(),
        }
      }));
    } catch (error) {
      console.error("Error calculating amount:", error);
    }
  };

  const handleCreatePayroll = async (employeeId: string, employeeName: string) => {
    const form = createForms[employeeId];
    if (!form || !form.month || !form.year || !form.amount) {
      setCreateError(`Please fill all required fields for ${employeeName}`);
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      // Find the employee's KYC record to get project name and KYC _id
      const employeeKyc = kycRecords.find(
        (k) => k.personalDetails.employeeId === employeeId
      );

      if (!employeeKyc) {
        setCreateError(`Employee KYC record not found for ${employeeName}`);
        setCreateLoading(false);
        return;
      }

      const projectName = employeeKyc.personalDetails.projectName;
      let projectId: string | undefined;

      // Fetch projectId from projects API
      if (projectName) {
        try {
          const projectsRes = await fetch("https://cafm.zenapi.co.in/api/project/projects");
          if (projectsRes.ok) {
            const projectsData = await projectsRes.json();
            const project = Array.isArray(projectsData)
              ? projectsData.find((p: any) => p.projectName === projectName)
              : null;
            if (project && project._id) {
              projectId = project._id;
            }
          }
        } catch (error) {
          console.error("Error fetching project:", error);
          // Continue without projectId if fetch fails
        }
      }

      const monthIndex = monthOptionsForCreate.findIndex((m) => m === form.month) + 1;
      const monthStr = monthIndex < 10 ? `0${monthIndex}` : `${monthIndex}`;
      const monthValue = form.year && form.month ? `${form.year}-${monthStr}` : "";
      
      // Get salary details from form (master values) or from stored details
      const basicSalary = Number(form.basicSalary) || 0;
      const hrAllowance = Number(form.hrAllowance) || 0;
      const conveyanceAllowance = Number(form.conveyanceAllowance) || 0;
      const specialAllowance = Number(form.specialAllowance) || 0;
      const otherAllowance = Number(form.otherAllowance) || 0;
      const washingAllowance = Number(form.washingAllowance) || 0;
      const pf = Number(form.pf) || 0;
      const esi = Number(form.esi) || 0;
      const pt = Number(form.pt) || 0;
      const medicalInsurance = Number(form.medicalInsurance) || 0;
      const uniformDeduction = Number(form.uniformDeduction) || 0;
      const roomRent = Number(form.roomRent) || 0;
      
      // Calculate totals
      const totalEarnings = basicSalary + hrAllowance + conveyanceAllowance + specialAllowance + otherAllowance + washingAllowance;
      const totalDeductions = pf + esi + pt + medicalInsurance + uniformDeduction + roomRent;
      const netPay = totalEarnings - totalDeductions;
      
      // Use KYC _id (ObjectId) for employeeId as the API expects ObjectId
      const payload: any = {
        employeeId: employeeKyc._id || employeeId, // Use KYC ObjectId if available
        month: monthValue,
        year: form.year,
        amount: Number(form.amount),
        payableDays: Number(form.payableDays) || 0,
        status: "Pending",
        // Include all salary components
        basicSalary,
        hrAllowance,
        conveyanceAllowance,
        specialAllowance,
        otherAllowance,
        washingAllowance,
        pf,
        esi,
        pt,
        medicalInsurance,
        uniformDeduction,
        roomRent,
        totalEarnings,
        totalDeductions,
        netPay,
      };

      // Add projectId if found (required field)
      if (projectId) {
        payload.projectId = projectId;
      } else {
        // If projectId not found, try to find it by project name or set error
        setCreateError(`Project ID not found for project: ${projectName}. Please ensure the project exists.`);
        setCreateLoading(false);
        return;
      }
      
      await createPayroll(payload);
      setCreateSuccess(`Payroll created successfully for ${employeeName}!`);
      
      // Remove the form data for this employee
      setCreateForms(prev => {
        const newForms = { ...prev };
        delete newForms[employeeId];
        return newForms;
      });
      
      // Refresh payroll data
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
      });
      fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payrolls?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch payroll records");
          return res.json();
        })
        .then((res) => {
          const data = res.data || [];
          setPayrollData(data as PayrollRecord[]);
          setTotalRecords(res.pagination?.totalRecords || data.length);
          setTotalPages(res.pagination?.totalPages || 1);
        })
        .catch(() => {
          // Silent fail for refresh
        });

      setTimeout(() => {
        setCreateSuccess(null);
      }, 3000);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response === "object" &&
        (err as { response?: { data?: { message?: string } } }).response !== null &&
        "data" in ((err as { response?: { data?: { message?: string } } }).response ?? {})
      ) {
        setCreateError(
          ((err as { response?: { data?: { message?: string } } }).response?.data?.message) ||
            "Failed to create payroll record."
        );
      } else {
        setCreateError("Failed to create payroll record.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateForms({});
    setCreateError(null);
    setCreateSuccess(null);
    setEmployeeSearch("");
    setEmployeeProjectFilter("");
    setEmployeeDesignationFilter("");
  };

  const employeeProjectOptions = useMemo(() => {
    return Array.from(new Set(kycRecords.map((k) => k.personalDetails.projectName).filter(Boolean)));
  }, [kycRecords]);

  const employeeDesignationOptions = useMemo(() => {
    return Array.from(new Set(kycRecords.map((k) => k.personalDetails.designation).filter(Boolean)));
  }, [kycRecords]);

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}>
        {/* Filters and Search */}
        <div className="sticky top-[64px] z-30 backdrop-blur-sm px-4 py-2 mb-3 md:mb-4">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Project Dropdown */}
            <div className="flex-1 min-w-[180px] max-w-xs">
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {projectOptions.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>
            {/* Month Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            {/* Designation Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={(e) => {
                  setDesignationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {designationOptions.map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>
            </div>
            {/* Status Dropdown */}
            <div className="relative w-44 min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search employee, month, year, amount..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="From Date"
              />
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
                title="To Date"
              />
              <button
                onClick={() => setShowCreateMasterModal(!showCreateMasterModal)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
                  theme === 'dark' 
                    ? 'bg-green-700 text-white hover:bg-green-800 border border-green-900' 
                    : 'bg-green-600 text-white hover:bg-green-700 border border-green-200'
                }`}
                title="Create Payroll Master"
              >
                <FaPlus className="w-4 h-4" />
                {showCreateMasterModal ? 'Hide Create Payroll Master' : 'Create Payroll Master'}
              </button>
              <button
                className={`px-3 py-2 rounded-lg font-semibold border text-sm ${theme === 'dark' ? 'bg-blue-700 text-white hover:bg-blue-800 border-blue-900' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-200'}`}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: recordsPerPage.toString(),
                  });
                  fetch(`https://cafm.zenapi.co.in/api/salary-disbursement/payrolls?${params}`)
                    .then((res) => {
                      if (!res.ok) throw new Error("Failed to fetch payroll records");
                      return res.json();
                    })
                    .then((res) => {
                      const data = res.data || [];
                      setPayrollData(data as PayrollRecord[]);
                      setTotalRecords(res.pagination?.totalRecords || data.length);
                      setTotalPages(res.pagination?.totalPages || 1);
                      setLoading(false);
                    })
                    .catch(() => {
                      setError("Could not load payroll records.");
                      setLoading(false);
                    });
                }}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* Table - Payroll Masters */}
        <div className={`flex-1 overflow-auto px-3 md:px-4 pb-4`}>        
          <div className={`overflow-auto rounded-none border ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
            {mastersLoading ? (
              <div className="py-12 text-center text-lg font-semibold">Loading payroll masters...</div>
            ) : mastersError ? (
              <div className="py-12 text-center text-red-500 font-semibold">{mastersError}</div>
            ) : (
              <>
              <table className="w-full text-sm table-auto border-separate" style={{ borderSpacing: 0 }}>
                <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
                  <tr>
                    <th className={`px-2 py-2 text-left font-bold uppercase sticky left-0 z-20 whitespace-nowrap border ${theme === "dark" ? "text-blue-200 bg-blue-900 border-blue-800" : "text-blue-700 bg-blue-50 border-blue-200"}`}>#</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Employee ID</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Year</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Basic</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>HRA</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>DA</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Special</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Other</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>PF</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>PT</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Gross</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Net</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Select Month</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Payable Days</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Amount</th>
                    <th className={`px-2 py-2 text-left font-bold uppercase whitespace-nowrap w-24 border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-700 border-blue-200"}`}>Generate</th>
                  </tr>
                  {/* Inline header filters */}
                  <tr className={theme === "dark" ? "bg-gray-800/40" : "bg-white"}>
                    <th className="px-2 py-1 sticky left-0 z-20"></th>
                    <th className="px-2 py-1">
                      <input 
                        value={search} 
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
                        placeholder="Filter Employee" 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`} 
                      />
                    </th>
                    <th className="px-2 py-1">
                      <select 
                        value={monthFilter} 
                        onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        {monthOptions.map(month => <option key={month} value={month}>{month}</option>)}
                      </select>
                    </th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1">
                      <select 
                        value={statusFilter} 
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
                        className={`w-full border rounded px-2 py-1 ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      >
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </th>
                    <th className={`px-2 py-1 border ${theme === "dark" ? "border-blue-800" : "border-blue-200"}`}></th>
                  </tr>
                </thead>
                <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
                  {paginatedPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={`px-4 py-12 text-center border ${theme === "dark" ? "text-gray-400 border-blue-800" : "text-gray-500 border-blue-200"}`}>No payroll records found</td>
                    </tr>
                  ) : paginatedPayroll.map((pay: PayrollRecord, idx: number) => {
                    let monthIdx = 0;
                    if (typeof pay.month === "string" && pay.month.includes("-")) {
                      const idxVal = parseInt(pay.month.split("-")[1], 10);
                      if (!isNaN(idxVal) && idxVal >= 1 && idxVal <= 12) monthIdx = idxVal;
                    }
                    const monthStr = monthOptions[monthIdx] || "";
                    return (
                      <tr key={pay._id || idx} className={`${theme === "dark" ? "hover:bg-blue-900" : "hover:bg-blue-50"} transition even:bg-gray-50 dark:even:bg-gray-900`}>
                        <td className={`px-2 py-1 sticky left-0 z-10 font-mono text-[10px] border ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border-blue-800' : 'bg-white text-gray-600 border-blue-200'}`}>{idx + 1}</td>
                        <td className={`px-2 py-1 font-semibold whitespace-nowrap border ${theme === "dark" ? "text-blue-200 border-blue-800" : "text-blue-800 border-blue-200"}`}><div className="truncate" title={pay.employeeName || "-"}>{pay.employeeName || "-"}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-blue-300 border-blue-800' : 'text-blue-600 border-blue-200'}`}><div className="truncate" title={monthStr}>{monthStr}</div></td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>{pay.year || "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>₹{typeof pay.basicSalary === "number" ? pay.basicSalary.toLocaleString() : "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>₹{typeof pay.hrAllowance === "number" ? pay.hrAllowance.toLocaleString() : "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-gray-300 border-blue-800' : 'text-gray-700 border-blue-200'}`}>₹{typeof pay.conveyanceAllowance === "number" ? pay.conveyanceAllowance.toLocaleString() : "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-red-300 border-blue-800' : 'text-red-700 border-blue-200'}`}>₹{typeof pay.pf === "number" ? pay.pf.toLocaleString() : "-"}</td>
                        <td className={`px-2 py-1 border ${theme === 'dark' ? 'text-red-300 border-blue-800' : 'text-red-700 border-blue-200'}`}>₹{typeof pay.esi === "number" ? pay.esi.toLocaleString() : "-"}</td>
                        <td className={`px-2 py-1 font-semibold border ${theme === 'dark' ? 'text-green-300 border-blue-800' : 'text-green-700 border-blue-200'}`}>₹{typeof pay.netPay === "number" ? pay.netPay.toLocaleString() : (typeof pay.amount === "number" ? pay.amount.toLocaleString() : "-")}</td>
                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
                            pay.status === 'Paid' 
                              ? theme === 'dark' ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                              : theme === 'dark' ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {pay.status || "N/A"}
                          </span>
                        </td>
                        <td className={`px-2 py-1 text-center border ${theme === 'dark' ? 'border-blue-800' : 'border-blue-200'}`}>
                          <button
                            onClick={() => handleGeneratePayslip(pay)}
                            className={`px-2 py-1 rounded text-xs font-semibold transition ${
                              theme === 'dark'
                                ? 'bg-green-800 text-green-200 hover:bg-green-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            title="Generate Payslip"
                          >
                            <FaFileInvoiceDollar className="inline w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-6 py-4 border-t ${theme === "dark" ? "border-blue-900" : "border-blue-100"}`}>
            <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 transition-colors ${theme === "dark"
                  ? "text-gray-400 hover:text-blue-300 disabled:text-gray-700"
                  : "text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                  } disabled:cursor-not-allowed`}
              >
                <FaChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                      ? theme === "dark"
                        ? "bg-blue-700 text-white"
                        : "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 transition-colors ${theme === "dark"
                  ? "text-gray-400 hover:text-blue-300 disabled:text-gray-700"
                  : "text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                  } disabled:cursor-not-allowed`}
              >
                <FaChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Payslip Modal */}
        {selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className={`rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${
              theme === "dark" ? "bg-gray-900" : "bg-white"
            }`}>
              {/* Modal Header */}
              <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
                theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center gap-3">
                  <FaFileInvoiceDollar className={`w-6 h-6 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                  <h2 className={`text-2xl font-bold ${
                    theme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}>Payslip</h2>
                </div>
                <div className="flex items-center gap-2">
                  {payslipData && (
                    <>
                      <button
                        onClick={handleDownloadPayslip}
                        className={`p-2 rounded-lg transition ${
                          theme === "dark"
                            ? "bg-blue-800 text-blue-200 hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        title="Download PDF"
                      >
                        <FaDownload className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handlePrintPayslip}
                        className={`p-2 rounded-lg transition ${
                          theme === "dark"
                            ? "bg-blue-800 text-blue-200 hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        title="Print"
                      >
                        <FaPrint className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedPayslip(null);
                      setPayslipData(null);
                      setPayslipError(null);
                    }}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark"
                        ? "text-gray-400 hover:bg-gray-800 hover:text-red-400"
                        : "text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    }`}
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {payslipLoading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className={`mt-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Loading payslip...</p>
                  </div>
                ) : payslipError ? (
                  <div className={`py-12 text-center ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                    <p>{payslipError}</p>
                  </div>
                ) : payslipData ? (
                  <div className={`print-payslip-area rounded-lg p-8 border ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}>
                    {/* Company Header */}
                    <div className={`p-6 border-b ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`}>
                      <div className="flex items-start gap-6">
                        <div className="relative h-16 w-auto">
                          <Image
                            src="/v1/employee/exozen_logo.png"
                            alt="Company Logo"
                            width={64}
                            height={64}
                            className="h-16 w-auto"
                            priority
                          />
                        </div>
                        <div className="flex-1">
                          <h2 className={`text-xl font-bold ${
                            theme === "dark" ? "text-gray-100" : "text-gray-900"
                          }`}>M/s Exozen Private Limited.,</h2>
                          <p className={`text-sm mt-1 ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            No.25/1, 4th Floor, Shantala Nagar, Brigade Road, Museum Road,<br />
                            Ashok Nagar, Bengaluru, Karnataka - 560025
                          </p>
                        </div>
                      </div>
                      <div className="text-center mt-4">
                        <h3 className={`text-lg font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-900"
                        }`}>
                          Pay Slip for the month of {payslipData.month ? new Date(payslipData.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${payslipData.month} ${payslipData.year}`}
                        </h3>
                      </div>
                    </div>

                    {/* Employee Details */}
                    <div className="p-6">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className={`border p-2 w-1/4 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Employee ID:
                            </td>
                            <td className={`border p-2 ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              {payslipData.employeeId}
                            </td>
                            <td className={`border p-2 w-1/4 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Paid Days:
                            </td>
                            <td className={`border p-2 ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              {payslipData.payableDays || "-"}
                            </td>
                          </tr>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Employee Name:
                            </td>
                            <td className={`border p-2 ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              {payslipData.employeeName}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Designation:
                            </td>
                            <td className={`border p-2 ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              {payslipData.designation}
                            </td>
                          </tr>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Project:
                            </td>
                            <td className={`border p-2 ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              {payslipData.project}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Status:
                            </td>
                            <td className={`border p-2 ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              {selectedPayslip.status || "N/A"}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Earnings and Deductions */}
                      <table className={`w-full border-collapse mt-6 ${
                        theme === "dark" ? "text-gray-200" : "text-black"
                      }`}>
                        <thead>
                          <tr>
                            <th className={`border p-2 text-left w-1/4 ${
                              theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-black"
                            }`}>
                              Earnings
                            </th>
                            <th className={`border p-2 text-left w-1/4 ${
                              theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-black"
                            }`}>
                              Amount
                            </th>
                            <th className={`border p-2 text-left w-1/4 ${
                              theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-black"
                            }`}>
                              Deductions
                            </th>
                            <th className={`border p-2 text-left w-1/4 ${
                              theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-black"
                            }`}>
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Basic Salary
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.basicSalary.toFixed(2)}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              PF
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.pf.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              HR Allowance
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.hrAllowance.toFixed(2)}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ESI
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.esi.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Conveyance Allowance
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.conveyanceAllowance.toFixed(2)}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              PT
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.pt.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Special Allowance
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.specialAllowance.toFixed(2)}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Medical Insurance
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.medicalInsurance.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Other Allowance
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.otherAllowance.toFixed(2)}
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Uniform Deduction
                            </td>
                            <td className={`border p-2 font-medium ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.uniformDeduction.toFixed(2)}
                            </td>
                          </tr>
                          {payslipData.washingAllowance > 0 && (
                            <tr>
                              <td className={`border p-2 font-medium ${
                                theme === "dark"
                                  ? "border-gray-700 text-gray-200"
                                  : "border-gray-300 text-black"
                              }`}>
                                Washing Allowance
                              </td>
                              <td className={`border p-2 font-medium ${
                                theme === "dark"
                                  ? "border-gray-700 text-gray-200"
                                  : "border-gray-300 text-black"
                              }`}>
                                ₹{payslipData.washingAllowance.toFixed(2)}
                              </td>
                              <td className={`border p-2 font-medium ${
                                theme === "dark"
                                  ? "border-gray-700 text-gray-200"
                                  : "border-gray-300 text-black"
                              }`}>
                                Room Rent
                              </td>
                              <td className={`border p-2 font-medium ${
                                theme === "dark"
                                  ? "border-gray-700 text-gray-200"
                                  : "border-gray-300 text-black"
                              }`}>
                                ₹{payslipData.roomRent.toFixed(2)}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className={`border p-2 font-semibold ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Total Earnings
                            </td>
                            <td className={`border p-2 font-semibold ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.totalEarnings.toFixed(2)}
                            </td>
                            <td className={`border p-2 font-semibold ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              Total Deductions
                            </td>
                            <td className={`border p-2 font-semibold ${
                              theme === "dark"
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-300 text-black"
                            }`}>
                              ₹{payslipData.totalDeductions.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Net Pay */}
                      <div className={`mt-6 border p-4 ${
                        theme === "dark"
                          ? "border-gray-700"
                          : "border-gray-300"
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold text-lg ${
                            theme === "dark" ? "text-gray-200" : "text-gray-900"
                          }`}>Net Pay:</span>
                          <span className={`font-semibold text-lg ${
                            theme === "dark" ? "text-green-400" : "text-green-700"
                          }`}>₹{payslipData.netPay.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className={`mt-6 text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        <p>Please Note: This is system generated Pay Slip, this does not require any signature for authentication.</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-payslip-area, .print-payslip-area * {
              visibility: visible;
              color: black !important;
              background: white !important;
            }
            .print-payslip-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print-payslip-area table {
              border-collapse: collapse;
              width: 100%;
            }
            .print-payslip-area td,
            .print-payslip-area th {
              border: 2px solid #1f2937 !important;
              padding: 8px !important;
            }
            @page {
              margin: 20mm;
              size: auto;
            }
          }
        `}</style>

        {/* Create Payroll Modal - Table Format */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className={`rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col ${
              theme === "dark" ? "bg-gray-900" : "bg-white"
            }`}>
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-6 border-b ${
                theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center gap-3">
                  <FaPlus className={`w-6 h-6 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                  <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    Create Payroll
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Search and Filters */}
                  <div className="relative">
                    <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className={`w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white"
                          : "bg-white border-gray-200 text-black"
                      }`}
                    />
                  </div>
                  <select
                    value={employeeProjectFilter}
                    onChange={(e) => setEmployeeProjectFilter(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Projects</option>
                    {employeeProjectOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={employeeDesignationFilter}
                    onChange={(e) => setEmployeeDesignationFilter(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-200 text-black"
                    }`}
                  >
                    <option value="">All Designations</option>
                    {employeeDesignationOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCloseCreateModal}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark"
                        ? "text-gray-400 hover:bg-gray-800 hover:text-red-400"
                        : "text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    }`}
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="px-6 pt-4">
                {createError && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${theme === "dark" ? "bg-red-950 text-red-300 border border-red-800" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${theme === "dark" ? "bg-green-950 text-green-300 border border-green-800" : "bg-green-50 text-green-600 border border-green-200"}`}>
                    <FaCheckCircle className="w-4 h-4" />
                    {createSuccess}
                  </div>
                )}
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className={`overflow-auto rounded-lg border ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                      <tr>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Employee
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Month
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Year
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Basic
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          HRA
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          DA
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Special
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Other
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          PF
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          ESI
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          PT
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Amount (₹)
                        </th>
                        <th className={`px-3 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Payable Days
                        </th>
                        <th className={`px-3 py-2 text-center font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={13} className={`px-4 py-8 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                            No employees found
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp) => {
                          const form = createForms[emp.personalDetails.employeeId] || { 
                            month: "", 
                            year: "", 
                            amount: "", 
                            payableDays: "",
                            basicSalary: "",
                            hrAllowance: "",
                            conveyanceAllowance: "",
                            specialAllowance: "",
                            otherAllowance: "",
                            washingAllowance: "",
                            pf: "",
                            esi: "",
                            pt: "",
                            medicalInsurance: "",
                            uniformDeduction: "",
                            roomRent: ""
                          };
                          return (
                            <tr key={emp.personalDetails.employeeId} className={`border-b ${theme === "dark" ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"}`}>
                              <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                                    theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                                  }`}>
                                    {emp.personalDetails.employeeImage ? (
                                      <Image
                                        src={emp.personalDetails.employeeImage}
                                        alt={emp.personalDetails.fullName}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FaUser className="w-5 h-5 text-blue-500" />
                                    )}
                                  </div>
                                  <div>
                                    <div className={`font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                      {emp.personalDetails.fullName}
                                    </div>
                                    <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                                      {emp.personalDetails.employeeId}
                                    </div>
                                    <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                                      {emp.personalDetails.designation} • {emp.personalDetails.projectName}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <select
                                  value={form.month}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "month", e.target.value)}
                                  className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white"
                                      : "bg-white border-gray-300 text-black"
                                  }`}
                                >
                                  <option value="">Select</option>
                                  {monthOptionsForCreate.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              </td>
                              <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.year}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "year", e.target.value)}
                                  placeholder="2025"
                                  className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.basicSalary}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "basicSalary", e.target.value)}
                                  placeholder="Basic"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.hrAllowance}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "hrAllowance", e.target.value)}
                                  placeholder="HRA"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.conveyanceAllowance}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "conveyanceAllowance", e.target.value)}
                                  placeholder="DA"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.specialAllowance}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "specialAllowance", e.target.value)}
                                  placeholder="Special"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.otherAllowance}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "otherAllowance", e.target.value)}
                                  placeholder="Other"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.pf}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "pf", e.target.value)}
                                  placeholder="PF"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.esi}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "esi", e.target.value)}
                                  placeholder="ESI"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <input
                                  type="number"
                                  value={form.pt}
                                  onChange={(e) => handleFormChange(emp.personalDetails.employeeId, "pt", e.target.value)}
                                  placeholder="PT"
                                  className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                                  }`}
                                />
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                {employeeAttendance[emp.personalDetails.employeeId]?.loading ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs text-gray-500">Calc...</span>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    value={form.amount}
                                    readOnly
                                    placeholder="Auto"
                                    className={`w-full px-2 py-1 border rounded text-xs ${
                                      theme === "dark"
                                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500 cursor-not-allowed"
                                        : "bg-gray-100 border-gray-300 text-black placeholder-gray-400 cursor-not-allowed"
                                    }`}
                                    title="Amount is auto-calculated based on salary components and payable days"
                                  />
                                )}
                              </td>
                              <td className={`px-3 py-2 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                {employeeAttendance[emp.personalDetails.employeeId]?.loading ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs text-gray-500">Load...</span>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    value={form.payableDays}
                                    readOnly
                                    placeholder="Auto"
                                    className={`w-full px-2 py-1 border rounded text-xs ${
                                      theme === "dark"
                                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500 cursor-not-allowed"
                                        : "bg-gray-100 border-gray-300 text-black placeholder-gray-400 cursor-not-allowed"
                                    }`}
                                    title="Payable days are auto-fetched from attendance"
                                  />
                                )}
                              </td>
                              <td className={`px-4 py-3 text-center ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                <button
                                  onClick={() => handleCreatePayroll(emp.personalDetails.employeeId, emp.personalDetails.fullName)}
                                  disabled={createLoading || !form.month || !form.year || !form.amount}
                                  className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                                    theme === "dark"
                                      ? "bg-green-700 text-white hover:bg-green-800"
                                      : "bg-green-600 text-white hover:bg-green-700"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {createLoading ? "Creating..." : "Create"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Payroll Master Section */}
        {showCreateMasterModal && (
          <div className={`rounded-xl shadow-lg w-full mb-6 flex flex-col ${
            theme === "dark" ? "bg-gray-900 border border-gray-700" : "bg-white border border-gray-200"
          }`}>
            {/* Section Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <div className="flex items-center gap-3">
                <FaPlus className={`w-6 h-6 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                  Create Payroll Master
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateMasterModal(false);
                  setMasterCreateError(null);
                  setMasterCreateSuccess(null);
                  setMasterModalProjectFilter("");
                  setMasterModalEmployeeSearch("");
                  setMasterModalEmployeeConfirmed(false);
                  setMasterForm({
                    employeeId: "",
                    year: new Date().getFullYear().toString(),
                    // Salary Components
                    basicSalary: "",
                    daVda: "",
                    hrAllowance: "",
                    conveyanceAllowance: "",
                    leaveTravelAllowance: "",
                    medicalAllowance: "",
                    specialAllowance: "",
                    otherAllowance: "",
                    // Other Benefits
                    washingAllowance: "",
                    leaveWithWages: "",
                    bonus: "",
                    nationalFestivalHolidays: "",
                    wagesAdditionalHours: "",
                    relieverCharges: "",
                    // Employee Deductions
                    employeePf: "",
                    employeeEsi: "",
                    pt: "",
                    uniformDeduction: "",
                    medicalInsurance: "",
                    trainingCost: "",
                    labourWelfareFundEmployee: "",
                    // Employer Deductions
                    employerPf: "",
                    employerEsi: "",
                    labourLicense: "",
                    labourWelfareFundEmployer: "",
                    gratuity: "",
                    // Legacy fields
                    pf: "",
                    esi: "",
                    roomRent: "",
                    // Applicable checkboxes
                    basicSalaryApplicable: false,
                    daVdaApplicable: false,
                    hrAllowanceApplicable: false,
                    conveyanceAllowanceApplicable: false,
                    leaveTravelAllowanceApplicable: false,
                    medicalAllowanceApplicable: false,
                    specialAllowanceApplicable: false,
                    otherAllowanceApplicable: false,
                    washingAllowanceApplicable: false,
                    leaveWithWagesApplicable: false,
                    bonusApplicable: false,
                    nationalFestivalHolidaysApplicable: false,
                    wagesAdditionalHoursApplicable: false,
                    relieverChargesApplicable: false,
                    employeePfApplicable: false,
                    employeeEsiApplicable: false,
                    ptApplicable: false,
                    uniformDeductionApplicable: false,
                    medicalInsuranceApplicable: false,
                    trainingCostApplicable: false,
                    labourWelfareFundEmployeeApplicable: false,
                    employerPfApplicable: false,
                    employerEsiApplicable: false,
                    labourLicenseApplicable: false,
                    labourWelfareFundEmployerApplicable: false,
                    gratuityApplicable: false,
                    // Fixed/Variable dropdowns
                    basicSalaryType: "",
                    daVdaType: "",
                    hrAllowanceType: "",
                    conveyanceAllowanceType: "",
                    leaveTravelAllowanceType: "",
                    medicalAllowanceType: "",
                    specialAllowanceType: "",
                    otherAllowanceType: "",
                    washingAllowanceType: "",
                    leaveWithWagesType: "",
                    bonusType: "",
                    nationalFestivalHolidaysType: "",
                    wagesAdditionalHoursType: "",
                    relieverChargesType: "",
                    employeePfType: "",
                    employeeEsiType: "",
                    ptType: "",
                    uniformDeductionType: "",
                    medicalInsuranceType: "",
                    trainingCostType: "",
                    labourWelfareFundEmployeeType: "",
                    employerPfType: "",
                    employerEsiType: "",
                    labourLicenseType: "",
                    labourWelfareFundEmployerType: "",
                    gratuityType: "",
                    // Percentage/Calculation fields
                    basicSalaryPercentage: "",
                    daVdaPercentage: "",
                    hrAllowancePercentage: "",
                    conveyanceAllowancePercentage: "",
                    leaveTravelAllowancePercentage: "",
                    medicalAllowancePercentage: "",
                    specialAllowancePercentage: "",
                    otherAllowancePercentage: "",
                    washingAllowancePercentage: "",
                    leaveWithWagesPercentage: "",
                    bonusPercentage: "",
                    nationalFestivalHolidaysPercentage: "",
                    wagesAdditionalHoursPercentage: "",
                    relieverChargesPercentage: "",
                    employeePfPercentage: "",
                    employeeEsiPercentage: "",
                    ptPercentage: "",
                    uniformDeductionPercentage: "",
                    medicalInsurancePercentage: "",
                    trainingCostPercentage: "",
                    labourWelfareFundEmployeePercentage: "",
                    employerPfPercentage: "",
                    employerEsiPercentage: "",
                    labourLicensePercentage: "",
                    labourWelfareFundEmployerPercentage: "",
                    gratuityPercentage: "",
                  });
                }}
                className={`p-2 rounded-lg transition ${
                  theme === "dark"
                    ? "text-gray-400 hover:bg-gray-800 hover:text-red-400"
                    : "text-gray-500 hover:bg-gray-100 hover:text-red-600"
                }`}
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

              {/* Messages */}
              <div className="px-6 pt-4">
                {masterCreateError && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${theme === "dark" ? "bg-red-950 text-red-300 border border-red-800" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {masterCreateError}
                  </div>
                )}
                {masterCreateSuccess && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${theme === "dark" ? "bg-green-950 text-green-300 border border-green-800" : "bg-green-50 text-green-600 border border-green-200"}`}>
                    <FaCheckCircle className="w-4 h-4" />
                    {masterCreateSuccess}
                  </div>
                )}
              </div>

              {/* Form Content */}
              <div className="p-6">
                {/* Project Selection */}
                <div className="mb-6">
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Select Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={masterModalProjectFilter}
                    onChange={(e) => {
                      setMasterModalProjectFilter(e.target.value);
                      setMasterForm(prev => ({ ...prev, employeeId: "" })); // Reset employee selection
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                  >
                    <option value="">Select a project</option>
                    {masterModalProjectOptions.map((project) => (
                      <option key={project} value={project}>
                        {project}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Selection Section */}
                {masterModalProjectFilter && !masterModalEmployeeConfirmed && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                        Select Employee <span className="text-red-500">*</span>
                      </label>
                      {masterForm.employeeId && (
                        <button
                          onClick={() => setMasterModalEmployeeConfirmed(true)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                            theme === "dark"
                              ? "bg-green-700 text-white hover:bg-green-800"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          OK
                        </button>
                      )}
                    </div>
                    
                    {/* Search Bar */}
                    <div className="mb-3">
                      <div className="relative">
                        <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                        <input
                          type="text"
                          placeholder="Search by name, employee ID, or designation..."
                          value={masterModalEmployeeSearch}
                          onChange={(e) => setMasterModalEmployeeSearch(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            theme === "dark"
                              ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                              : "bg-white border-gray-300 text-black placeholder-gray-400"
                          }`}
                        />
                      </div>
                    </div>

                    {masterModalLoading ? (
                      <div className={`text-center py-8 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Loading employees...
                      </div>
                    ) : masterModalFilteredEmployees.length === 0 ? (
                      <div className={`text-center py-8 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {masterModalEmployeeSearch ? "No employees found matching your search" : "No employees found for this project"}
                      </div>
                    ) : (
                      <div className={`overflow-auto rounded-lg border max-h-64 ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
                        <table className="w-full text-sm">
                          <thead className={`sticky top-0 ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                            <tr>
                              <th className={`px-4 py-2 text-center font-bold uppercase border-b text-xs w-12 ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => {}}
                                  className="cursor-pointer"
                                  title="Select all"
                                />
                              </th>
                              <th className={`px-4 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                                Photo
                              </th>
                              <th className={`px-4 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                                Name
                              </th>
                              <th className={`px-4 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                                Employee ID
                              </th>
                              <th className={`px-4 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                                Designation
                              </th>
                              <th className={`px-4 py-2 text-left font-bold uppercase border-b text-xs ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                                Date of Joining
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {masterModalFilteredEmployees.map((emp) => (
                              <tr
                                key={emp.personalDetails.employeeId}
                                onClick={() => setMasterForm(prev => ({ ...prev, employeeId: emp.personalDetails.employeeId }))}
                                className={`border-b cursor-pointer transition ${
                                  theme === "dark" 
                                    ? "border-gray-700 hover:bg-gray-700" 
                                    : "border-gray-200 hover:bg-gray-50"
                                } ${
                                  masterForm.employeeId === emp.personalDetails.employeeId
                                    ? theme === "dark" ? "bg-blue-900" : "bg-blue-50"
                                    : ""
                                }`}
                              >
                                <td className={`px-4 py-3 text-center ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={masterForm.employeeId === emp.personalDetails.employeeId}
                                    onChange={() => setMasterForm(prev => ({ 
                                      ...prev, 
                                      employeeId: prev.employeeId === emp.personalDetails.employeeId ? "" : emp.personalDetails.employeeId 
                                    }))}
                                    className="cursor-pointer w-4 h-4"
                                  />
                                </td>
                                <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                                    theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                                  }`}>
                                    {emp.personalDetails.employeeImage ? (
                                      <Image
                                        src={emp.personalDetails.employeeImage}
                                        alt={emp.personalDetails.fullName}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <FaUser className="w-5 h-5 text-blue-500" />
                                    )}
                                  </div>
                                </td>
                                <td className={`px-4 py-3 font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                  {emp.personalDetails.fullName}
                                </td>
                                <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                  {emp.personalDetails.employeeId}
                                </td>
                                <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                  {emp.personalDetails.designation}
                                </td>
                                <td className={`px-4 py-3 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                  {emp.personalDetails.dateOfJoining 
                                    ? new Date(emp.personalDetails.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Employee Display - After OK is clicked */}
                {masterModalEmployeeConfirmed && selectedEmployeeDetails && (
                  <div className={`mb-6 p-6 rounded-lg border ${
                    theme === "dark" ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                        Selected Employee
                      </h3>
                      <button
                        onClick={() => setMasterModalEmployeeConfirmed(false)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                          theme === "dark"
                            ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Change
                      </button>
                    </div>
                    <div className="flex items-start gap-4">
                      {/* Photo */}
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                      }`}>
                        {selectedEmployeeDetails.personalDetails.employeeImage ? (
                          <Image
                            src={selectedEmployeeDetails.personalDetails.employeeImage}
                            alt={selectedEmployeeDetails.personalDetails.fullName}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <FaUser className="w-10 h-10 text-blue-500" />
                        )}
                      </div>
                      {/* Details */}
                      <div className="flex-1">
                        <div className={`text-xl font-bold mb-2 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                          {selectedEmployeeDetails.personalDetails.fullName}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                              Employee ID
                            </div>
                            <div className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                              {selectedEmployeeDetails.personalDetails.employeeId}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                              Designation
                            </div>
                            <div className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                              {selectedEmployeeDetails.personalDetails.designation}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                              Date of Joining
                            </div>
                            <div className={`text-sm ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                              {selectedEmployeeDetails.personalDetails.dateOfJoining 
                                ? new Date(selectedEmployeeDetails.personalDetails.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Year Field */}
                <div className="mb-6">
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={masterForm.year}
                    onChange={(e) => setMasterForm(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="2025"
                    className={`w-full max-w-xs px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-black placeholder-gray-400"
                    }`}
                  />
                </div>

                {/* Salary Details Form - Table Format */}
                <div className={`overflow-auto rounded-xl border-2 shadow-xl ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-300 bg-white shadow-gray-200"}`}>
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className={`${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-blue-50 to-indigo-50"}`}>
                        <th className={`px-6 py-5 text-left font-extrabold uppercase text-xs tracking-wider border-b-2 sticky left-0 z-30 shadow-lg ${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900 text-blue-300 border-blue-700" : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-300"}`} style={{ width: '180px', minWidth: '180px' }}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-blue-600"}`}></div>
                            Category
                          </div>
                        </th>
                        <th className={`px-6 py-5 text-left font-extrabold uppercase text-xs tracking-wider border-b-2 ${theme === "dark" ? "text-blue-300 border-blue-700" : "text-blue-800 border-blue-300"}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-blue-600"}`}></div>
                            Description
                          </div>
                        </th>
                        <th className={`px-6 py-5 text-center font-extrabold uppercase text-xs tracking-wider border-b-2 ${theme === "dark" ? "text-blue-300 border-blue-700" : "text-blue-800 border-blue-300"}`} style={{ width: '120px', minWidth: '120px' }}>
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-green-400" : "bg-green-600"}`}></div>
                            Applicable
                          </div>
                        </th>
                        <th className={`px-6 py-5 text-center font-extrabold uppercase text-xs tracking-wider border-b-2 ${theme === "dark" ? "text-blue-300 border-blue-700" : "text-blue-800 border-blue-300"}`} style={{ width: '140px', minWidth: '140px' }}>
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-purple-400" : "bg-purple-600"}`}></div>
                            Fixed/Variable
                          </div>
                        </th>
                        <th className={`px-6 py-5 text-center font-extrabold uppercase text-xs tracking-wider border-b-2 ${theme === "dark" ? "text-blue-300 border-blue-700" : "text-blue-800 border-blue-300"}`} style={{ width: '150px', minWidth: '150px' }}>
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-yellow-400" : "bg-yellow-600"}`}></div>
                            Percentage/Calculation
                          </div>
                        </th>
                        <th className={`px-6 py-5 text-center font-extrabold uppercase text-xs tracking-wider border-b-2 ${theme === "dark" ? "text-blue-300 border-blue-700" : "text-blue-800 border-blue-300"}`} style={{ width: '250px', minWidth: '250px' }}>
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-indigo-400" : "bg-indigo-600"}`}></div>
                            How Calculated
                          </div>
                        </th>
                        <th className={`px-6 py-5 text-right font-extrabold uppercase text-xs tracking-wider border-b-2 ${theme === "dark" ? "text-blue-300 border-blue-700" : "text-blue-800 border-blue-300"}`} style={{ width: '220px', minWidth: '220px' }}>
                          <div className="flex items-center justify-end gap-2">
                            <div className={`w-2 h-2 rounded-full ${theme === "dark" ? "bg-emerald-400" : "bg-emerald-600"}`}></div>
                            Amount (₹)
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-opacity-50">

                      {/* Salary Components Section */}
                      <tr className={`group ${theme === "dark" ? "hover:bg-gray-800/50 bg-gray-900/30" : "hover:bg-blue-50/50 bg-white"} transition-all duration-200 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                        <td rowSpan={9} className={`px-6 py-4 align-top border-r-2 font-extrabold text-sm sticky left-0 z-20 shadow-lg ${theme === "dark" ? "bg-gradient-to-b from-gray-800 to-gray-900 text-blue-300 border-blue-700" : "bg-gradient-to-b from-blue-50 to-indigo-50 text-blue-800 border-blue-300"}`}>
                          <div className="transform -rotate-90 origin-center whitespace-nowrap font-bold" style={{ width: '120px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-blue-600"}`}></div>
                              Salary Components
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 border-b font-semibold ${theme === "dark" ? "text-gray-100 border-gray-800" : "text-gray-800 border-gray-100"}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">Basic Salary</span>
                            <span className="text-red-500 font-bold">*</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={masterForm.basicSalaryApplicable}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, basicSalaryApplicable: e.target.checked }))}
                              className={`sr-only peer`}
                            />
                            <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                              masterForm.basicSalaryApplicable 
                                ? theme === "dark" ? "bg-green-600" : "bg-green-500"
                                : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                                masterForm.basicSalaryApplicable ? "translate-x-5" : ""
                              }`}></div>
                            </div>
                          </label>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.basicSalaryType && editingTypeField !== "basicSalaryType" ? (
                            <span 
                              onClick={() => setEditingTypeField("basicSalaryType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.basicSalaryType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.basicSalaryType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.basicSalaryType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, basicSalaryType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "basicSalaryType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.basicSalaryType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.basicSalaryPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, basicSalaryPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.basicSalaryType === "Variable" && masterForm.basicSalaryPercentage ? (
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${
                              theme === "dark" ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}>
                              Base Component
                            </span>
                          ) : (
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.basicSalary}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`group ${theme === "dark" ? "hover:bg-gray-800/50 bg-gray-900/30" : "hover:bg-blue-50/50 bg-white"} transition-all duration-200 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                        <td className={`px-6 py-4 border-b font-semibold ${theme === "dark" ? "text-gray-100 border-gray-800" : "text-gray-800 border-gray-100"}`}>
                          <span className="font-bold">DA/VDA</span>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={masterForm.daVdaApplicable}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, daVdaApplicable: e.target.checked }))}
                              className={`sr-only peer`}
                            />
                            <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                              masterForm.daVdaApplicable 
                                ? theme === "dark" ? "bg-green-600" : "bg-green-500"
                                : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                                masterForm.daVdaApplicable ? "translate-x-5" : ""
                              }`}></div>
                            </div>
                          </label>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.daVdaType && editingTypeField !== "daVdaType" ? (
                            <span 
                              onClick={() => setEditingTypeField("daVdaType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.daVdaType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.daVdaType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.daVdaType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, daVdaType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "daVdaType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.daVdaType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.daVdaPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, daVdaPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.daVdaType === "Variable" && masterForm.daVdaPercentage ? (
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${
                              theme === "dark" ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`} title={`ROUNDUP(Basic Salary*${masterForm.daVdaPercentage}%)`}>
                              ROUNDUP(Basic Salary*{masterForm.daVdaPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.daVda}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, daVda: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`group ${theme === "dark" ? "hover:bg-gray-800/50 bg-gray-900/30" : "hover:bg-blue-50/50 bg-white"} transition-all duration-200 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                        <td className={`px-6 py-4 border-b font-semibold ${theme === "dark" ? "text-gray-100 border-gray-800" : "text-gray-800 border-gray-100"}`}>
                          <span className="font-bold">House Rent Allowance</span>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={masterForm.hrAllowanceApplicable}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, hrAllowanceApplicable: e.target.checked }))}
                              className={`sr-only peer`}
                            />
                            <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                              masterForm.hrAllowanceApplicable 
                                ? theme === "dark" ? "bg-green-600" : "bg-green-500"
                                : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                                masterForm.hrAllowanceApplicable ? "translate-x-5" : ""
                              }`}></div>
                            </div>
                          </label>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.hrAllowanceType && editingTypeField !== "hrAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("hrAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.hrAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.hrAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.hrAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, hrAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "hrAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.hrAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.hrAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, hrAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.hrAllowanceType === "Variable" && masterForm.hrAllowancePercentage ? (
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${
                              theme === "dark" ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.hrAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.hrAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.hrAllowance}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, hrAllowance: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`group ${theme === "dark" ? "hover:bg-gray-800/50 bg-gray-900/30" : "hover:bg-blue-50/50 bg-white"} transition-all duration-200 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                        <td className={`px-6 py-4 border-b font-semibold ${theme === "dark" ? "text-gray-100 border-gray-800" : "text-gray-800 border-gray-100"}`}>
                          <span className="font-bold">Conveyance Allowance (Fixed)</span>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={masterForm.conveyanceAllowanceApplicable}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, conveyanceAllowanceApplicable: e.target.checked }))}
                              className={`sr-only peer`}
                            />
                            <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                              masterForm.conveyanceAllowanceApplicable 
                                ? theme === "dark" ? "bg-green-600" : "bg-green-500"
                                : theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                                masterForm.conveyanceAllowanceApplicable ? "translate-x-5" : ""
                              }`}></div>
                            </div>
                          </label>
                        </td>
                        <td className={`px-6 py-4 border-b text-center ${theme === "dark" ? "border-gray-800" : "border-gray-100"}`}>
                          {masterForm.conveyanceAllowanceType && editingTypeField !== "conveyanceAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("conveyanceAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.conveyanceAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.conveyanceAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, conveyanceAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "conveyanceAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.conveyanceAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.conveyanceAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, conveyanceAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.conveyanceAllowanceType === "Variable" && masterForm.conveyanceAllowancePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.conveyanceAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.conveyanceAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                            type="number"
                            value={masterForm.conveyanceAllowance}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, conveyanceAllowance: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Leave Travel Allowance
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.leaveTravelAllowanceApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, leaveTravelAllowanceApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.leaveTravelAllowanceApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.leaveTravelAllowanceType && editingTypeField !== "leaveTravelAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("leaveTravelAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.leaveTravelAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.leaveTravelAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, leaveTravelAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "leaveTravelAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.leaveTravelAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.leaveTravelAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, leaveTravelAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.leaveTravelAllowanceType === "Variable" && masterForm.leaveTravelAllowancePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.leaveTravelAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.leaveTravelAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.leaveTravelAllowance}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, leaveTravelAllowance: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Medical Allowance (Fixed)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.medicalAllowanceApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, medicalAllowanceApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.medicalAllowanceApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.medicalAllowanceType && editingTypeField !== "medicalAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("medicalAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.medicalAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.medicalAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, medicalAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "medicalAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.medicalAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.medicalAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, medicalAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.medicalAllowanceType === "Variable" && masterForm.medicalAllowancePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.medicalAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.medicalAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.medicalAllowance}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, medicalAllowance: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Special Allowance
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.specialAllowanceApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, specialAllowanceApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.specialAllowanceApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.specialAllowanceType && editingTypeField !== "specialAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("specialAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.specialAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.specialAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, specialAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "specialAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.specialAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.specialAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, specialAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.specialAllowanceType === "Variable" && masterForm.specialAllowancePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.specialAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.specialAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.specialAllowance}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, specialAllowance: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Other Allowances
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.otherAllowanceApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, otherAllowanceApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.otherAllowanceApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.otherAllowanceType && editingTypeField !== "otherAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("otherAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.otherAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.otherAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, otherAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "otherAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.otherAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.otherAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, otherAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.otherAllowanceType === "Variable" && masterForm.otherAllowancePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.otherAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.otherAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.otherAllowance}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, otherAllowance: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr className={theme === "dark" ? "bg-blue-900/30" : "bg-blue-50"}>
                        <td className={`px-6 py-3 font-bold border-b ${theme === "dark" ? "text-blue-300 border-gray-700" : "text-blue-700 border-gray-200"}`}>
                          Gross Salary
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b font-bold ${theme === "dark" ? "text-blue-300 border-gray-700" : "text-blue-700 border-gray-200"}`}>
                          {(
                            (Number(masterForm.basicSalary) || 0) +
                            (Number(masterForm.daVda) || 0) +
                            (Number(masterForm.hrAllowance) || 0) +
                            (Number(masterForm.conveyanceAllowance) || 0) +
                            (Number(masterForm.leaveTravelAllowance) || 0) +
                            (Number(masterForm.medicalAllowance) || 0) +
                            (Number(masterForm.specialAllowance) || 0) +
                            (Number(masterForm.otherAllowance) || 0)
                          ).toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Other Benefits Section */}
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td rowSpan={6} className={`px-6 py-4 align-top border-r font-bold text-sm sticky left-0 z-10 ${theme === "dark" ? "bg-gray-700 text-blue-300 border-gray-600" : "bg-blue-50 text-blue-700 border-gray-300"}`}>
                          <div className="transform -rotate-90 origin-center whitespace-nowrap" style={{ width: '120px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Other Benefits
                          </div>
                        </td>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Washing Allowance (Fixed)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.washingAllowanceApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, washingAllowanceApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.washingAllowanceApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.washingAllowanceType && editingTypeField !== "washingAllowanceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("washingAllowanceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.washingAllowanceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.washingAllowanceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, washingAllowanceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "washingAllowanceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.washingAllowanceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.washingAllowancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, washingAllowancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.washingAllowanceType === "Variable" && masterForm.washingAllowancePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.washingAllowancePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.washingAllowancePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.washingAllowance}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, washingAllowance: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Leave with Wages (EL+SL (1.5+1) 30 Days Pa)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.leaveWithWagesApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, leaveWithWagesApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.leaveWithWagesApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.leaveWithWagesType && editingTypeField !== "leaveWithWagesType" ? (
                            <span 
                              onClick={() => setEditingTypeField("leaveWithWagesType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.leaveWithWagesType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.leaveWithWagesType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, leaveWithWagesType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "leaveWithWagesType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.leaveWithWagesType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.leaveWithWagesPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, leaveWithWagesPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.leaveWithWagesType === "Variable" ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title="ROUNDUP(SUM((Basic+VDA/DA)/26*30/12),0)">
                              ROUNDUP(SUM((Basic+VDA/DA)/26*30/12),0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.leaveWithWages}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, leaveWithWages: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Bonus
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.bonusApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, bonusApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.bonusApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.bonusType && editingTypeField !== "bonusType" ? (
                            <span 
                              onClick={() => setEditingTypeField("bonusType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.bonusType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.bonusType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, bonusType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "bonusType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.bonusType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.bonusPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, bonusPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.bonusType === "Variable" && masterForm.bonusPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.bonusPercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.bonusPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.bonus}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, bonus: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          National Festival Holidays (10 Days PA)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.nationalFestivalHolidaysApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, nationalFestivalHolidaysApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.nationalFestivalHolidaysApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.nationalFestivalHolidaysType && editingTypeField !== "nationalFestivalHolidaysType" ? (
                            <span 
                              onClick={() => setEditingTypeField("nationalFestivalHolidaysType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.nationalFestivalHolidaysType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.nationalFestivalHolidaysType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, nationalFestivalHolidaysType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "nationalFestivalHolidaysType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.nationalFestivalHolidaysType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.nationalFestivalHolidaysPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, nationalFestivalHolidaysPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.nationalFestivalHolidaysType === "Variable" ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title="ROUNDUP(SUM((Basic+VDA/DA)/26*10/12),0)">
                              ROUNDUP(SUM((Basic+VDA/DA)/26*10/12),0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.nationalFestivalHolidays}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, nationalFestivalHolidays: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Wages for additional Hours
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.wagesAdditionalHoursApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, wagesAdditionalHoursApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.wagesAdditionalHoursApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.wagesAdditionalHoursType && editingTypeField !== "wagesAdditionalHoursType" ? (
                            <span 
                              onClick={() => setEditingTypeField("wagesAdditionalHoursType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.wagesAdditionalHoursType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.wagesAdditionalHoursType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, wagesAdditionalHoursType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "wagesAdditionalHoursType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.wagesAdditionalHoursType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.wagesAdditionalHoursPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, wagesAdditionalHoursPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.wagesAdditionalHoursType === "Variable" && masterForm.wagesAdditionalHoursPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.wagesAdditionalHoursPercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.wagesAdditionalHoursPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.wagesAdditionalHours}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, wagesAdditionalHours: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Reliever Charges
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.relieverChargesApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, relieverChargesApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.relieverChargesApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.relieverChargesType && editingTypeField !== "relieverChargesType" ? (
                            <span 
                              onClick={() => setEditingTypeField("relieverChargesType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.relieverChargesType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.relieverChargesType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, relieverChargesType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "relieverChargesType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.relieverChargesType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.relieverChargesPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, relieverChargesPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.relieverChargesType === "Variable" && masterForm.relieverChargesPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.relieverChargesPercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.relieverChargesPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.relieverCharges}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, relieverCharges: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Employee Deductions Section */}
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td rowSpan={7} className={`px-6 py-4 align-top border-r font-bold text-sm sticky left-0 z-10 ${theme === "dark" ? "bg-gray-700 text-blue-300 border-gray-600" : "bg-blue-50 text-blue-700 border-gray-300"}`}>
                          <div className="transform -rotate-90 origin-center whitespace-nowrap" style={{ width: '120px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Employee Deductions
                          </div>
                        </td>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Employee Share PF@12%
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.employeePfApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, employeePfApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.employeePfApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employeePfType && editingTypeField !== "employeePfType" ? (
                            <span 
                              onClick={() => setEditingTypeField("employeePfType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.employeePfType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.employeePfType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, employeePfType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "employeePfType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employeePfType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.employeePfPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, employeePfPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employeePfType === "Variable" && masterForm.employeePfPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(+IF((Basic+VDA/DA)>15000,(15000*${masterForm.employeePfPercentage}%),(Basic+VDA/DA)*${masterForm.employeePfPercentage}%),0)`}>
                              ROUNDUP(+IF((Basic+VDA/DA){'>'}15000,(15000*{masterForm.employeePfPercentage}%),(Basic+VDA/DA)*{masterForm.employeePfPercentage}%),0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.employeePf}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, employeePf: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Employee Share ESI@0.75%
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.employeeEsiApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, employeeEsiApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.employeeEsiApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employeeEsiType && editingTypeField !== "employeeEsiType" ? (
                            <span 
                              onClick={() => setEditingTypeField("employeeEsiType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.employeeEsiType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.employeeEsiType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, employeeEsiType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "employeeEsiType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employeeEsiType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.employeeEsiPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, employeeEsiPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employeeEsiType === "Variable" && masterForm.employeeEsiPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`+ROUND(IF(Gross salary+National festival holiday)>21000,0,((Gross salary+National festival holiday)*${masterForm.employeeEsiPercentage}%),0)`}>
                              +ROUND(IF(Gross salary+National festival holiday){'>'}21000,0,((Gross salary+National festival holiday)*{masterForm.employeeEsiPercentage}%),0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.employeeEsi}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, employeeEsi: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Professional Tax
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.ptApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, ptApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.ptApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.ptType && editingTypeField !== "ptType" ? (
                            <span 
                              onClick={() => setEditingTypeField("ptType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.ptType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.ptType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, ptType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "ptType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.ptType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.ptPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, ptPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.ptType === "Variable" ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title="+IF((Gross Salary)<25000,0,200)">
                              +IF((Gross Salary){'<'}25000,0,200)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.pt}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, pt: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Uniform & Shoes
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.uniformDeductionApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, uniformDeductionApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.uniformDeductionApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.uniformDeductionType && editingTypeField !== "uniformDeductionType" ? (
                            <span 
                              onClick={() => setEditingTypeField("uniformDeductionType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.uniformDeductionType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.uniformDeductionType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, uniformDeductionType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "uniformDeductionType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.uniformDeductionType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.uniformDeductionPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, uniformDeductionPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.uniformDeductionType === "Variable" && masterForm.uniformDeductionPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.uniformDeductionPercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.uniformDeductionPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.uniformDeduction}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, uniformDeduction: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Medical Insurance - Individual
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.medicalInsuranceApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, medicalInsuranceApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.medicalInsuranceApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.medicalInsuranceType && editingTypeField !== "medicalInsuranceType" ? (
                            <span 
                              onClick={() => setEditingTypeField("medicalInsuranceType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.medicalInsuranceType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.medicalInsuranceType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, medicalInsuranceType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "medicalInsuranceType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.medicalInsuranceType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.medicalInsurancePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, medicalInsurancePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.medicalInsuranceType === "Variable" ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title="IF(SUM(Gross salary )>21000,700,0)">
                              IF(SUM(Gross salary ){'>'}21000,700,0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.medicalInsurance}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, medicalInsurance: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Training Cost
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.trainingCostApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, trainingCostApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.trainingCostApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.trainingCostType && editingTypeField !== "trainingCostType" ? (
                            <span 
                              onClick={() => setEditingTypeField("trainingCostType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.trainingCostType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.trainingCostType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, trainingCostType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "trainingCostType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.trainingCostType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.trainingCostPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, trainingCostPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.trainingCostType === "Variable" && masterForm.trainingCostPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.trainingCostPercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.trainingCostPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.trainingCost}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, trainingCost: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Labour welfare fund (Rs.20 PA)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.labourWelfareFundEmployeeApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, labourWelfareFundEmployeeApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.labourWelfareFundEmployeeApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourWelfareFundEmployeeType && editingTypeField !== "labourWelfareFundEmployeeType" ? (
                            <span 
                              onClick={() => setEditingTypeField("labourWelfareFundEmployeeType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.labourWelfareFundEmployeeType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.labourWelfareFundEmployeeType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, labourWelfareFundEmployeeType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "labourWelfareFundEmployeeType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourWelfareFundEmployeeType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.labourWelfareFundEmployeePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, labourWelfareFundEmployeePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourWelfareFundEmployeeType === "Variable" && masterForm.labourWelfareFundEmployeePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.labourWelfareFundEmployeePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.labourWelfareFundEmployeePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                            <input
                              type="number"
                              value={masterForm.labourWelfareFundEmployee}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, labourWelfareFundEmployee: e.target.value }))}
                              placeholder="0"
                              className={`w-full max-w-[180px] px-4 py-2.5 border-2 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className={theme === "dark" ? "bg-green-900/30" : "bg-green-50"}>
                        <td className={`px-6 py-3 font-bold border-b ${theme === "dark" ? "text-green-300 border-gray-700" : "text-green-700 border-gray-200"}`}>
                          Take Home Salary
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b font-bold ${theme === "dark" ? "text-green-300 border-gray-700" : "text-green-700 border-gray-200"}`}>
                          {(
                            (Number(masterForm.basicSalary) || 0) +
                            (Number(masterForm.daVda) || 0) +
                            (Number(masterForm.hrAllowance) || 0) +
                            (Number(masterForm.conveyanceAllowance) || 0) +
                            (Number(masterForm.leaveTravelAllowance) || 0) +
                            (Number(masterForm.medicalAllowance) || 0) +
                            (Number(masterForm.specialAllowance) || 0) +
                            (Number(masterForm.otherAllowance) || 0) -
                            (Number(masterForm.employeePf) || 0) -
                            (Number(masterForm.employeeEsi) || 0) -
                            (Number(masterForm.pt) || 0) -
                            (Number(masterForm.uniformDeduction) || 0) -
                            (Number(masterForm.medicalInsurance) || 0) -
                            (Number(masterForm.trainingCost) || 0) -
                            (Number(masterForm.labourWelfareFundEmployee) || 0)
                          ).toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Employer Deductions Section */}
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td rowSpan={5} className={`px-6 py-4 align-top border-r font-bold text-sm sticky left-0 z-10 ${theme === "dark" ? "bg-gray-700 text-blue-300 border-gray-600" : "bg-blue-50 text-blue-700 border-gray-300"}`}>
                          <div className="transform -rotate-90 origin-center whitespace-nowrap" style={{ width: '120px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Employer Deductions
                          </div>
                        </td>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Employer Share PF@13%
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.employerPfApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, employerPfApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.employerPfApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employerPfType && editingTypeField !== "employerPfType" ? (
                            <span 
                              onClick={() => setEditingTypeField("employerPfType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.employerPfType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.employerPfType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, employerPfType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "employerPfType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employerPfType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.employerPfPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, employerPfPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employerPfType === "Variable" && masterForm.employerPfPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`+IF((Basic+VDA/DA)>15000,(15000*${masterForm.employerPfPercentage}%),(Basic+VDA/DA)*${masterForm.employerPfPercentage}%)`}>
                              +IF((Basic+VDA/DA){'>'}15000,(15000*{masterForm.employerPfPercentage}%),(Basic+VDA/DA)*{masterForm.employerPfPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.employerPf}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, employerPf: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Employee Share ESI@3.75%
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.employerEsiApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, employerEsiApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.employerEsiApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employerEsiType && editingTypeField !== "employerEsiType" ? (
                            <span 
                              onClick={() => setEditingTypeField("employerEsiType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.employerEsiType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.employerEsiType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, employerEsiType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "employerEsiType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employerEsiType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.employerEsiPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, employerEsiPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.employerEsiType === "Variable" && masterForm.employerEsiPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`+ROUND(IF((Gross salary+National festival holidays)>21000,0,((Gross salary+National festival holidays)*${masterForm.employerEsiPercentage}%),0)`}>
                              +ROUND(IF((Gross salary+National festival holidays){'>'}21000,0,((Gross salary+National festival holidays)*{masterForm.employerEsiPercentage}%),0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.employerEsi}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, employerEsi: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Labour License(CLRA)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.labourLicenseApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, labourLicenseApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.labourLicenseApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourLicenseType && editingTypeField !== "labourLicenseType" ? (
                            <span 
                              onClick={() => setEditingTypeField("labourLicenseType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.labourLicenseType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.labourLicenseType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, labourLicenseType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "labourLicenseType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourLicenseType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.labourLicensePercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, labourLicensePercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourLicenseType === "Variable" && masterForm.labourLicensePercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.labourLicensePercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.labourLicensePercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.labourLicense}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, labourLicense: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Labour welfare fund (Rs.40 PA)
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.labourWelfareFundEmployerApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, labourWelfareFundEmployerApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.labourWelfareFundEmployerApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourWelfareFundEmployerType && editingTypeField !== "labourWelfareFundEmployerType" ? (
                            <span 
                              onClick={() => setEditingTypeField("labourWelfareFundEmployerType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.labourWelfareFundEmployerType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.labourWelfareFundEmployerType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, labourWelfareFundEmployerType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "labourWelfareFundEmployerType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourWelfareFundEmployerType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.labourWelfareFundEmployerPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, labourWelfareFundEmployerPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.labourWelfareFundEmployerType === "Variable" && masterForm.labourWelfareFundEmployerPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic Salary:DA/VDA)*${masterForm.labourWelfareFundEmployerPercentage}%)`}>
                              ROUNDUP(SUM(Basic Salary:DA/VDA)*{masterForm.labourWelfareFundEmployerPercentage}%)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.labourWelfareFundEmployer}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, labourWelfareFundEmployer: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr className={`${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"} transition-colors`}>
                        <td className={`px-6 py-3 border-b font-medium ${theme === "dark" ? "text-gray-200 border-gray-700" : "text-gray-700 border-gray-200"}`}>
                          Gratuity
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <input
                            type="checkbox"
                            checked={masterForm.gratuityApplicable}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, gratuityApplicable: e.target.checked }))}
                            className={`w-5 h-5 rounded cursor-pointer accent-green-500 ${masterForm.gratuityApplicable ? "checked:bg-green-500" : ""}`}
                          />
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.gratuityType && editingTypeField !== "gratuityType" ? (
                            <span 
                              onClick={() => setEditingTypeField("gratuityType")}
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                masterForm.conveyanceAllowanceType === "Fixed"
                                  ? theme === "dark" ? "bg-purple-700/50 text-purple-300 hover:bg-purple-700 border border-purple-600" : "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                                  : theme === "dark" ? "bg-blue-700/50 text-blue-300 hover:bg-blue-700 border border-blue-600" : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              }`}
                            >
                              {masterForm.gratuityType}
                            </span>
                          ) : (
                            <select
                              value={masterForm.gratuityType}
                              onChange={(e) => {
                                setMasterForm(prev => ({ ...prev, gratuityType: e.target.value }));
                                setEditingTypeField(null);
                              }}
                              onBlur={() => setEditingTypeField(null)}
                              autoFocus={editingTypeField === "gratuityType"}
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black hover:border-gray-400"
                              }`}
                            >
                              <option value="">Select</option>
                              <option value="Fixed">Fixed</option>
                              <option value="Variable">Variable</option>
                            </select>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.gratuityType === "Variable" ? (
                            <input
                              type="number"
                              value={masterForm.gratuityPercentage}
                              onChange={(e) => setMasterForm(prev => ({ ...prev, gratuityPercentage: e.target.value }))}
                              placeholder="%"
                              className={`w-full max-w-[120px] px-3 py-2 border-2 rounded-lg text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-sm ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 hover:border-gray-500"
                                  : "bg-white border-gray-300 text-black placeholder-gray-400 hover:border-gray-400"
                              }`}
                            />
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b text-center ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          {masterForm.gratuityType === "Variable" && masterForm.gratuityPercentage ? (
                            <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} title={`ROUNDUP(SUM(Basic:VDA)*${masterForm.gratuityPercentage}%,0)`}>
                              ROUNDUP(SUM(Basic:VDA)*{masterForm.gratuityPercentage}%,0)
                            </span>
                          ) : (
                            <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                          )}
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <div className="flex items-center justify-end">
                            <span className={`text-lg font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number"
                            value={masterForm.gratuity}
                            onChange={(e) => setMasterForm(prev => ({ ...prev, gratuity: e.target.value }))}
                            placeholder="0"
                            className={`w-full max-w-[180px] px-3 py-2 border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                : "bg-white border-gray-300 text-black placeholder-gray-400"
                            }`}
                          />
                          </div>
                        </td>
                      </tr>
                      <tr className={theme === "dark" ? "bg-purple-900/30" : "bg-purple-50"}>
                        <td className={`px-6 py-3 font-bold border-b ${theme === "dark" ? "text-purple-300 border-gray-700" : "text-purple-700 border-gray-200"}`}>
                          CTC
                        </td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></td>
                        <td className={`px-6 py-3 border-b font-bold ${theme === "dark" ? "text-purple-300 border-gray-700" : "text-purple-700 border-gray-200"}`}>
                          {(
                            (Number(masterForm.basicSalary) || 0) +
                            (Number(masterForm.daVda) || 0) +
                            (Number(masterForm.hrAllowance) || 0) +
                            (Number(masterForm.conveyanceAllowance) || 0) +
                            (Number(masterForm.leaveTravelAllowance) || 0) +
                            (Number(masterForm.medicalAllowance) || 0) +
                            (Number(masterForm.specialAllowance) || 0) +
                            (Number(masterForm.otherAllowance) || 0) +
                            (Number(masterForm.washingAllowance) || 0) +
                            (Number(masterForm.leaveWithWages) || 0) +
                            (Number(masterForm.bonus) || 0) +
                            (Number(masterForm.nationalFestivalHolidays) || 0) +
                            (Number(masterForm.wagesAdditionalHours) || 0) +
                            (Number(masterForm.relieverCharges) || 0) +
                            (Number(masterForm.employerPf) || 0) +
                            (Number(masterForm.employerEsi) || 0) +
                            (Number(masterForm.labourLicense) || 0) +
                            (Number(masterForm.labourWelfareFundEmployer) || 0) +
                            (Number(masterForm.gratuity) || 0)
                          ).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section Footer */}
              <div className={`flex items-center justify-end gap-3 p-6 border-t ${
                theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              }`}>
                <button
                  onClick={() => {
                    setShowCreateMasterModal(false);
                    setMasterCreateError(null);
                    setMasterCreateSuccess(null);
                    setMasterModalProjectFilter("");
                    setMasterModalEmployeeSearch("");
                    setMasterModalEmployeeConfirmed(false);
                    setMasterForm({
                      employeeId: "",
                      year: new Date().getFullYear().toString(),
                      // Salary Components
                      basicSalary: "",
                      daVda: "",
                      hrAllowance: "",
                      conveyanceAllowance: "",
                      leaveTravelAllowance: "",
                      medicalAllowance: "",
                      specialAllowance: "",
                      otherAllowance: "",
                      // Other Benefits
                      washingAllowance: "",
                      leaveWithWages: "",
                      bonus: "",
                      nationalFestivalHolidays: "",
                      wagesAdditionalHours: "",
                      relieverCharges: "",
                      // Employee Deductions
                      employeePf: "",
                      employeeEsi: "",
                      pt: "",
                      uniformDeduction: "",
                      medicalInsurance: "",
                      trainingCost: "",
                      labourWelfareFundEmployee: "",
                      // Employer Deductions
                      employerPf: "",
                      employerEsi: "",
                      labourLicense: "",
                      labourWelfareFundEmployer: "",
                      gratuity: "",
                      // Legacy fields
                      pf: "",
                      esi: "",
                      roomRent: "",
                      // Applicable checkboxes
                      basicSalaryApplicable: false,
                      daVdaApplicable: false,
                      hrAllowanceApplicable: false,
                      conveyanceAllowanceApplicable: false,
                      leaveTravelAllowanceApplicable: false,
                      medicalAllowanceApplicable: false,
                      specialAllowanceApplicable: false,
                      otherAllowanceApplicable: false,
                      washingAllowanceApplicable: false,
                      leaveWithWagesApplicable: false,
                      bonusApplicable: false,
                      nationalFestivalHolidaysApplicable: false,
                      wagesAdditionalHoursApplicable: false,
                      relieverChargesApplicable: false,
                      employeePfApplicable: false,
                      employeeEsiApplicable: false,
                      ptApplicable: false,
                      uniformDeductionApplicable: false,
                      medicalInsuranceApplicable: false,
                      trainingCostApplicable: false,
                      labourWelfareFundEmployeeApplicable: false,
                      employerPfApplicable: false,
                      employerEsiApplicable: false,
                      labourLicenseApplicable: false,
                      labourWelfareFundEmployerApplicable: false,
                      gratuityApplicable: false,
                      // Fixed/Variable dropdowns
                      basicSalaryType: "",
                      daVdaType: "",
                      hrAllowanceType: "",
                      conveyanceAllowanceType: "",
                      leaveTravelAllowanceType: "",
                      medicalAllowanceType: "",
                      specialAllowanceType: "",
                      otherAllowanceType: "",
                      washingAllowanceType: "",
                      leaveWithWagesType: "",
                      bonusType: "",
                      nationalFestivalHolidaysType: "",
                      wagesAdditionalHoursType: "",
                      relieverChargesType: "",
                      employeePfType: "",
                      employeeEsiType: "",
                      ptType: "",
                      uniformDeductionType: "",
                      medicalInsuranceType: "",
                      trainingCostType: "",
                      labourWelfareFundEmployeeType: "",
                      employerPfType: "",
                      employerEsiType: "",
                      labourLicenseType: "",
                      labourWelfareFundEmployerType: "",
                      gratuityType: "",
                      // Percentage/Calculation fields
                      basicSalaryPercentage: "",
                      daVdaPercentage: "",
                      hrAllowancePercentage: "",
                      conveyanceAllowancePercentage: "",
                      leaveTravelAllowancePercentage: "",
                      medicalAllowancePercentage: "",
                      specialAllowancePercentage: "",
                      otherAllowancePercentage: "",
                      washingAllowancePercentage: "",
                      leaveWithWagesPercentage: "",
                      bonusPercentage: "",
                      nationalFestivalHolidaysPercentage: "",
                      wagesAdditionalHoursPercentage: "",
                      relieverChargesPercentage: "",
                      employeePfPercentage: "",
                      employeeEsiPercentage: "",
                      ptPercentage: "",
                      uniformDeductionPercentage: "",
                      medicalInsurancePercentage: "",
                      trainingCostPercentage: "",
                      labourWelfareFundEmployeePercentage: "",
                      employerPfPercentage: "",
                      employerEsiPercentage: "",
                      labourLicensePercentage: "",
                      labourWelfareFundEmployerPercentage: "",
                      gratuityPercentage: "",
                    });
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePayrollMaster}
                  disabled={masterCreateLoading}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    theme === "dark"
                      ? "bg-green-700 text-white hover:bg-green-800"
                      : "bg-green-600 text-white hover:bg-green-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {masterCreateLoading ? "Creating..." : "Create Payroll Master"}
                </button>
              </div>
          </div>
        )}
      </div>
    </ManagerDashboardLayout>
  );
}