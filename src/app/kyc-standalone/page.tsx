"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FaUser, FaMapMarkerAlt, FaMoneyCheckAlt, FaIdCard, FaPhoneVolume, FaChevronRight, FaCheckCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

const sections = [
  { id: "personal", title: "Personal Details", icon: FaUser },
  { id: "address", title: "Address Details", icon: FaMapMarkerAlt },
  { id: "bank", title: "Bank Details", icon: FaMoneyCheckAlt },
  { id: "id", title: "Identification Details", icon: FaIdCard },
  { id: "emergency", title: "Emergency Contact", icon: FaPhoneVolume },
  { id: "image", title: "Uploads", icon: FaIdCard },
];

export default function StandaloneKYCPage() {
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

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

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
  }, [personalDetails.projectName, projectList]);

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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      
      // Add all form data
      formData.append('personalDetails', JSON.stringify(personalDetails));
      formData.append('addressDetails', JSON.stringify(addressDetails));
      formData.append('bankDetails', JSON.stringify(bankDetails));
      formData.append('identificationDetails', JSON.stringify(identificationDetails));
      formData.append('emergencyContact', JSON.stringify(emergencyContact));
      
      if (employeeImage) {
        formData.append('employeeImage', employeeImage);
      }

      const response = await fetch('https://cafm.zenapi.co.in/api/kyc', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage('KYC form submitted successfully!');
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
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit KYC form');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Employee ID *</label>
          <input
            type="text"
            value={personalDetails.employeeId}
            onChange={(e) => setPersonalDetails({...personalDetails, employeeId: e.target.value})}
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
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
          <input
            type="text"
            value={personalDetails.languages}
            onChange={(e) => setPersonalDetails({...personalDetails, languages: e.target.value})}
            placeholder="e.g., English, Hindi, Tamil"
            className={`w-full px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            required
          />
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
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
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
                currentAddress: addressDetails.permanentAddress
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
                    disabled={loading}
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
    </div>
  );
}
