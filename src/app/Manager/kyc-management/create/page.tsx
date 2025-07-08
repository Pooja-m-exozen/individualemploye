"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaUser, FaMapMarkerAlt, FaMoneyCheckAlt, FaIdCard, FaPhoneVolume, FaChevronRight, FaCheckCircle, FaSpinner, FaInfoCircle, FaUpload } from "react-icons/fa";
import Image from "next/image";

const sections = [
  { id: "personal", title: "Personal Details", icon: FaUser },
  { id: "address", title: "Address Details", icon: FaMapMarkerAlt },
  { id: "bank", title: "Bank Details", icon: FaMoneyCheckAlt },
  { id: "id", title: "Identification Details", icon: FaIdCard },
  { id: "emergency", title: "Emergency Contact", icon: FaPhoneVolume },
  { id: "image", title: "Uploads", icon: FaIdCard },
];

// Change docUploadComplete state type
type DocUploadCompleteState = false | "show" | true | "single" | "multiple";

export default function CreateKYCPage() {
  const { theme } = useTheme();
  // State for each section
  const [personalDetails, setPersonalDetails] = useState({
    employeeId: "",
    projectName: "",
    fullName: "",
    fathersName: "",
    mothersName: "",
    gender: "",
    dob: "",
    phoneNumber: "",
    designation: "",
    dateOfJoining: "",
    nationality: "",
    religion: "",
    maritalStatus: "",
    bloodGroup: "",
    uanNumber: "",
    esicNumber: "",
    experience: "",
    educationalQualification: "",
    languages: "",
    workType: ""
  });
  const [addressDetails, setAddressDetails] = useState({
    permanentAddress: { state: "", city: "", street: "", postalCode: "" },
    currentAddress: { state: "", city: "", street: "", postalCode: "" }
  });
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [bankDetails, setBankDetails] = useState({ bankName: "", branchName: "", accountNumber: "", ifscCode: "" });
  const [identificationDetails, setIdentificationDetails] = useState({ identificationType: "", identificationNumber: "" });
  const [emergencyContact, setEmergencyContact] = useState({ name: "", phone: "", relationship: "", aadhar: "" });
  const [employeeImage, setEmployeeImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Section navigation state
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  // Progress calculation
  const progress = Math.round((completedSections.length / sections.length) * 100);

  // Instructions panel
  const [showInstructions, setShowInstructions] = useState(true);

  // State for document upload
  const [singleDocFile, setSingleDocFile] = useState<File | null>(null);
  const [singleDocType, setSingleDocType] = useState("");
  const [singleDocStatus, setSingleDocStatus] = useState<string | null>(null);
  const [singleDocError, setSingleDocError] = useState<string | null>(null);
  const [multiDocFiles, setMultiDocFiles] = useState<FileList | null>(null);
  const [multiDocTypes, setMultiDocTypes] = useState<string[]>([""]);
  const [multiDocStatus, setMultiDocStatus] = useState<string | null>(null);
  const [multiDocError, setMultiDocError] = useState<string | null>(null);

  // Document type options for dropdown
  const documentTypeOptions = [
    "aadhar",
    "pan",
    "bankStatement",
    "voterId",
    "drivingLicense",
    "other"
  ];
  const [multiDocCustomTypes, setMultiDocCustomTypes] = useState<string[]>([""]);

  // State for project list
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Seed to force re-fetch of next employee ID after each submission
  const [employeeIdSeed, setEmployeeIdSeed] = useState(0);

  // Replace the languages input and handler
  const languageOptions = [
    "Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", "Gujarati", "Kannada", "Odia", "Punjabi", "Malayalam", "Assamese", "Maithili", "Other"
  ];

  const handleLanguageCheckboxChange = (lang: string) => {
    let langs = personalDetails.languages ? personalDetails.languages.split(",").map(l => l.trim()) : [];
    if (langs.includes(lang)) {
      langs = langs.filter(l => l !== lang);
    } else {
      langs.push(lang);
    }
    setPersonalDetails({ ...personalDetails, languages: langs.join(",") });
  };

  useEffect(() => {
    setProjectLoading(true);
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
        setProjectLoading(false);
      })
      .catch(() => {
        setProjectError("Failed to load projects");
        setProjectLoading(false);
      });
  }, []);

  useEffect(() => {
    // Always fetch ALL KYC forms to find the highest EFMS number
    let maxNum = 3376 - 1;
    let nextId = '';
    fetch('https://cafm.zenapi.co.in/api/kyc')
      .then(res => res.json())
      .then(kycData => {
        // Check ALL KYC forms (not just pending)
        type KYCForm = { personalDetails?: { employeeId?: string } };
        if (kycData && Array.isArray(kycData.kycForms)) {
          kycData.kycForms.forEach((form: KYCForm) => {
            if (form.personalDetails && typeof form.personalDetails.employeeId === 'string' && form.personalDetails.employeeId.startsWith('EFMS')) {
              const num = parseInt(form.personalDetails.employeeId.replace('EFMS', ''));
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
        } else {
          console.warn('KYC data is not as expected:', kycData);
        }
        nextId = `EFMS${maxNum + 1}`;
        setPersonalDetails(prev => ({ ...prev, employeeId: nextId }));
      })
      .catch((err) => {
        console.error('Error fetching next Employee ID:', err);
        nextId = `EFMS${maxNum + 1}`;
        setPersonalDetails(prev => ({ ...prev, employeeId: nextId }));
      });
  }, [employeeIdSeed]);

  // Handle input changes for each section
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPersonalDetails({ ...personalDetails, [e.target.name]: e.target.value });
  };
  const handleAddressChange = (section: "permanentAddress" | "currentAddress", e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressDetails(prev => {
      const updated = {
        ...prev,
        [section]: { ...prev[section], [e.target.name]: e.target.value }
      };
      if (section === "currentAddress" && isSameAddress) {
        updated.permanentAddress = { ...updated.currentAddress };
      }
      return updated;
    });
  };
  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBankDetails({ ...bankDetails, [e.target.name]: e.target.value });
  };
  const handleIdentificationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setIdentificationDetails({ ...identificationDetails, [e.target.name]: e.target.value });
  };
  const handleEmergencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmergencyContact({ ...emergencyContact, [e.target.name]: e.target.value });
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setEmployeeImage(e.target.files[0]);
  };

  // Modal state for post-KYC document upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [kycCreatedEmployeeId, setKycCreatedEmployeeId] = useState<string | null>(null);
  const [docUploadComplete, setDocUploadComplete] = useState<DocUploadCompleteState>(false);

  // Add state for review modal
  const [showReview, setShowReview] = useState(false);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("personalDetails", JSON.stringify({
        ...personalDetails,
        languages: personalDetails.languages.split(",").map((l) => l.trim())
      }));
      formData.append("addressDetails", JSON.stringify(addressDetails));
      formData.append("bankDetails", JSON.stringify(bankDetails));
      formData.append("identificationDetails", JSON.stringify(identificationDetails));
      formData.append("emergencyContact", JSON.stringify(emergencyContact));
      if (employeeImage) formData.append("employeeImage", employeeImage);

      const res = await fetch("https://cafm.zenapi.co.in/api/kyc/submit-and-upload-image", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("KYC details submitted successfully.");
        setKycCreatedEmployeeId(personalDetails.employeeId); // Save for document upload
        setShowUploadModal(true); // Show modal for document upload
        // Reset form fields but not employeeIdSeed yet
        setPersonalDetails({
          employeeId: "",
          projectName: "",
          fullName: "",
          fathersName: "",
          mothersName: "",
          gender: "",
          dob: "",
          phoneNumber: "",
          designation: "",
          dateOfJoining: "",
          nationality: "",
          religion: "",
          maritalStatus: "",
          bloodGroup: "",
          uanNumber: "",
          esicNumber: "",
          experience: "",
          educationalQualification: "",
          languages: "",
          workType: ""
        });
        setAddressDetails({
          permanentAddress: { state: "", city: "", street: "", postalCode: "" },
          currentAddress: { state: "", city: "", street: "", postalCode: "" }
        });
        setBankDetails({ bankName: "", branchName: "", accountNumber: "", ifscCode: "" });
        setIdentificationDetails({ identificationType: "", identificationNumber: "" });
        setEmergencyContact({ name: "", phone: "", relationship: "", aadhar: "" });
        setEmployeeImage(null);
        setSingleDocFile(null);
        setSingleDocType("");
        setSingleDocStatus(null);
        setSingleDocError(null);
        setMultiDocFiles(null);
        setMultiDocTypes([""]);
        setMultiDocStatus(null);
        setMultiDocError(null);
        setMultiDocCustomTypes([""]);
        // Don't increment employeeIdSeed yet; do it after modal is closed
      } else {
        setError(data.message || "Submission failed.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError("Submission failed. " + err.message);
      } else {
        setError("An unexpected error occurred during submission.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for single document upload
  const handleSingleDocUpload = async () => {
    setSingleDocStatus(null);
    setSingleDocError(null);
    if (!kycCreatedEmployeeId) {
      setSingleDocError("Employee ID is missing. Please try again.");
      return;
    }
    if (!singleDocFile || !singleDocType) {
      setSingleDocError("Please select a file and document type.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("document", singleDocFile);
      formData.append("documentType", singleDocType);
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${kycCreatedEmployeeId}/upload-document`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSingleDocStatus("Document uploaded successfully.");
        setSingleDocFile(null);
        setSingleDocType("");
      } else {
        setSingleDocError(data.message || "Upload failed.");
      }
    } catch (err) {
      setSingleDocError("Upload failed. " + (err instanceof Error ? err.message : ""));
    }
  };

  // Handler for multiple documents upload
  const handleMultiDocUpload = async () => {
    setMultiDocStatus(null);
    setMultiDocError(null);
    if (!kycCreatedEmployeeId) {
      setMultiDocError("Employee ID is missing. Please try again.");
      return;
    }
    if (!multiDocFiles || multiDocFiles.length === 0) {
      setMultiDocError("Please select files.");
      return;
    }
    if (multiDocTypes.length !== multiDocFiles.length || multiDocTypes.some(t => !t)) {
      setMultiDocError("Please enter a document type for each file.");
      return;
    }
    try {
      const formData = new FormData();
      Array.from(multiDocFiles).forEach((file) => {
        formData.append("documents", file);
      });
      formData.append("documentTypes", JSON.stringify(multiDocTypes));
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${kycCreatedEmployeeId}/upload-multiple-documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMultiDocStatus("Documents uploaded successfully.");
        setMultiDocFiles(null);
        setMultiDocTypes([""]);
      } else {
        setMultiDocError(data.message || "Upload failed.");
      }
    } catch (err) {
      setMultiDocError("Upload failed. " + (err instanceof Error ? err.message : ""));
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className={`min-h-screen flex flex-col items-center justify-center py-8 transition-colors duration-200 ${theme === "dark" ? "bg-gray-900" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"}`}>
        {/* Modern KYC Header */}
        <div className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg w-full max-w-5xl mx-auto ${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900" : "bg-gradient-to-r from-blue-500 to-blue-800"}`}>
          <div className={`rounded-xl p-4 flex items-center justify-center ${theme === "dark" ? "bg-gray-700" : "bg-blue-600 bg-opacity-30"}`}>
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Create KYC</h1>
            <p className="text-white text-base opacity-90">Fill in the details to create a new KYC record</p>
          </div>
        </div>
        {/* Only the content area below header is scrollable */}
        <div className="w-full max-w-5xl mx-auto h-[calc(100vh-64px-48px)] flex flex-col md:flex-row gap-8">
          {/* Side Navigation */}
          <aside className="md:w-64 flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto">
            <div className={`rounded-2xl p-4 sticky top-8 border shadow ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const isActive = activeSection === section.id;
                  const isCompleted = completedSections.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        isActive
                          ? theme === "dark" ? "bg-gray-700 text-blue-300" : "bg-blue-50 text-blue-700"
                          : isCompleted
                          ? theme === "dark" ? "text-green-400 hover:bg-gray-700" : "text-green-600 hover:bg-blue-50"
                          : theme === "dark" ? "text-gray-400 hover:bg-gray-700" : "text-gray-600 hover:bg-blue-50"
                      }`}
                    >
                      <section.icon className={`w-5 h-5 ${isActive ? (theme === "dark" ? "text-blue-300" : "text-blue-700") : isCompleted ? "text-green-500" : theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                      <span className="font-medium">{section.title}</span>
                      {isCompleted && <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
              {/* Progress Bar */}
              <div className="mt-6 pt-6 border-t border-blue-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>Completion</span>
                  <span className={theme === "dark" ? "text-blue-300" : "text-blue-700"}>{progress}%</span>
                </div>
                <div className={`mt-2 h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-blue-100"}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${theme === "dark" ? "bg-blue-900" : "bg-blue-600"}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
            {/* Instructions/Notes Card - NOT sticky, scrolls with sidebar */}
            <div className={`relative rounded-2xl p-6 border shadow-xl flex flex-col gap-3 items-start transition-all duration-300 hover:shadow-2xl ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
              <button
                onClick={() => setShowInstructions(false)}
                className={`absolute top-3 right-3 ${theme === "dark" ? "text-blue-300 hover:text-blue-500 bg-gray-800" : "text-blue-400 hover:text-blue-700 bg-white"} rounded-full p-1 shadow-sm`}
                title="Dismiss instructions"
              >
                <FaChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-blue-100"}`}>
                  <FaInfoCircle className={`w-6 h-6 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                </div>
                <h3 className={`text-lg font-bold tracking-tight ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>Instructions & Notes</h3>
              </div>
              <ul className={`space-y-2 text-sm pl-2 ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>
                <li>• Please complete all sections for a successful KYC submission.</li>
                <li>• Ensure all uploaded documents are clear and legible.</li>
                <li>• Double-check your details before submitting the form.</li>
                <li>• Fields marked with * are mandatory.</li>
              </ul>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 h-full overflow-y-auto">
            {/* Instructions/Notes Card below timeline */}

            {/* Instructions Panel */}
            {showInstructions && (
              <div className={`rounded-2xl p-6 mb-8 relative border shadow ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                <button
                  onClick={() => setShowInstructions(false)}
                  className={`absolute top-4 right-4 ${theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <FaChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-gray-700" : "bg-blue-100"}`}>
                    <FaInfoCircle className={`w-6 h-6 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>KYC Instructions</h3>
                    <ul className={`space-y-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      <li className="flex items-center gap-2"><FaCheckCircle className="w-4 h-4 text-green-500" /> Fill in all required fields for each section.</li>
                      <li className="flex items-center gap-2"><FaCheckCircle className="w-4 h-4 text-green-500" /> Upload clear and legible documents.</li>
                      <li className="flex items-center gap-2"><FaCheckCircle className="w-4 h-4 text-green-500" /> Double-check your details before submitting.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit} encType="multipart/form-data">
              {/* Section Cards */}
              {activeSection === "personal" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Personal Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Employee ID</label>
                      <input name="employeeId" value={personalDetails.employeeId} readOnly className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Project Name</label>
                      <select
                        name="projectName"
                        value={personalDetails.projectName}
                        onChange={handlePersonalChange}
                        className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`}
                        required
                      >
                        <option value="">{projectLoading ? "Loading projects..." : "Select project..."}</option>
                        {projectList.map(p => (
                          <option key={p._id} value={p.projectName}>{p.projectName}</option>
                        ))}
                      </select>
                      {projectError && <div className="text-red-500 text-xs mt-1">{projectError}</div>}
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Full Name</label>
                      <input name="fullName" value={personalDetails.fullName} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Father&apos;s Name</label>
                      <input name="fathersName" value={personalDetails.fathersName} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Mother&apos;s Name</label>
                      <input name="mothersName" value={personalDetails.mothersName} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Gender</label>
                      <select name="gender" value={personalDetails.gender} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Date of Birth</label>
                      <input name="dob" type="date" value={personalDetails.dob} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Phone Number</label>
                      <input name="phoneNumber" value={personalDetails.phoneNumber} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Designation</label>
                      <input name="designation" value={personalDetails.designation} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Date of Joining</label>
                      <input name="dateOfJoining" type="date" value={personalDetails.dateOfJoining} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Nationality</label>
                      <select name="nationality" value={personalDetails.nationality} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="Indian">Indian</option>
                        <option value="Nepalese">Nepalese</option>
                        <option value="Bangladeshi">Bangladeshi</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Religion</label>
                      <select name="religion" value={personalDetails.religion} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Muslim">Muslim</option>
                        <option value="Christian">Christian</option>
                        <option value="Sikh">Sikh</option>
                        <option value="Buddhist">Buddhist</option>
                        <option value="Jain">Jain</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Marital Status</label>
                      <select name="maritalStatus" value={personalDetails.maritalStatus} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Blood Group</label>
                      <select name="bloodGroup" value={personalDetails.bloodGroup} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>UAN Number</label>
                      <input name="uanNumber" value={personalDetails.uanNumber} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>ESIC Number</label>
                      <input name="esicNumber" value={personalDetails.esicNumber} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Experience</label>
                      <select name="experience" value={personalDetails.experience} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="Fresher">Fresher</option>
                        <option value="0-1 years">0-1 years</option>
                        <option value="1-3 years">1-3 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5+ years">5+ years</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Educational Qualification</label>
                      <select name="educationalQualification" value={personalDetails.educationalQualification} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="Below 10th">Below 10th</option>
                        <option value="10th Pass">10th Pass</option>
                        <option value="12th Pass">12th Pass</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Post Graduate">Post Graduate</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Languages</label>
                      <div className="flex flex-wrap gap-4">
                        {languageOptions.map(lang => (
                          <label key={lang} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={personalDetails.languages.split(",").map(l => l.trim()).includes(lang)}
                              onChange={() => handleLanguageCheckboxChange(lang)}
                              className="form-checkbox"
                            />
                            <span>{lang}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Work Type</label>
                      <select name="workType" value={personalDetails.workType} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required>
                        <option value="">Select</option>
                        <option value="remote">Remote</option>
                        <option value="office">Office</option>
                      </select>
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "address" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Address Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current Address First */}
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - Street</label>
                      <input name="street" value={addressDetails.currentAddress.street} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - City</label>
                      <input name="city" value={addressDetails.currentAddress.city} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - State</label>
                      <input name="state" value={addressDetails.currentAddress.state} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - Postal Code</label>
                      <input name="postalCode" value={addressDetails.currentAddress.postalCode} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    {/* Checkbox for same address */}
                    <div className="md:col-span-2 flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="sameAddress"
                        checked={isSameAddress}
                        onChange={e => {
                          setIsSameAddress(e.target.checked);
                          setAddressDetails(prev => ({
                            ...prev,
                            permanentAddress: e.target.checked ? { ...prev.currentAddress } : { state: "", city: "", street: "", postalCode: "" }
                          }));
                        }}
                        className="mr-2"
                      />
                      <label htmlFor="sameAddress" className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Is Permanent Address same as Current Address?</label>
                    </div>
                    {/* Permanent Address Fields */}
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - Street</label>
                      <input name="street" value={addressDetails.permanentAddress.street} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} disabled={isSameAddress} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - City</label>
                      <input name="city" value={addressDetails.permanentAddress.city} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} disabled={isSameAddress} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - State</label>
                      <input name="state" value={addressDetails.permanentAddress.state} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} disabled={isSameAddress} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - Postal Code</label>
                      <input name="postalCode" value={addressDetails.permanentAddress.postalCode} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} disabled={isSameAddress} />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "bank" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Bank Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Bank Name</label>
                      <input name="bankName" value={bankDetails.bankName} onChange={handleBankChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Branch Name</label>
                      <input name="branchName" value={bankDetails.branchName} onChange={handleBankChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Account Number</label>
                      <input name="accountNumber" value={bankDetails.accountNumber} onChange={handleBankChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>IFSC Code</label>
                      <input name="ifscCode" value={bankDetails.ifscCode} onChange={handleBankChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "id" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Identification Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Identification Type</label>
                      <select name="identificationType" value={identificationDetails.identificationType} onChange={handleIdentificationChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`}>
                        <option value="">Select</option>
                        <option value="Pan Card">Pan Card</option>
                        <option value="Aadhar Card">Aadhar Card</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Driving License">Driving License</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Identification Number</label>
                      <input name="identificationNumber" value={identificationDetails.identificationNumber} onChange={handleIdentificationChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "emergency" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Emergency Contact</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Emergency Contact Name</label>
                      <input name="name" value={emergencyContact.name} onChange={handleEmergencyChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Emergency Contact Phone</label>
                      <input name="phone" value={emergencyContact.phone} onChange={handleEmergencyChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Relationship</label>
                      <input name="relationship" value={emergencyContact.relationship} onChange={handleEmergencyChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Aadhar</label>
                      <input name="aadhar" value={emergencyContact.aadhar} onChange={handleEmergencyChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "image" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Employee Image</h2>
                  <input type="file" accept="image/*" onChange={handleImageChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                </section>
              )}

              {/* Navigation and Submit */}
              <div className="flex items-center justify-between pt-6">
                <button
                  type="button"
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === activeSection);
                    if (idx > 0) setActiveSection(sections[idx - 1].id);
                  }}
                  className={`px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`}
                  disabled={activeSection === sections[0].id}
                >
                  Previous
                </button>
                <div className="flex items-center gap-4">
                  {activeSection !== sections[sections.length - 1].id ? (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = sections.findIndex(s => s.id === activeSection);
                        if (idx < sections.length - 1) setActiveSection(sections[idx + 1].id);
                        if (!completedSections.includes(activeSection)) setCompletedSections([...completedSections, activeSection]);
                      }}
                      className={`px-8 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowReview(true)}
                      className={`px-8 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"}`}
                      disabled={loading || !employeeImage}
                    >
                      {loading ? <span className="flex items-center gap-2"><FaSpinner className="animate-spin" /> Submitting...</span> : "Create KYC"}
                    </button>
                  )}
                </div>
              </div>
              {/* Message */}
              {message && <div className={`text-blue-600 font-medium mt-2 text-center ${theme === "dark" ? "text-blue-300" : ""}`}>{message}</div>}
              {error && <div className={`text-red-600 font-medium mt-2 text-center ${theme === "dark" ? "text-red-300" : ""}`}>{error}</div>}
            </form>
            {/* Modal for document upload after KYC creation */}
            {showUploadModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className={`rounded-2xl p-8 w-full max-w-lg shadow-xl border ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-blue-200"}`}>
                  {/* Modal State Management */}
                  {(!docUploadComplete || docUploadComplete === "single" || docUploadComplete === "multiple") ? (
                    <>
                      <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Successfully created KYC{kycCreatedEmployeeId ? ` for Employee ID: ${kycCreatedEmployeeId}` : ""}</h2>
                      <p className={`mb-6 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Would you like to upload documents now?</p>
                      {/* Show upload options only if not in upload mode */}
                      {docUploadComplete === false && (
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                          <button
                            className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                            onClick={() => setDocUploadComplete("single")}
                          >
                            Upload Single Document
                          </button>
                          <button
                            className="px-6 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
                            onClick={() => setDocUploadComplete("multiple")}
                          >
                            Upload Multiple Documents
                          </button>
                          <button
                            className="px-6 py-2 rounded-xl bg-gray-300 text-gray-800 font-bold hover:bg-gray-400"
                            onClick={() => {
                              setShowUploadModal(false);
                              setDocUploadComplete(false);
                              setKycCreatedEmployeeId(null);
                              setEmployeeIdSeed(seed => seed + 1);
                              setActiveSection("personal");
                            }}
                          >
                            No, Start New KYC
                          </button>
                        </div>
                      )}
                      {/* Single Document Upload UI */}
                      {docUploadComplete === "single" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="font-semibold mb-2">Single Document Upload</h3>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                              <div className="flex-1">
                                <input type="file" accept="*" onChange={e => setSingleDocFile(e.target.files ? e.target.files[0] : null)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`} />
                              </div>
                              <div className="flex-1">
                                <input type="text" value={singleDocType} onChange={e => setSingleDocType(e.target.value)} placeholder="e.g. aadhar, pan, bankStatement" className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`} />
                              </div>
                              <button type="button" onClick={async () => {
                                await handleSingleDocUpload();
                                if (!singleDocError) setDocUploadComplete(true);
                              }} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"><FaUpload /> Upload</button>
                            </div>
                            {singleDocStatus && <div className="text-green-600 mt-2">{singleDocStatus}</div>}
                            {singleDocError && <div className="text-red-600 mt-2">{singleDocError}</div>}
                          </div>
                          <button
                            className="mt-6 px-6 py-2 rounded-xl bg-gray-300 text-gray-800 font-bold hover:bg-gray-400"
                            onClick={() => {
                              setShowUploadModal(false);
                              setDocUploadComplete(false);
                              setKycCreatedEmployeeId(null);
                              setEmployeeIdSeed(seed => seed + 1);
                              setActiveSection("personal");
                            }}
                          >
                            Done, Start New KYC
                          </button>
                        </div>
                      )}
                      {/* Multiple Documents Upload UI */}
                      {docUploadComplete === "multiple" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="font-semibold mb-2">Multiple Documents Upload</h3>
                            <input type="file" accept="*" multiple onChange={e => {
                              setMultiDocFiles(e.target.files);
                              setMultiDocTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                              setMultiDocCustomTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                            }} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`} />
                            {multiDocFiles && multiDocFiles.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {Array.from(multiDocFiles).map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="truncate flex-1">{file.name}</span>
                                    <select
                                      value={multiDocTypes[idx] === undefined ? "" : (documentTypeOptions.includes(multiDocTypes[idx]) ? multiDocTypes[idx] : "other")}
                                      onChange={e => {
                                        const newTypes = [...multiDocTypes];
                                        if (e.target.value === "other") {
                                          newTypes[idx] = multiDocCustomTypes[idx] || "";
                                        } else {
                                          newTypes[idx] = e.target.value;
                                        }
                                        setMultiDocTypes(newTypes);
                                        if (e.target.value !== "other") {
                                          const newCustom = [...multiDocCustomTypes];
                                          newCustom[idx] = "";
                                          setMultiDocCustomTypes(newCustom);
                                        }
                                      }}
                                      className={`rounded-lg px-2 py-1 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`}
                                    >
                                      <option value="">Select Type</option>
                                      {documentTypeOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                      ))}
                                    </select>
                                    {((multiDocTypes[idx] && !documentTypeOptions.includes(multiDocTypes[idx])) || (multiDocTypes[idx] === "" && multiDocCustomTypes[idx])) && (
                                      <input
                                        type="text"
                                        placeholder="Custom Type"
                                        value={multiDocCustomTypes[idx] || ""}
                                        onChange={e => {
                                          const newCustom = [...multiDocCustomTypes];
                                          newCustom[idx] = e.target.value;
                                          setMultiDocCustomTypes(newCustom);
                                          // Also update multiDocTypes to use the custom value
                                          const newTypes = [...multiDocTypes];
                                          newTypes[idx] = e.target.value;
                                          setMultiDocTypes(newTypes);
                                        }}
                                        className={`rounded-lg px-2 py-1 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <button type="button" onClick={async () => {
                              await handleMultiDocUpload();
                              if (!multiDocError) setDocUploadComplete(true);
                            }} className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold flex items-center gap-2 hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"><FaUpload /> Upload Multiple</button>
                            {multiDocStatus && <div className="text-green-600 mt-2">{multiDocStatus}</div>}
                            {multiDocError && <div className="text-red-600 mt-2">{multiDocError}</div>}
                          </div>
                          <button
                            className="mt-6 px-6 py-2 rounded-xl bg-gray-300 text-gray-800 font-bold hover:bg-gray-400"
                            onClick={() => {
                              setShowUploadModal(false);
                              setDocUploadComplete(false);
                              setKycCreatedEmployeeId(null);
                              setEmployeeIdSeed(seed => seed + 1);
                              setActiveSection("personal");
                            }}
                          >
                            Done, Start New KYC
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FaCheckCircle className="w-12 h-12 text-green-500 mb-4" />
                      <p className="text-lg font-bold mb-4">Documents uploaded successfully!</p>
                      <button
                        className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                        onClick={() => {
                          setShowUploadModal(false);
                          setDocUploadComplete(false);
                          setKycCreatedEmployeeId(null);
                          setEmployeeIdSeed(seed => seed + 1);
                          setActiveSection("personal");
                        }}
                      >
                        Start New KYC
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Review Modal */}
            {showReview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className={`rounded-2xl w-full max-w-3xl shadow-xl border flex flex-col ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-blue-200"}`}> 
                  {/* Header */}
                  <div className="px-8 pt-8 pb-4 border-b flex items-center gap-4">
                    <FaCheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                    <div>
                      <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Review KYC Details</h2>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Please confirm all information before submitting.</p>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="overflow-y-auto px-8 py-6 max-h-[60vh] space-y-6">
                    {/* Employee Image and Key Info */}
                    <div className="flex flex-col items-center mb-4">
                      {employeeImage ? (
                        <Image
                          src={URL.createObjectURL(employeeImage)}
                          alt="Employee"
                          width={112}
                          height={112}
                          className="w-28 h-28 object-cover rounded-full border-4 border-blue-200 shadow"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 text-4xl">?</div>
                      )}
                      <div className="mt-3 text-lg font-bold text-blue-700 dark:text-blue-200">{personalDetails.fullName || <span className="text-gray-400">No Name</span>}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Employee ID: <span className="font-semibold">{personalDetails.employeeId || "-"}</span></div>
                    </div>
                    {/* Section Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Personal Details */}
                      <div className={`rounded-xl p-4 shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex items-center gap-2 mb-2"><FaUser className="text-blue-500" /><span className="font-semibold">Personal Details</span></div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                          {Object.entries(personalDetails).filter(([, v]) => v).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span><span className="font-medium">{value as string}</span></div>
                          ))}
                        </div>
                      </div>
                      {/* Address Details */}
                      <div className={`rounded-xl p-4 shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex items-center gap-2 mb-2"><FaMapMarkerAlt className="text-blue-500" /><span className="font-semibold">Address Details</span></div>
                        <div className="mb-2 text-xs text-gray-400">Current Address</div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-1 mb-2">
                          {Object.entries(addressDetails.currentAddress).filter(([, v]) => v).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span><span className="font-medium">{value as string}</span></div>
                          ))}
                        </div>
                        <div className="mb-2 text-xs text-gray-400">Permanent Address</div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                          {Object.entries(addressDetails.permanentAddress).filter(([, v]) => v).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span><span className="font-medium">{value as string}</span></div>
                          ))}
                        </div>
                      </div>
                      {/* Bank Details */}
                      <div className={`rounded-xl p-4 shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex items-center gap-2 mb-2"><FaMoneyCheckAlt className="text-blue-500" /><span className="font-semibold">Bank Details</span></div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                          {Object.entries(bankDetails).filter(([, v]) => v).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span><span className="font-medium">{value as string}</span></div>
                          ))}
                        </div>
                      </div>
                      {/* Identification Details */}
                      <div className={`rounded-xl p-4 shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex items-center gap-2 mb-2"><FaIdCard className="text-blue-500" /><span className="font-semibold">Identification Details</span></div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                          {Object.entries(identificationDetails).filter(([, v]) => v).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span><span className="font-medium">{value as string}</span></div>
                          ))}
                        </div>
                      </div>
                      {/* Emergency Contact */}
                      <div className={`rounded-xl p-4 shadow border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex items-center gap-2 mb-2"><FaPhoneVolume className="text-blue-500" /><span className="font-semibold">Emergency Contact</span></div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                          {Object.entries(emergencyContact).filter(([, v]) => v).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span><span className="font-medium">{value as string}</span></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Sticky Footer */}
                  <div className="sticky bottom-0 left-0 w-full bg-inherit px-8 py-4 border-t flex justify-end gap-4 z-10">
                    <button
                      className="px-6 py-2 rounded-xl bg-gray-300 text-gray-800 font-bold hover:bg-gray-400"
                      onClick={() => setShowReview(false)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
                      onClick={() => {
                        setShowReview(false);
                        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 