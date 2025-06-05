"use client";

import { useState } from "react";
import {
  FaUpload,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaFileAlt,
  FaExclamationCircle,
  FaInfoCircle,
  FaArrowLeft,
  FaIdCard,
  FaIdBadge,
  FaPassport,
  FaUserCircle,
  FaQuestionCircle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getEmployeeId } from "@/services/auth";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface DocumentUpload {
  type: "aadhar" | "pan" | "passport" | "photo";
  file: File | null;
  preview: string | null;
  uploading: boolean;
  error: string | null;
  success: boolean;
}

type DocumentType = "aadhar" | "pan" | "passport" | "photo";

const documentInfo = {
  aadhar: {
    label: "Aadhar Card",
    description: "Upload a clear copy of your Aadhar card (front and back)",
    required: true,
    formats: "PDF, JPG, PNG (max 5MB)",
    icon: FaIdCard,
  },
  pan: {
    label: "PAN Card",
    description: "Upload a clear copy of your PAN card",
    required: true,
    formats: "PDF, JPG, PNG (max 5MB)",
    icon: FaIdBadge,
  },
  passport: {
    label: "Passport",
    description: "Upload the first and last page of your passport",
    required: false,
    formats: "PDF, JPG, PNG (max 5MB)",
    icon: FaPassport,
  },
  photo: {
    label: "Profile Photo",
    description: "Upload a recent passport-size photograph",
    required: true,
    formats: "JPG, PNG (max 2MB)",
    icon: FaUserCircle,
  },
} as const;

