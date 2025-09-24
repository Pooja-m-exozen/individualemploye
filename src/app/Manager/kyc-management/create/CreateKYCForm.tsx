import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FaUser, FaSpinner, FaCheckCircle, FaTimesCircle, FaSave, FaFileAlt } from "react-icons/fa";

const initialState = {
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
  languages: [] as string[],
  email: "",
  workType: "",
  monthlySalary: "",
  // Address
  permanentState: "",
  permanentCity: "",
  permanentStreet: "",
  permanentPostalCode: "",
  currentState: "",
  currentCity: "",
  currentStreet: "",
  currentPostalCode: "",
  // Bank
  bankName: "",
  branchName: "",
  accountNumber: "",
  ifscCode: "",
  // Identification
  identificationType: "",
  identificationNumber: "",
  // Emergency
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  emergencyAadhar: "",
};

function CreateKYCForm() {
  const { theme } = useTheme();
  const [form, setForm] = useState<typeof initialState>(initialState);
  const [employeeImage, setEmployeeImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [projectList, setProjectList] = useState<{ _id: string; projectName: string }[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const [autoGenerateEmployeeId, setAutoGenerateEmployeeId] = useState(true);
  const [employeeIdSeed, setEmployeeIdSeed] = useState(0);
  const [employeeIdError, setEmployeeIdError] = useState<string | null>(null);
  const [isSameAddress, setIsSameAddress] = useState(false);

  // Language options
  const languageOptions = [
    "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", 
    "Kannada", "Malayalam", "Punjabi", "Odia", "Assamese", "Urdu", "Sanskrit"
  ];

  useEffect(() => {
    // Fetch projects on component mount
    fetch("https://cafm.zenapi.co.in/api/project/projects")
      .then(res => res.json())
      .then(data => {
        setProjectList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Silently fail on project fetch error
      });
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
        setForm(prev => ({ ...prev, employeeId: nextId }));
      })
      .catch((err) => {
        console.error('Error fetching next Employee ID:', err);
        nextId = `EFMS${maxNum + 1}`;
        setForm(prev => ({ ...prev, employeeId: nextId }));
      });
  }, [employeeIdSeed, autoGenerateEmployeeId]);

  // Validate employee ID format
  const validateEmployeeId = (id: string) => {
    const regex = /^EFMS\d{4}$/;
    if (!regex.test(id)) {
      setEmployeeIdError("Employee ID must start with 'EFMS' followed by exactly 4 numbers (e.g., EFMS3377)");
      return false;
    }
    setEmployeeIdError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // If project changes, reset designation and fetch designations for that project
    if (name === 'projectName') {
      setForm((prev) => ({ ...prev, designation: '' }));
      fetchDesignationsForProject(value);
    }
    
    // Validate employee ID if manually entered
    if (name === 'employeeId' && !autoGenerateEmployeeId) {
      validateEmployeeId(value);
    }
  };

  // Handle auto-generate checkbox change
  const handleAutoGenerateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoGenerateEmployeeId(e.target.checked);
    setEmployeeIdError(null);
    
    if (e.target.checked) {
      // Trigger auto-generation
      setEmployeeIdSeed(prev => prev + 1);
    } else {
      // Clear the employee ID for manual entry
      setForm(prev => ({ ...prev, employeeId: "" }));
    }
  };

  const fetchDesignationsForProject = async (projectName: string) => {
    if (!projectName) {
      setDesignationOptions([]);
      return;
    }
    
    try {
      const res = await fetch("https://cafm.zenapi.co.in/api/kyc");
      const data = await res.json();
      const kycForms = data.kycForms || [];
      
      // Get unique designations for the selected project
      const designations = Array.from(
        new Set(
          kycForms
            .filter((k: Record<string, unknown>) => (k.personalDetails as Record<string, unknown>)?.projectName === projectName)
            .map((k: Record<string, unknown>) => (k.personalDetails as Record<string, unknown>)?.designation)
            .filter(Boolean)
        )
      ) as string[];
      
      setDesignationOptions(designations);
    } catch (err) {
      console.error('Failed to fetch designations:', err);
      setDesignationOptions([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setEmployeeImage(e.target.files[0]);
  };

  const handleLanguageChange = (language: string) => {
    setForm(prev => {
      const currentLanguages = prev.languages;
      if (currentLanguages.includes(language)) {
        return { ...prev, languages: currentLanguages.filter(l => l !== language) };
      } else {
        return { ...prev, languages: [...currentLanguages, language] };
      }
    });
  };

  const handleSameAddressChange = (checked: boolean) => {
    setIsSameAddress(checked);
    if (checked) {
      // Copy permanent address to current address
      setForm(prev => ({
        ...prev,
        currentState: prev.permanentState,
        currentCity: prev.permanentCity,
        currentStreet: prev.permanentStreet,
        currentPostalCode: prev.permanentPostalCode,
      }));
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // If same address is checked, also update current address
      if (isSameAddress && field.startsWith('permanent')) {
        const currentField = field.replace('permanent', 'current');
        (updated as Record<string, unknown>)[currentField] = value;
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    
    // Validation checks
    if (!form.employeeId) {
      setError("Employee ID is required");
      setSubmitting(false);
      return;
    }
    
    // Employee ID format validation
    const employeeIdRegex = /^EFMS\d{4}$/;
    if (!employeeIdRegex.test(form.employeeId)) {
      setError("Employee ID must start with 'EFMS' followed by exactly 4 numbers (e.g., EFMS3377)");
      setSubmitting(false);
      return;
    }
    
    if (!form.currentCity) {
      setError("Current address city is required");
      setSubmitting(false);
      return;
    }
    
    // Phone number validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.emergencyPhone)) {
      setError("Please enter a valid 10-digit phone number for emergency contact");
      setSubmitting(false);
      return;
    }
    
    try {
      const payload = {
        personalDetails: {
          employeeId: form.employeeId,
          projectName: form.projectName,
          fullName: form.fullName,
          fathersName: form.fathersName,
          mothersName: form.mothersName,
          gender: form.gender,
          dob: form.dob,
          phoneNumber: form.phoneNumber,
          designation: form.designation,
          dateOfJoining: form.dateOfJoining,
          nationality: form.nationality,
          religion: form.religion,
          maritalStatus: form.maritalStatus,
          bloodGroup: form.bloodGroup,
          uanNumber: form.uanNumber,
          esicNumber: form.esicNumber,
          experience: form.experience,
          educationalQualification: form.educationalQualification,
          languages: form.languages,
          email: form.email,
          workType: form.workType,
          monthlySalary: form.monthlySalary,
        },
        addressDetails: {
          permanentAddress: {
            state: form.permanentState,
            city: form.permanentCity,
            street: form.permanentStreet,
            postalCode: form.permanentPostalCode,
          },
          currentAddress: {
            state: form.currentState,
            city: form.currentCity,
            street: form.currentStreet,
            postalCode: form.currentPostalCode,
          },
        },
        bankDetails: {
          bankName: form.bankName,
          branchName: form.branchName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
        },
        identificationDetails: {
          identificationType: form.identificationType,
          identificationNumber: form.identificationNumber,
        },
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relationship: form.emergencyRelationship,
          aadhar: form.emergencyAadhar,
        },
      };
      // Try alternative approach: Send as JSON with employeeId at root level
      const requestPayload = {
        employeeId: payload.personalDetails.employeeId,
        personalDetails: payload.personalDetails,
        addressDetails: payload.addressDetails,
        bankDetails: payload.bankDetails,
        identificationDetails: payload.identificationDetails,
        emergencyContact: payload.emergencyContact,
      };
      
      // Debug: Log the request payload
      console.log("Request payload:", requestPayload);
      
      // If we have an image, use FormData, otherwise use JSON
      if (employeeImage) {
        const formData = new FormData();
        formData.append("employeeId", payload.personalDetails.employeeId);
        formData.append("personalDetails", JSON.stringify(payload.personalDetails));
        formData.append("addressDetails", JSON.stringify(payload.addressDetails));
        formData.append("bankDetails", JSON.stringify(payload.bankDetails));
        formData.append("identificationDetails", JSON.stringify(payload.identificationDetails));
        formData.append("emergencyContact", JSON.stringify(payload.emergencyContact));
        formData.append("employeeImage", employeeImage);
        
        // Debug: Log the FormData contents
        console.log("FormData contents:");
        for (const [key, value] of formData.entries()) {
          console.log(key, value);
        }
        
        const res = await fetch("https://cafm.zenapi.co.in/api/kyc/submit-and-upload-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setMessage("KYC submitted successfully.");
          setForm(initialState);
          setEmployeeImage(null);
        } else {
          setError(data.message || "Submission failed.");
        }
      } else {
        // No image, send as JSON
        const res = await fetch("https://cafm.zenapi.co.in/api/kyc/submit-and-upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage("KYC submitted successfully.");
          setForm(initialState);
          setEmployeeImage(null);
        } else {
          setError(data.message || "Submission failed.");
        }
      }
    } catch (err) {
      setError("Submission failed. " + (err instanceof Error ? err.message : ""));
    } finally {
      setSubmitting(false);
    }
  };

  const sections = [
    { id: 0, name: "Personal Details", icon: FaUser },
    { id: 1, name: "Address Details", icon: FaFileAlt },
    { id: 2, name: "Bank Details", icon: FaFileAlt },
    { id: 3, name: "Identification", icon: FaFileAlt },
    { id: 4, name: "Emergency Contact", icon: FaFileAlt },
  ];

  const renderPersonalDetails = () => (
    <div className="space-y-4">
      {/* Employee ID Section */}
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'} rounded-xl p-4 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="autoGenerateEmployeeId"
            checked={autoGenerateEmployeeId}
            onChange={handleAutoGenerateChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="autoGenerateEmployeeId" className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
            Auto-generate Employee ID
          </label>
        </div>
        
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Employee ID *
          </label>
          <input
            type="text"
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            disabled={autoGenerateEmployeeId}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              autoGenerateEmployeeId
                ? theme === 'dark' 
                  ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                  : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
            placeholder={autoGenerateEmployeeId ? "Auto-generated" : "Enter Employee ID (e.g., EFMS3377)"}
          />
          {employeeIdError && (
            <p className="text-red-500 text-xs mt-1">{employeeIdError}</p>
          )}
          {autoGenerateEmployeeId && form.employeeId && (
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              ✓ Auto-generated: {form.employeeId}
            </p>
          )}
        </div>
      </div>

      {/* Project and Designation Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Project Name *
          </label>
          <select
            name="projectName"
            value={form.projectName}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Project</option>
            {projectList.map(project => (
              <option key={project._id} value={project.projectName}>
                {project.projectName}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Designation *
          </label>
          <select
            name="designation"
            value={form.designation}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
            disabled={!form.projectName}
          >
            <option value="">Select Designation</option>
            {designationOptions.map(designation => (
              <option key={designation} value={designation}>
                {designation}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Text Inputs */}
        {[
          ["Full Name", "fullName", "text"],
          ["Father's Name", "fathersName", "text"],
          ["Mother's Name", "mothersName", "text"],
          ["Date of Birth", "dob", "date"],
          ["Phone Number", "phoneNumber", "text"],
          ["Date of Joining", "dateOfJoining", "date"],
          ["UAN Number", "uanNumber", "text"],
          ["ESIC Number", "esicNumber", "text"],
          ["Email", "email", "email"],
          ["Monthly Salary", "monthlySalary", "number"],
        ].map(([label, name, type]) => (
          <div key={name as string} className="space-y-1">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
              {label}
            </label>
            <input
              type={type as string}
              name={name as string}
              value={(form as Record<string, unknown>)[name as string] as string}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }`}
              required={name !== "uanNumber" && name !== "esicNumber"}
            />
          </div>
        ))}

        {/* Gender Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Gender *
          </label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Nationality Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Nationality *
          </label>
          <select
            name="nationality"
            value={form.nationality}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Nationality</option>
            <option value="Indian">Indian</option>
            <option value="American">American</option>
            <option value="British">British</option>
            <option value="Canadian">Canadian</option>
            <option value="Australian">Australian</option>
            <option value="German">German</option>
            <option value="French">French</option>
            <option value="Japanese">Japanese</option>
            <option value="Chinese">Chinese</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Religion Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Religion *
          </label>
          <select
            name="religion"
            value={form.religion}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Religion</option>
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
            <option value="Christian">Christian</option>
            <option value="Sikh">Sikh</option>
            <option value="Buddhist">Buddhist</option>
            <option value="Jain">Jain</option>
            <option value="Parsi">Parsi</option>
            <option value="Jewish">Jewish</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Marital Status Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Marital Status *
          </label>
          <select
            name="maritalStatus"
            value={form.maritalStatus}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Marital Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>

        {/* Blood Group Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Blood Group *
          </label>
          <select
            name="bloodGroup"
            value={form.bloodGroup}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
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

        {/* Experience Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Experience *
          </label>
          <select
            name="experience"
            value={form.experience}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Experience</option>
            <option value="0-1 years">0-1 years</option>
            <option value="1-2 years">1-2 years</option>
            <option value="2-3 years">2-3 years</option>
            <option value="3-5 years">3-5 years</option>
            <option value="5-10 years">5-10 years</option>
            <option value="10+ years">10+ years</option>
          </select>
        </div>

        {/* Educational Qualification Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Educational Qualification *
          </label>
          <select
            name="educationalQualification"
            value={form.educationalQualification}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Educational Qualification</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor&apos;s Degree">Bachelor&apos;s Degree</option>
            <option value="Master&apos;s Degree">Master&apos;s Degree</option>
            <option value="PhD">PhD</option>
            <option value="Professional Degree">Professional Degree</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Work Type Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Work Type *
          </label>
          <select
            name="workType"
            value={form.workType}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Work Type</option>
            <option value="Office">Office</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      {/* Languages Checkboxes */}
      <div className="space-y-1">
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
          Languages Known
        </label>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {languageOptions.map((language) => (
              <label key={language} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form.languages as string[]).includes(language)}
                  onChange={() => handleLanguageChange(language)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {language}
                </span>
              </label>
            ))}
          </div>
          {(form.languages as string[]).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className={`text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                Selected: {(form.languages as string[]).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
          Employee Image
        </label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
          }`}
        />
      </div>
    </div>
  );

  const renderAddressDetails = () => (
    <div className="space-y-6">
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
        <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'}`}>
          Permanent Address
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["State", "permanentState"],
            ["City", "permanentCity"],
            ["Street", "permanentStreet"],
            ["Postal Code", "permanentPostalCode"],
          ].map(([label, name]) => (
            <div key={name as string} className="space-y-1">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
                {label}
              </label>
              <input
                type="text"
                name={name as string}
                value={(form as Record<string, unknown>)[name as string] as string}
                onChange={(e) => handleAddressChange(name as string, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }`}
                required
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-200' : 'text-gray-800'}`}>
            Current Address
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sameAddress"
              checked={isSameAddress}
              onChange={(e) => handleSameAddressChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="sameAddress" className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
              Same as Permanent Address
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["State", "currentState"],
            ["City", "currentCity"],
            ["Street", "currentStreet"],
            ["Postal Code", "currentPostalCode"],
          ].map(([label, name]) => (
            <div key={name as string} className="space-y-1">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
                {label}
              </label>
              <input
                type="text"
                name={name as string}
                value={(form as Record<string, unknown>)[name as string] as string}
                onChange={(e) => handleAddressChange(name as string, e.target.value)}
                disabled={isSameAddress}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isSameAddress
                    ? theme === 'dark' 
                      ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    : theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }`}
                required={!isSameAddress}
              />
            </div>
          ))}
        </div>
        {isSameAddress && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
              ✓ Current address automatically matches permanent address
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ["Bank Name", "bankName"],
          ["Branch Name", "branchName"],
          ["Account Number", "accountNumber"],
          ["IFSC Code", "ifscCode"],
        ].map(([label, name]) => (
          <div key={name as string} className="space-y-1">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
              {label}
            </label>
            <input
              type="text"
              name={name as string}
              value={(form as Record<string, unknown>)[name as string] as string}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }`}
              required
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderIdentificationDetails = () => (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identification Type Dropdown */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Identification Type *
          </label>
          <select
            name="identificationType"
            value={form.identificationType}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
          >
            <option value="">Select Identification Type</option>
            <option value="Aadhar">Aadhar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="Passport">Passport</option>
            <option value="Driving License">Driving License</option>
            <option value="Voter ID">Voter ID</option>
            <option value="Employee ID">Employee ID</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Identification Number Input */}
        <div className="space-y-1">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
            Identification Number *
          </label>
          <input
            type="text"
            name="identificationNumber"
            value={form.identificationNumber}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            }`}
            required
            placeholder="Enter identification number"
          />
        </div>
      </div>
    </div>
  );

  const renderEmergencyContact = () => (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-6`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ["Name", "emergencyName"],
          ["Phone", "emergencyPhone"],
          ["Relationship", "emergencyRelationship"],
          ["Aadhar", "emergencyAadhar"],
        ].map(([label, name]) => (
          <div key={name as string} className="space-y-1">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-gray-700'}`}>
              {label} {name === "emergencyPhone" && "*"}
            </label>
            <input
              type={name === "emergencyPhone" ? "tel" : "text"}
              name={name as string}
              value={(form as Record<string, unknown>)[name as string] as string}
              onChange={handleChange}
              placeholder={name === "emergencyPhone" ? "Enter 10-digit phone number" : ""}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }`}
              required={name !== "emergencyAadhar"}
            />
            {name === "emergencyPhone" && (
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Format: 10-digit number starting with 6-9
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 0: return renderPersonalDetails();
      case 1: return renderAddressDetails();
      case 2: return renderBankDetails();
      case 3: return renderIdentificationDetails();
      case 4: return renderEmergencyContact();
      default: return renderPersonalDetails();
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
      <form onSubmit={handleSubmit} className="w-full">
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-2xl
          ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3
              ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-500 bg-opacity-30'}`}
            >
              <FaUser className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create New KYC</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-100'}`}>
                Fill in employee details to create a new KYC record
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`px-6 py-4 border-b
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-100'}`}
        >
          <nav className="flex gap-2 overflow-x-auto">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                    ${isActive
                      ? theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-600'
                      : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'}
                  `}
                >
                  <section.icon className="w-4 h-4" />
                  {section.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
            {renderActiveSection()}
          </div>
        </div>

        {/* Submit Section */}
        <div className={`px-6 py-4 border-t
          ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-100'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg
                  ${theme === 'dark' 
                    ? 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-gray-600' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                  }`}
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Submit KYC
                  </>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              {message && (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <FaCheckCircle />
                  {message}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 font-medium">
                  <FaTimesCircle />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateKYCForm;
