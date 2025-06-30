"use client";

import React, { useState, useEffect } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { useTheme } from "@/context/ThemeContext";
import { FaUser, FaMapMarkerAlt, FaMoneyCheckAlt, FaIdCard, FaPhoneVolume, FaChevronRight, FaCheckCircle, FaSpinner, FaInfoCircle, FaPaperclip, FaUpload } from "react-icons/fa";

const sections = [
  { id: "personal", title: "Personal Details", icon: FaUser },
  { id: "address", title: "Address Details", icon: FaMapMarkerAlt },
  { id: "bank", title: "Bank Details", icon: FaMoneyCheckAlt },
  { id: "id", title: "Identification Details", icon: FaIdCard },
  { id: "emergency", title: "Emergency Contact", icon: FaPhoneVolume },
  { id: "image", title: "Uploads", icon: FaIdCard },
];

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

  // Handle input changes for each section
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPersonalDetails({ ...personalDetails, [e.target.name]: e.target.value });
  };
  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPersonalDetails({ ...personalDetails, languages: e.target.value });
  };
  const handleAddressChange = (section: "permanentAddress" | "currentAddress", e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressDetails({
      ...addressDetails,
      [section]: { ...addressDetails[section], [e.target.name]: e.target.value }
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
  const handleSingleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleDocStatus(null);
    setSingleDocError(null);
    if (!personalDetails.employeeId) {
      setSingleDocError("Please enter Employee ID in Personal Details first.");
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
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${personalDetails.employeeId}/upload-document`, {
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
  const handleMultiDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setMultiDocStatus(null);
    setMultiDocError(null);
    if (!personalDetails.employeeId) {
      setMultiDocError("Please enter Employee ID in Personal Details first.");
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
      const res = await fetch(`https://cafm.zenapi.co.in/api/kyc/${personalDetails.employeeId}/upload-multiple-documents`, {
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
                      <input name="employeeId" value={personalDetails.employeeId} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} required />
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
                      <select name="gender" value={personalDetails.gender} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`}>
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
                      <input name="nationality" value={personalDetails.nationality} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Religion</label>
                      <input name="religion" value={personalDetails.religion} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Marital Status</label>
                      <input name="maritalStatus" value={personalDetails.maritalStatus} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Blood Group</label>
                      <input name="bloodGroup" value={personalDetails.bloodGroup} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
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
                      <input name="experience" value={personalDetails.experience} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Educational Qualification</label>
                      <input name="educationalQualification" value={personalDetails.educationalQualification} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Languages (comma separated)</label>
                      <input name="languages" value={personalDetails.languages} onChange={handleLanguagesChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Work Type</label>
                      <input name="workType" value={personalDetails.workType} onChange={handlePersonalChange} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "address" && (
                <section className={`rounded-2xl p-6 border shadow-sm ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}`}>
                  <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Address Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - State</label>
                      <input name="state" value={addressDetails.permanentAddress.state} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - City</label>
                      <input name="city" value={addressDetails.permanentAddress.city} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - Street</label>
                      <input name="street" value={addressDetails.permanentAddress.street} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Permanent Address - Postal Code</label>
                      <input name="postalCode" value={addressDetails.permanentAddress.postalCode} onChange={e => handleAddressChange("permanentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - State</label>
                      <input name="state" value={addressDetails.currentAddress.state} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - City</label>
                      <input name="city" value={addressDetails.currentAddress.city} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - Street</label>
                      <input name="street" value={addressDetails.currentAddress.street} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Current Address - Postal Code</label>
                      <input name="postalCode" value={addressDetails.currentAddress.postalCode} onChange={e => handleAddressChange("currentAddress", e)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700 placeholder-gray-500" : "border-gray-300 text-black"}`} />
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

                  {/* Document Upload Section - only in Uploads section, after employee image */}
                  <div className="mt-8">
                    <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}><FaPaperclip /> Upload Documents (Optional)</h2>
                    {/* Single Document Upload */}
                    <form className="mb-6" onSubmit={handleSingleDocUpload} encType="multipart/form-data">
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                          <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Document File</label>
                          <input type="file" accept="*" onChange={e => setSingleDocFile(e.target.files ? e.target.files[0] : null)} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`} />
                        </div>
                        <div className="flex-1">
                          <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Document Type</label>
                          <input type="text" value={singleDocType} onChange={e => setSingleDocType(e.target.value)} placeholder="e.g. aadhar, pan, bankStatement" className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`} />
                        </div>
                        <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"><FaUpload /> Upload</button>
                      </div>
                      {singleDocStatus && <div className="text-green-600 mt-2">{singleDocStatus}</div>}
                      {singleDocError && <div className="text-red-600 mt-2">{singleDocError}</div>}
                    </form>
                    {/* Multiple Documents Upload */}
                    <form onSubmit={handleMultiDocUpload} encType="multipart/form-data">
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className={`block font-medium mb-1 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Select Multiple Documents</label>
                          <input type="file" accept="*" multiple onChange={e => {
                            setMultiDocFiles(e.target.files);
                            setMultiDocTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                            setMultiDocCustomTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                          }} className={`w-full rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-gray-900 text-white border-gray-700" : "border-gray-300 text-black"}`} />
                        </div>
                        {multiDocFiles && multiDocFiles.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <button type="submit" className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold flex items-center gap-2 hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"><FaUpload /> Upload Multiple</button>
                        {multiDocStatus && <div className="text-green-600 mt-2">{multiDocStatus}</div>}
                        {multiDocError && <div className="text-red-600 mt-2">{multiDocError}</div>}
                      </div>
                    </form>
                  </div>
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
                      type="submit"
                      className={`px-8 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"}`}
                      disabled={loading}
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
          </main>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 