export default function UploadDocuments() {
  const { theme } = useTheme();
  const router = useRouter();
  const [documents, setDocuments] = useState<Record<string, DocumentUpload>>({
    aadhar: {
      type: "aadhar",
      file: null,
      preview: null,
      uploading: false,
      error: null,
      success: false,
    },
    pan: {
      type: "pan",
      file: null,
      preview: null,
      uploading: false,
      error: null,
      success: false,
    },
    passport: {
      type: "passport",
      file: null,
      preview: null,
      uploading: false,
      error: null,
      success: false,
    },
    photo: {
      type: "photo",
      file: null,
      preview: null,
      uploading: false,
      error: null,
      success: false,
    },
  });

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange =
    (type: DocumentType) => async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file size
      const maxSize = type === "photo" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setDocuments((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
          },
        }));
        return;
      }

      // Reset states
      setGlobalError(null);
      setDocuments((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          file,
          preview: URL.createObjectURL(file),
          error: null,
          success: false,
        },
      }));
    };

  const uploadDocument = async (type: DocumentType) => {
    const doc = documents[type];
    if (!doc.file) return;

    const employeeId = getEmployeeId();
    if (!employeeId) {
      setGlobalError("Employee ID not found. Please login again.");
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [type]: { ...prev[type], uploading: true, error: null },
    }));

    try {
      const formData = new FormData();
      formData.append("file", doc.file);
      formData.append("type", type);

      const response = await fetch(
        `https://cafm.zenapi.co.in/api/kyc/${employeeId}/upload-document`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload document");
      }

      setDocuments((prev) => ({
        ...prev,
        [type]: { ...prev[type], success: true, uploading: false },
      }));
    } catch (error) {
      setDocuments((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          error:
            error instanceof Error
              ? error.message
              : "Failed to upload document",
          uploading: false,
        },
      }));
    }
  };

  const handleUploadAll = async () => {
    setGlobalError(null);
    setGlobalSuccess(null);
    setUploadProgress(0);

    const requiredDocuments = (Object.entries(documentInfo) as [
      DocumentType,
      typeof documentInfo[DocumentType]
    ][])
      .filter(([, info]) => info.required)
      .map(([type]) => type);

    const missingDocuments = requiredDocuments.filter(
      (type) => !documents[type].file
    );

    if (missingDocuments.length > 0) {
      setGlobalError(
        `Please select all required documents: ${missingDocuments
          .map((type) => documentInfo[type].label)
          .join(", ")}`
      );
      return;
    }

    try {
      const documentsToUpload = Object.keys(documents).filter(
        (type) => documents[type as DocumentType].file
      ) as DocumentType[];

      for (let i = 0; i < documentsToUpload.length; i++) {
        const type = documentsToUpload[i];
        await uploadDocument(type);
        setUploadProgress(((i + 1) / documentsToUpload.length) * 100);
      }

      setGlobalSuccess("All documents uploaded successfully!");
      setTimeout(() => {
        router.push("/kyc");
      }, 2000);
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Failed to upload some documents. Please try again."
      );
    }
  };

  const steps = [
    { id: 1, title: "Personal Information", status: "completed" },
    { id: 2, title: "Document Upload", status: "current" },
    { id: 3, title: "Verification", status: "upcoming" },
  ];

  const guidelines = [
    "Ensure all documents are clear and legible",
    "Files should be in PDF, JPG, or PNG format",
    "Maximum file size: 5MB (2MB for profile photo)",
    "Documents should be valid and not expired",
    "All pages of documents should be properly scanned",
    "Avoid uploading screenshots of documents",
  ];

  const DocumentUploadCard = ({
    type,
    label,
    required = false,
  }: {
    type: keyof typeof documentInfo;
    label: string;
    required?: boolean;
  }) => {
    const doc = documents[type];
    const info = documentInfo[type];
    const Icon = info.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative ${
          theme === "dark"
            ? "bg-gray-800 ring-1 ring-gray-700"
            : "bg-white"
        } rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300`}
      >
        {required && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Required
            </span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`p-3 rounded-xl ${
                doc.success
                  ? "bg-green-50 text-green-600"
                  : "bg-blue-50/50 text-blue-600"
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">{label}</h3>
              <p className="text-sm text-gray-600 mt-1">{info.description}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <FaFileAlt className="w-3 h-3" />
                {info.formats}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {doc.preview ? (
              <div className="relative rounded-2xl overflow-hidden bg-gray-50 group">
                <Image
                  src={doc.preview}
                  alt={`${label} preview`}
                  width={500}
                  height={300}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      setDocuments((prev) => ({
                        ...prev,
                        [type]: { ...documents[type], file: null, preview: null },
                      }))
                    }
                    className="opacity-0 group-hover:opacity-100 p-3 bg-white/90 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300"
                  >
                    <FaTimesCircle className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 cursor-pointer bg-gray-50/50 hover:bg-blue-50/50 transition-all group">
                <div className="flex flex-col items-center justify-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FaUpload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 text-center">
                    Drop your {label} here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{info.formats}</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange(type)}
                  className="hidden"
                />
              </label>
            )}

            {doc.file && !doc.success && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => uploadDocument(type)}
                disabled={doc.uploading}
                className={`w-full px-4 py-3.5 rounded-xl text-white font-medium transition-all ${
                  doc.uploading
                    ? "bg-blue-400/80 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                }`}
              >
                {doc.uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin w-5 h-5" />
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FaUpload className="w-5 h-5" />
                    Upload {label}
                  </span>
                )}
              </motion.button>
            )}

            {doc.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl"
              >
                <FaExclamationCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{doc.error}</p>
              </motion.div>
            )}
          </div>
        </div>
        {doc.success && (
          <div className="px-6 py-4 bg-green-50 border-t border-green-100">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <FaCheckCircle className="w-5 h-5" />
              Document uploaded successfully
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div
      className={`h-screen flex flex-col ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* KYC Upload Title Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-b-2xl shadow p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <FaUpload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">KYC Document Upload</h1>
            <p className="text-blue-100 mt-1">
              Submit and verify your identity documents securely
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${
              theme === "dark"
                ? "bg-gray-800 ring-1 ring-gray-700"
                : "bg-white"
            } rounded-xl shadow-sm overflow-hidden mb-6`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <button
                  onClick={() => router.push("/kyc")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                >
                  <FaArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-1">
                    Document Verification
                  </h1>
                  <p className="text-sm text-gray-600">
                    Complete your KYC by uploading the required documents
                  </p>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="flex justify-between items-center w-full mt-8">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div className="flex flex-col items-center relative">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.status === "completed"
                            ? "bg-green-500"
                            : step.status === "current"
                            ? "bg-blue-600"
                            : "bg-gray-200"
                        } text-white font-semibold transition-colors duration-300`}
                      >
                        {step.status === "completed" ? (
                          <FaCheckCircle className="w-5 h-5" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <p
                        className={`text-sm font-medium mt-3 ${
                          step.status === "completed"
                            ? "text-green-600"
                            : step.status === "current"
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {index !== steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-4 ${
                          step.status === "completed" ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Instructions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-4"
            >
              <div
                className={`${
                  theme === "dark"
                    ? "bg-gray-800 ring-1 ring-gray-700"
                    : "bg-white"
                } rounded-xl p-6 sticky top-8`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FaInfoCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Guidelines
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    {guidelines.map((guideline, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 group"
                      >
                        <div className="p-2 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                          <FaCheckCircle className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {guideline}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 text-amber-700 mb-3">
                      <FaQuestionCircle className="w-5 h-5" />
                      <h3 className="font-semibold">Need Assistance?</h3>
                    </div>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      Having trouble with document upload? Our support team is here
                      to help at{" "}
                      <span className="font-medium">support@zenployee.com</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Panel - Upload Cards */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence>
                {globalError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-4 text-red-600 bg-red-50 p-6 rounded-xl border border-red-100"
                  >
                    <div className="p-3 bg-red-100 rounded-xl">
                      <FaExclamationCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Upload Error</h3>
                      <p className="text-sm">{globalError}</p>
                    </div>
                  </motion.div>
                )}

                {globalSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-4 text-green-600 bg-green-50 p-6 rounded-xl border border-green-100"
                  >
                    <div className="p-3 bg-green-100 rounded-xl">
                      <FaCheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Success!</h3>
                      <p className="text-sm">{globalSuccess}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      Uploading Documents...
                    </p>
                    <p className="text-sm font-medium text-blue-600">
                      {Math.round(uploadProgress)}%
                    </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <DocumentUploadCard type="aadhar" label="Aadhar Card" required />
                <DocumentUploadCard type="pan" label="PAN Card" required />
                <DocumentUploadCard type="passport" label="Passport" />
                <DocumentUploadCard type="photo" label="Profile Photo" required />
              </div>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="bg-white rounded-xl p-6 mt-6 border border-gray-100"
              >
                <button
                  onClick={handleUploadAll}
                  className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:shadow-md font-medium flex items-center justify-center gap-2 text-base"
                >
                  <FaUpload className="w-5 h-5" />
                  Submit Documents for Verification
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}