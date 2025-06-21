"use client";

import React, { useState } from "react";
import ManagerDashboardLayout from "@/components/dashboard/ManagerDashboardLayout";
import { FaUser, FaMapMarkerAlt, FaMoneyCheckAlt, FaIdCard, FaPhoneVolume, FaChevronRight, FaCheckCircle, FaExclamationCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";

const sections = [
  { id: "personal", title: "Personal Details", icon: FaUser },
  { id: "address", title: "Address Details", icon: FaMapMarkerAlt },
  { id: "bank", title: "Bank Details", icon: FaMoneyCheckAlt },
  { id: "id", title: "Identification Details", icon: FaIdCard },
  { id: "emergency", title: "Emergency Contact", icon: FaPhoneVolume },
  { id: "image", title: "Employee Image", icon: FaIdCard },
];

export default function CreateKYCPage() {
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
    } catch (err: any) {
      setError("Submission failed. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagerDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center justify-center py-8">
        {/* Modern KYC Header */}
        <div className="rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r from-blue-500 to-blue-800 w-full max-w-5xl mx-auto">
          <div className="bg-blue-600 bg-opacity-30 rounded-xl p-4 flex items-center justify-center">
            <FaIdCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Create KYC</h1>
            <p className="text-white text-base opacity-90">Fill in the details to create a new KYC record</p>
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Side Navigation */}
          <aside className="md:w-64 flex-shrink-0 flex flex-col gap-6">
            <div className="rounded-2xl p-4 sticky top-8 bg-white border border-blue-100 shadow">
              <nav className="space-y-1">
                {sections.map((section, idx) => {
                  const isActive = activeSection === section.id;
                  const isCompleted = completedSections.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : isCompleted
                          ? "text-green-600 hover:bg-blue-50"
                          : "text-gray-600 hover:bg-blue-50"
                      }`}
                    >
                      <section.icon className={`w-5 h-5 ${isActive ? "text-blue-700" : isCompleted ? "text-green-500" : "text-gray-400"}`} />
                      <span className="font-medium">{section.title}</span>
                      {isCompleted && <FaCheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
              {/* Progress Bar */}
              <div className="mt-6 pt-6 border-t border-blue-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Completion</span>
                  <span className="text-blue-700">{progress}%</span>
                </div>
                <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
            {/* Enhanced Instructions/Notes Card as a separate floating card below the sidebar */}
            <div className="relative rounded-2xl p-6 border bg-blue-50 border-blue-200 shadow-xl flex flex-col gap-3 items-start transition-all duration-300 hover:shadow-2xl">
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-3 right-3 text-blue-400 hover:text-blue-700 bg-white rounded-full p-1 shadow-sm"
                title="Dismiss instructions"
              >
                <FaChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FaInfoCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-blue-800 tracking-tight">Instructions & Notes</h3>
              </div>
              <ul className="space-y-2 text-blue-800 text-sm pl-2">
                <li>• Please complete all sections for a successful KYC submission.</li>
                <li>• Ensure all uploaded documents are clear and legible.</li>
                <li>• Double-check your details before submitting the form.</li>
                <li>• Fields marked with * are mandatory.</li>
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Instructions/Notes Card below timeline */}

            {/* Instructions Panel */}
            {showInstructions && (
              <div className="rounded-2xl p-6 mb-8 relative border bg-white border-blue-100 shadow">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <FaChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <FaInfoCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">KYC Instructions</h3>
                    <ul className="space-y-2 text-gray-600">
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
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Personal Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Employee ID</label>
                      <input name="employeeId" value={personalDetails.employeeId} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Project Name</label>
                      <input name="projectName" value={personalDetails.projectName} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Full Name</label>
                      <input name="fullName" value={personalDetails.fullName} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Father's Name</label>
                      <input name="fathersName" value={personalDetails.fathersName} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Mother's Name</label>
                      <input name="mothersName" value={personalDetails.mothersName} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Gender</label>
                      <select name="gender" value={personalDetails.gender} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Date of Birth</label>
                      <input name="dob" type="date" value={personalDetails.dob} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
                      <input name="phoneNumber" value={personalDetails.phoneNumber} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Designation</label>
                      <input name="designation" value={personalDetails.designation} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Date of Joining</label>
                      <input name="dateOfJoining" type="date" value={personalDetails.dateOfJoining} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Nationality</label>
                      <input name="nationality" value={personalDetails.nationality} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Religion</label>
                      <input name="religion" value={personalDetails.religion} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Marital Status</label>
                      <input name="maritalStatus" value={personalDetails.maritalStatus} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Blood Group</label>
                      <input name="bloodGroup" value={personalDetails.bloodGroup} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">UAN Number</label>
                      <input name="uanNumber" value={personalDetails.uanNumber} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">ESIC Number</label>
                      <input name="esicNumber" value={personalDetails.esicNumber} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Experience</label>
                      <input name="experience" value={personalDetails.experience} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Educational Qualification</label>
                      <input name="educationalQualification" value={personalDetails.educationalQualification} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-medium mb-1">Languages (comma separated)</label>
                      <input name="languages" value={personalDetails.languages} onChange={handleLanguagesChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-medium mb-1">Work Type</label>
                      <input name="workType" value={personalDetails.workType} onChange={handlePersonalChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "address" && (
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Address Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Permanent Address - State</label>
                      <input name="state" value={addressDetails.permanentAddress.state} onChange={e => handleAddressChange("permanentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Permanent Address - City</label>
                      <input name="city" value={addressDetails.permanentAddress.city} onChange={e => handleAddressChange("permanentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Permanent Address - Street</label>
                      <input name="street" value={addressDetails.permanentAddress.street} onChange={e => handleAddressChange("permanentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Permanent Address - Postal Code</label>
                      <input name="postalCode" value={addressDetails.permanentAddress.postalCode} onChange={e => handleAddressChange("permanentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Current Address - State</label>
                      <input name="state" value={addressDetails.currentAddress.state} onChange={e => handleAddressChange("currentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Current Address - City</label>
                      <input name="city" value={addressDetails.currentAddress.city} onChange={e => handleAddressChange("currentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Current Address - Street</label>
                      <input name="street" value={addressDetails.currentAddress.street} onChange={e => handleAddressChange("currentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Current Address - Postal Code</label>
                      <input name="postalCode" value={addressDetails.currentAddress.postalCode} onChange={e => handleAddressChange("currentAddress", e)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "bank" && (
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Bank Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Bank Name</label>
                      <input name="bankName" value={bankDetails.bankName} onChange={handleBankChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Branch Name</label>
                      <input name="branchName" value={bankDetails.branchName} onChange={handleBankChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Account Number</label>
                      <input name="accountNumber" value={bankDetails.accountNumber} onChange={handleBankChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">IFSC Code</label>
                      <input name="ifscCode" value={bankDetails.ifscCode} onChange={handleBankChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "id" && (
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Identification Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Identification Type</label>
                      <select name="identificationType" value={identificationDetails.identificationType} onChange={handleIdentificationChange} className="w-full border border-gray-300 rounded-lg px-4 py-2">
                        <option value="">Select</option>
                        <option value="Pan Card">Pan Card</option>
                        <option value="Aadhar Card">Aadhar Card</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Driving License">Driving License</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Identification Number</label>
                      <input name="identificationNumber" value={identificationDetails.identificationNumber} onChange={handleIdentificationChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "emergency" && (
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Emergency Contact</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Emergency Contact Name</label>
                      <input name="name" value={emergencyContact.name} onChange={handleEmergencyChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Emergency Contact Phone</label>
                      <input name="phone" value={emergencyContact.phone} onChange={handleEmergencyChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Relationship</label>
                      <input name="relationship" value={emergencyContact.relationship} onChange={handleEmergencyChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Aadhar</label>
                      <input name="aadhar" value={emergencyContact.aadhar} onChange={handleEmergencyChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "image" && (
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-700 mb-4">Employee Image</h2>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
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
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
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
                      className="px-8 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all"
                      disabled={loading}
                    >
                      {loading ? <span className="flex items-center gap-2"><FaSpinner className="animate-spin" /> Submitting...</span> : "Create KYC"}
                    </button>
                  )}
                </div>
              </div>
              {/* Message */}
              {message && <div className="text-blue-600 font-medium mt-2 text-center">{message}</div>}
              {error && <div className="text-red-600 font-medium mt-2 text-center">{error}</div>}
            </form>
          </main>
        </div>
      </div>
    </ManagerDashboardLayout>
  );
} 