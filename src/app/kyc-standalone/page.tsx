"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FaUser, FaMapMarkerAlt, FaMoneyCheckAlt, FaIdCard, FaPhoneVolume, FaChevronRight, FaCheckCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

const sections = [
  { id: "personal", title: "Personal Details", icon: FaUser },
  { id: "address", title: "Address Details", icon: FaMapMarkerAlt },
  { id: "bank", title: "Bank Details", icon: FaMoneyCheckAlt },
  { id: "id", title: "Identification Details", icon: FaIdCard },
  { id: "emergency", title: "Emergency Contact", icon: FaPhoneVolume },
  { id: "image", title: "Uploads", icon: FaIdCard },
];

function StandaloneKYCPageContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  
  // Get project from URL parameters
  const projectFromUrl = searchParams?.get('project') || '';
  const isFrozen = searchParams?.get('frozen') === 'true';
  
  // State for each section
  const [personalDetails, setPersonalDetails] = useState({
    employeeId: "",
    projectName: projectFromUrl || "",
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
  
  // Add state for auto-generate employee ID
  const [autoGenerateEmployeeId, setAutoGenerateEmployeeId] = useState(true);
  const [employeeIdError, setEmployeeIdError] = useState<string | null>(null);
  
  // Seed to force re-fetch of next employee ID after each submission
  const [employeeIdSeed, setEmployeeIdSeed] = useState(0);
  
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

  // State for project list
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string, designationWiseCount?: Record<string, number> }[]>([]);
  
  // State for designations based on selected project
  const [availableDesignations, setAvailableDesignations] = useState<string[]>([]);
  const [designationLoading, setDesignationLoading] = useState(false);
  
  // State for document upload
  const [singleDocFile, setSingleDocFile] = useState<File | null>(null);
  const [singleDocType, setSingleDocType] = useState("");
  const [singleDocStatus, setSingleDocStatus] = useState<string | null>(null);
  const [singleDocError, setSingleDocError] = useState<string | null>(null);
  const [multiDocFiles, setMultiDocFiles] = useState<FileList | null>(null);
  const [multiDocTypes, setMultiDocTypes] = useState<string[]>([""]);
  const [multiDocStatus, setMultiDocStatus] = useState<string | null>(null);
  const [multiDocError, setMultiDocError] = useState<string | null>(null);
  const [multiDocCustomTypes, setMultiDocCustomTypes] = useState<string[]>([""]);
  
  // Document type options for dropdown
  const documentTypeOptions = [
    "aadhar",
    "pan",
    "bankStatement",
    "voterId",
    "drivingLicense",
    "other"
  ];
  
  // Language options for checkbox selection
  const languageOptions = [
    "Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", "Gujarati", "Kannada", "Odia", "Punjabi", "Malayalam", "Assamese", "Maithili", "Other"
  ];

  // Modal state for post-KYC document upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [kycCreatedEmployeeId, setKycCreatedEmployeeId] = useState<string | null>(null);
  const [docUploadComplete, setDocUploadComplete] = useState<false | "show" | true | "single" | "multiple">(false);

  const fetchProjects = async () => {
    try {
      const response = await fetch("https://cafm.zenapi.co.in/api/project/projects");
      const data = await response.json();
      const allProjects = Array.isArray(data) ? data : [];
      setProjectList(allProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchDesignationsForProject = useCallback((projectName: string) => {
    setDesignationLoading(true);
    try {
      // Find the project in the already loaded project list
      const selectedProject = projectList.find(project => project.projectName === projectName);
      if (selectedProject && selectedProject.designationWiseCount) {
        // Extract designations from the designationWiseCount object
        const designations = Object.keys(selectedProject.designationWiseCount);
        setAvailableDesignations(designations);
      } else {
        setAvailableDesignations([]);
      }
    } catch (error) {
      console.error('Error extracting designations:', error);
      setAvailableDesignations([]);
    } finally {
      setDesignationLoading(false);
    }
  }, [projectList]);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Auto-generate employee ID logic
  useEffect(() => {
    if (!autoGenerateEmployeeId) return;
    
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
  }, [employeeIdSeed, autoGenerateEmployeeId]);

  // Handle pre-selected project from URL
  useEffect(() => {
    if (projectFromUrl && projectList.length > 0) {
      setPersonalDetails(prev => ({ ...prev, projectName: projectFromUrl }));
    }
  }, [projectFromUrl, projectList]);

  // Fetch designations when project is selected
  useEffect(() => {
    if (personalDetails.projectName && projectList.length > 0) {
      fetchDesignationsForProject(personalDetails.projectName);
    }
  }, [personalDetails.projectName, projectList, fetchDesignationsForProject]);

  // Update current address when permanent address changes and same address is checked
  useEffect(() => {
    if (isSameAddress) {
      setAddressDetails(prev => ({
        ...prev,
        currentAddress: { ...prev.permanentAddress }
      }));
    }
  }, [addressDetails.permanentAddress, isSameAddress]);

  // Handle language checkbox change
  const handleLanguageCheckboxChange = (lang: string) => {
    let langs = personalDetails.languages ? personalDetails.languages.split(",").map(l => l.trim()) : [];
    if (langs.includes(lang)) {
      langs = langs.filter(l => l !== lang);
    } else {
      langs.push(lang);
    }
    setPersonalDetails({ ...personalDetails, languages: langs.join(", ") });
  };

  // Handle auto-generate checkbox change
  const handleAutoGenerateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoGenerateEmployeeId(e.target.checked);
    setEmployeeIdError(null);
    
    if (e.target.checked) {
      // Trigger auto-generation
      setEmployeeIdSeed(prev => prev + 1);
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
        setSingleDocStatus("Document uploaded successfully!");
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
        setMultiDocStatus("Documents uploaded successfully!");
        setMultiDocFiles(null);
        setMultiDocTypes([""]);
        setMultiDocCustomTypes([""]);
      } else {
        setMultiDocError(data.message || "Upload failed.");
      }
    } catch (err) {
      setMultiDocError("Upload failed. " + (err instanceof Error ? err.message : ""));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Basic validation
    if (!personalDetails.employeeId) {
      setError('Employee ID is required');
      setLoading(false);
      return;
    }

    if (!personalDetails.projectName) {
      setError('Project name is required');
      setLoading(false);
      return;
    }

    if (!personalDetails.fullName) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    if (!personalDetails.phoneNumber) {
      setError('Phone number is required');
      setLoading(false);
      return;
    }

    if (!personalDetails.designation) {
      setError('Designation is required');
      setLoading(false);
      return;
    }

    if (!personalDetails.dateOfJoining) {
      setError('Date of joining is required');
      setLoading(false);
      return;
    }

    try {
      // Use the same endpoint as the Manager KYC page
      const formData = new FormData();
      formData.append("personalDetails", JSON.stringify({
        ...personalDetails,
        languages: personalDetails.languages ? personalDetails.languages.split(",").map((l) => l.trim()) : []
      }));
      formData.append("addressDetails", JSON.stringify(addressDetails));
      formData.append("bankDetails", JSON.stringify(bankDetails));
      formData.append("identificationDetails", JSON.stringify(identificationDetails));
      formData.append("emergencyContact", JSON.stringify(emergencyContact));
      if (employeeImage) formData.append("employeeImage", employeeImage);

      const response = await fetch("https://cafm.zenapi.co.in/api/kyc/submit-and-upload-image", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        setMessage('KYC form submitted successfully!');
        setKycCreatedEmployeeId(personalDetails.employeeId); // Save for document upload
        setShowUploadModal(true); // Show modal for document upload
        // Reset form
        setPersonalDetails({
          employeeId: "",
          projectName: projectFromUrl || "",
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
        setCompletedSections([]);
        setActiveSection(sections[0].id);
        // Reset document upload states
        setSingleDocFile(null);
        setSingleDocType("");
        setSingleDocStatus(null);
        setSingleDocError(null);
        setMultiDocFiles(null);
        setMultiDocTypes([""]);
        setMultiDocStatus(null);
        setMultiDocError(null);
        setMultiDocCustomTypes([""]);
        // Increment seed to generate new employee ID
        setEmployeeIdSeed(prev => prev + 1);
      } else {
        const data = await response.json();
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

  const renderPersonalDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="autoGenerateEmployeeId"
              checked={autoGenerateEmployeeId}
              onChange={handleAutoGenerateChange}
              className="mr-2"
            />
            <label htmlFor="autoGenerateEmployeeId" className="text-sm font-medium">Auto-generate Employee ID</label>
          </div>
          <input
            type="text"
            value={personalDetails.employeeId}
            onChange={(e) => setPersonalDetails({...personalDetails, employeeId: e.target.value})}
            disabled={autoGenerateEmployeeId}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${autoGenerateEmployeeId ? 'opacity-50 cursor-not-allowed' : ''}`}
            required
          />
          {employeeIdError && (
            <p className="text-sm text-red-600 mt-1">{employeeIdError}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Project Name *</label>
          <select
            value={personalDetails.projectName}
            onChange={(e) => setPersonalDetails({...personalDetails, projectName: e.target.value})}
            disabled={isFrozen}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
            required
          >
            <option value="">Select Project</option>
            {projectList.map((project) => (
              <option key={project._id} value={project.projectName}>
                {project.projectName}
              </option>
            ))}
          </select>
          {isFrozen && (
            <p className="text-sm text-blue-600 mt-1">Project is locked and cannot be changed</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name *</label>
          <input
            type="text"
            value={personalDetails.fullName}
            onChange={(e) => setPersonalDetails({...personalDetails, fullName: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Phone Number *</label>
          <input
            type="tel"
            value={personalDetails.phoneNumber}
            onChange={(e) => setPersonalDetails({...personalDetails, phoneNumber: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Designation *</label>
          <select
            value={personalDetails.designation}
            onChange={(e) => setPersonalDetails({...personalDetails, designation: e.target.value})}
            disabled={designationLoading || !personalDetails.projectName}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${designationLoading || !personalDetails.projectName ? 'opacity-50 cursor-not-allowed' : ''}`}
            required
          >
            <option value="">
              {designationLoading ? 'Loading designations...' : !personalDetails.projectName ? 'Select project first' : 'Select Designation'}
            </option>
            {availableDesignations.map((designation) => (
              <option key={designation} value={designation}>
                {designation}
              </option>
            ))}
          </select>
          {personalDetails.projectName && !designationLoading && availableDesignations.length === 0 && (
            <p className="text-sm text-yellow-600 mt-1">No designations available for this project</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Date of Joining *</label>
          <input
            type="date"
            value={personalDetails.dateOfJoining}
            onChange={(e) => setPersonalDetails({...personalDetails, dateOfJoining: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Father&apos;s Name *</label>
          <input
            type="text"
            value={personalDetails.fathersName}
            onChange={(e) => setPersonalDetails({...personalDetails, fathersName: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Mother&apos;s Name *</label>
          <input
            type="text"
            value={personalDetails.mothersName}
            onChange={(e) => setPersonalDetails({...personalDetails, mothersName: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Gender *</label>
          <select
            value={personalDetails.gender}
            onChange={(e) => setPersonalDetails({...personalDetails, gender: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Date of Birth *</label>
          <input
            type="date"
            value={personalDetails.dob}
            onChange={(e) => setPersonalDetails({...personalDetails, dob: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Nationality *</label>
          <input
            type="text"
            value={personalDetails.nationality}
            onChange={(e) => setPersonalDetails({...personalDetails, nationality: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Religion *</label>
          <input
            type="text"
            value={personalDetails.religion}
            onChange={(e) => setPersonalDetails({...personalDetails, religion: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Marital Status *</label>
          <select
            value={personalDetails.maritalStatus}
            onChange={(e) => setPersonalDetails({...personalDetails, maritalStatus: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          >
            <option value="">Select Marital Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Blood Group *</label>
          <select
            value={personalDetails.bloodGroup}
            onChange={(e) => setPersonalDetails({...personalDetails, bloodGroup: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">UAN Number</label>
          <input
            type="text"
            value={personalDetails.uanNumber}
            onChange={(e) => setPersonalDetails({...personalDetails, uanNumber: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">ESIC Number</label>
          <input
            type="text"
            value={personalDetails.esicNumber}
            onChange={(e) => setPersonalDetails({...personalDetails, esicNumber: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Experience (Years) *</label>
          <input
            type="number"
            value={personalDetails.experience}
            onChange={(e) => setPersonalDetails({...personalDetails, experience: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Educational Qualification *</label>
          <input
            type="text"
            value={personalDetails.educationalQualification}
            onChange={(e) => setPersonalDetails({...personalDetails, educationalQualification: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Languages Known *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
            {languageOptions.map((lang) => {
              const isSelected = personalDetails.languages ? personalDetails.languages.split(",").map(l => l.trim()).includes(lang) : false;
              return (
                <label key={lang} className="flex items-center text-sm">
          <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleLanguageCheckboxChange(lang)}
                    className="mr-2"
                  />
                  {lang}
                </label>
              );
            })}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Work Type *</label>
          <select
            value={personalDetails.workType}
            onChange={(e) => setPersonalDetails({...personalDetails, workType: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          >
            <option value="">Select Work Type</option>
            <option value="remote">Remote</option>
            <option value="office">Office</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAddressDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="sameAddress"
          checked={isSameAddress}
          onChange={(e) => {
            setIsSameAddress(e.target.checked);
            if (e.target.checked) {
              setAddressDetails({
                ...addressDetails,
                currentAddress: { ...addressDetails.permanentAddress }
              });
            }
          }}
          className="mr-2"
        />
        <label htmlFor="sameAddress" className="text-sm font-medium">Same as permanent address</label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Permanent Address</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Street Address"
              value={addressDetails.permanentAddress.street}
              onChange={(e) => setAddressDetails({
                ...addressDetails,
                permanentAddress: {...addressDetails.permanentAddress, street: e.target.value}
              })}
              className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="City"
                value={addressDetails.permanentAddress.city}
                onChange={(e) => setAddressDetails({
                  ...addressDetails,
                  permanentAddress: {...addressDetails.permanentAddress, city: e.target.value}
                })}
                className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <input
                type="text"
                placeholder="State"
                value={addressDetails.permanentAddress.state}
                onChange={(e) => setAddressDetails({
                  ...addressDetails,
                  permanentAddress: {...addressDetails.permanentAddress, state: e.target.value}
                })}
                className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            <input
              type="text"
              placeholder="Postal Code"
              value={addressDetails.permanentAddress.postalCode}
              onChange={(e) => setAddressDetails({
                ...addressDetails,
                permanentAddress: {...addressDetails.permanentAddress, postalCode: e.target.value}
              })}
              className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Current Address</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Street Address"
              value={addressDetails.currentAddress.street}
              onChange={(e) => setAddressDetails({
                ...addressDetails,
                currentAddress: {...addressDetails.currentAddress, street: e.target.value}
              })}
              disabled={isSameAddress}
              className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isSameAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="City"
                value={addressDetails.currentAddress.city}
                onChange={(e) => setAddressDetails({
                  ...addressDetails,
                  currentAddress: {...addressDetails.currentAddress, city: e.target.value}
                })}
                disabled={isSameAddress}
                className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isSameAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <input
                type="text"
                placeholder="State"
                value={addressDetails.currentAddress.state}
                onChange={(e) => setAddressDetails({
                  ...addressDetails,
                  currentAddress: {...addressDetails.currentAddress, state: e.target.value}
                })}
                disabled={isSameAddress}
                className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isSameAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            <input
              type="text"
              placeholder="Postal Code"
              value={addressDetails.currentAddress.postalCode}
              onChange={(e) => setAddressDetails({
                ...addressDetails,
                currentAddress: {...addressDetails.currentAddress, postalCode: e.target.value}
              })}
              disabled={isSameAddress}
              className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isSameAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Bank Name *</label>
          <input
            type="text"
            value={bankDetails.bankName}
            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Branch Name *</label>
          <input
            type="text"
            value={bankDetails.branchName}
            onChange={(e) => setBankDetails({...bankDetails, branchName: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Account Number *</label>
          <input
            type="text"
            value={bankDetails.accountNumber}
            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">IFSC Code *</label>
          <input
            type="text"
            value={bankDetails.ifscCode}
            onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>
    </div>
  );

  const renderIdentificationDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Identification Type *</label>
          <select
            value={identificationDetails.identificationType}
            onChange={(e) => setIdentificationDetails({...identificationDetails, identificationType: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          >
            <option value="">Select Type</option>
            <option value="aadhar">Aadhar Card</option>
            <option value="pan">PAN Card</option>
            <option value="passport">Passport</option>
            <option value="driving">Driving License</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Identification Number *</label>
          <input
            type="text"
            value={identificationDetails.identificationNumber}
            onChange={(e) => setIdentificationDetails({...identificationDetails, identificationNumber: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>
    </div>
  );

  const renderEmergencyContact = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Contact Name *</label>
          <input
            type="text"
            value={emergencyContact.name}
            onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Phone Number *</label>
          <input
            type="tel"
            value={emergencyContact.phone}
            onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Relationship *</label>
          <input
            type="text"
            value={emergencyContact.relationship}
            onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Aadhar Number</label>
          <input
            type="text"
            value={emergencyContact.aadhar}
            onChange={(e) => setEmergencyContact({...emergencyContact, aadhar: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
      </div>
    </div>
  );

  const renderImageUpload = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Employee Photo</label>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {employeeImage ? (
              <Image
                src={URL.createObjectURL(employeeImage)}
                alt="Employee"
                width={100}
                height={100}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <FaUser className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEmployeeImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Single Document Upload */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Single Document Upload</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Document Type</label>
            <select
              value={singleDocType}
              onChange={(e) => setSingleDocType(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">Select Document Type</option>
              {documentTypeOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Upload File</label>
            <input
              type="file"
              accept="*"
              onChange={(e) => setSingleDocFile(e.target.files?.[0] || null)}
              className={`w-full rounded-lg px-4 py-2 border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
            />
          </div>
          {singleDocError && (
            <div className="text-red-600 text-sm">{singleDocError}</div>
          )}
          {singleDocStatus && (
            <div className="text-green-600 text-sm">{singleDocStatus}</div>
          )}
        </div>
      </div>

      {/* Multiple Document Upload */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Multiple Document Upload</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Upload Files</label>
            <input
              type="file"
              accept="*"
              multiple
              onChange={(e) => {
                setMultiDocFiles(e.target.files);
                setMultiDocTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                setMultiDocCustomTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
              }}
              className={`w-full rounded-lg px-4 py-2 border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
            />
          </div>
          {multiDocFiles && multiDocFiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {Array.from(multiDocFiles).map((file, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="truncate flex-1">{file.name}</span>
                  <select
                    value={multiDocTypes[idx] === undefined ? "" : (documentTypeOptions.includes(multiDocTypes[idx]) ? multiDocTypes[idx] : "other")}
                    onChange={(e) => {
                      const newTypes = [...multiDocTypes];
                      if (e.target.value === "other") {
                        newTypes[idx] = multiDocCustomTypes[idx] || "";
                      } else {
                        newTypes[idx] = e.target.value;
                      }
                      setMultiDocTypes(newTypes);
                    }}
                    className={`rounded-lg px-2 py-1 border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
                  >
                    <option value="">Select Type</option>
                    {documentTypeOptions.map(opt => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                  {((multiDocTypes[idx] && !documentTypeOptions.includes(multiDocTypes[idx])) || (multiDocTypes[idx] === "" && multiDocCustomTypes[idx])) && (
                    <input
                      type="text"
                      placeholder="Custom Type"
                      value={multiDocCustomTypes[idx] || ""}
                      onChange={(e) => {
                        const newCustomTypes = [...multiDocCustomTypes];
                        newCustomTypes[idx] = e.target.value;
                        setMultiDocCustomTypes(newCustomTypes);
                        const newTypes = [...multiDocTypes];
                        newTypes[idx] = e.target.value;
                        setMultiDocTypes(newTypes);
                      }}
                      className={`rounded-lg px-2 py-1 border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {multiDocError && (
            <div className="text-red-600 text-sm">{multiDocError}</div>
          )}
          {multiDocStatus && (
            <div className="text-green-600 text-sm">{multiDocStatus}</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'personal':
        return renderPersonalDetails();
      case 'address':
        return renderAddressDetails();
      case 'bank':
        return renderBankDetails();
      case 'id':
        return renderIdentificationDetails();
      case 'emergency':
        return renderEmergencyContact();
      case 'image':
        return renderImageUpload();
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Image
                src="/v1/employee/logo-exo .png"
                alt="Exozen Logo"
                width={40}
                height={40}
                className="rounded-xl shadow-sm"
              />
              <h1 className={`ml-3 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                KYC Form
              </h1>
            </div>
            {isFrozen && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Project: {projectFromUrl}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <h2 className="text-lg font-semibold mb-4">Form Sections</h2>
              <div className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isCompleted = completedSections.includes(section.id);
                  const isActive = activeSection === section.id;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        isActive
                          ? theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-700'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="font-medium">{section.title}</span>
                      </div>
                      {isCompleted && (
                        <FaCheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Progress */}
              <div className="mt-6">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {sections.find(s => s.id === activeSection)?.title}
                </h2>
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <FaInfoCircle className="w-4 h-4 mr-1" />
                  {showInstructions ? 'Hide' : 'Show'} Instructions
                </button>
              </div>

              {showInstructions && (
                <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Please fill out all required fields marked with *. You can navigate between sections using the sidebar.
                    {isFrozen && ` The project "${projectFromUrl}" is pre-selected and cannot be changed.`}
                  </p>
                </div>
              )}

              {renderSectionContent()}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  disabled={activeSection === sections[0].id}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Previous
                </button>

                {activeSection === sections[sections.length - 1].id ? (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !personalDetails.employeeId || !personalDetails.projectName || !personalDetails.fullName || !personalDetails.phoneNumber || !personalDetails.designation || !personalDetails.dateOfJoining}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit KYC'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const currentIndex = sections.findIndex(s => s.id === activeSection);
                      if (currentIndex < sections.length - 1) {
                        setActiveSection(sections[currentIndex + 1].id);
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center"
                  >
                    Next
                    <FaChevronRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>

              {message && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for document upload after KYC creation */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-2xl p-8 w-full max-w-lg shadow-xl border ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-blue-200"}`}>
            {/* Modal State Management */}
            {(!docUploadComplete || docUploadComplete === "single" || docUploadComplete === "multiple") ? (
              <>
                <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>
                  Upload Documents
                </h2>
                <p className={`mb-6 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  KYC created successfully! You can now upload additional documents for employee ID: <strong>{kycCreatedEmployeeId}</strong>
                </p>

                {/* Single Document Upload */}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Single Document Upload
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Document Type
                      </label>
                      <select
                        value={singleDocType}
                        onChange={(e) => setSingleDocType(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Select Document Type</option>
                        {documentTypeOptions.map(option => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Upload File
                      </label>
                      <input
                        type="file"
                        accept="*"
                        onChange={(e) => setSingleDocFile(e.target.files?.[0] || null)}
                        className={`w-full rounded-lg px-4 py-2 border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
                      />
                    </div>
                    {singleDocError && (
                      <div className="text-red-600 text-sm">{singleDocError}</div>
                    )}
                    {singleDocStatus && (
                      <div className="text-green-600 text-sm">{singleDocStatus}</div>
                    )}
                    <button
                      onClick={handleSingleDocUpload}
                      disabled={!singleDocFile || !singleDocType}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Upload Single Document
                    </button>
                  </div>
                </div>

                {/* Multiple Document Upload */}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Multiple Document Upload
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Upload Files
                      </label>
                      <input
                        type="file"
                        accept="*"
                        multiple
                        onChange={(e) => {
                          setMultiDocFiles(e.target.files);
                          setMultiDocTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                          setMultiDocCustomTypes(e.target.files ? Array(e.target.files.length).fill("") : [""]);
                        }}
                        className={`w-full rounded-lg px-4 py-2 border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
                      />
                    </div>
                    {multiDocFiles && multiDocFiles.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {Array.from(multiDocFiles).map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="truncate flex-1 text-sm">{file.name}</span>
                            <select
                              value={multiDocTypes[idx] === undefined ? "" : (documentTypeOptions.includes(multiDocTypes[idx]) ? multiDocTypes[idx] : "other")}
                              onChange={(e) => {
                                const newTypes = [...multiDocTypes];
                                if (e.target.value === "other") {
                                  newTypes[idx] = multiDocCustomTypes[idx] || "";
                                } else {
                                  newTypes[idx] = e.target.value;
                                }
                                setMultiDocTypes(newTypes);
                              }}
                              className={`rounded-lg px-2 py-1 border text-sm ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
                            >
                              <option value="">Select Type</option>
                              {documentTypeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                              ))}
                              <option value="other">Other</option>
                            </select>
                            {((multiDocTypes[idx] && !documentTypeOptions.includes(multiDocTypes[idx])) || (multiDocTypes[idx] === "" && multiDocCustomTypes[idx])) && (
                              <input
                                type="text"
                                placeholder="Custom Type"
                                value={multiDocCustomTypes[idx] || ""}
                                onChange={(e) => {
                                  const newCustomTypes = [...multiDocCustomTypes];
                                  newCustomTypes[idx] = e.target.value;
                                  setMultiDocCustomTypes(newCustomTypes);
                                  const newTypes = [...multiDocTypes];
                                  newTypes[idx] = e.target.value;
                                  setMultiDocTypes(newTypes);
                                }}
                                className={`rounded-lg px-2 py-1 border text-sm ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700' : 'border-gray-300 text-black'}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {multiDocError && (
                      <div className="text-red-600 text-sm">{multiDocError}</div>
                    )}
                    {multiDocStatus && (
                      <div className="text-green-600 text-sm">{multiDocStatus}</div>
                    )}
                    <button
                      onClick={handleMultiDocUpload}
                      disabled={!multiDocFiles || multiDocFiles.length === 0 || multiDocTypes.some(t => !t)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Upload Multiple Documents
                    </button>
                  </div>
                </div>

                {/* Close Modal Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setKycCreatedEmployeeId(null);
                      setDocUploadComplete(false);
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <h2 className={`text-2xl font-bold mb-4 ${theme === "dark" ? "text-green-200" : "text-green-700"}`}>
                  Upload Complete!
                </h2>
                <p className={`mb-6 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  All documents have been uploaded successfully.
                </p>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setKycCreatedEmployeeId(null);
                    setDocUploadComplete(false);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Loading component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin text-blue-600">
        <FaSpinner className="w-12 h-12" />
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function StandaloneKYCPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StandaloneKYCPageContent />
    </Suspense>
  );
}
