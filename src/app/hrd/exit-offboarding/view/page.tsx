"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";
import HrdDashboardLayout from "@/components/dashboard/HrdDashboardLayout";

const ExitOffboardingComingSoon = () => {
  const router = useRouter();
  return (
    <HrdDashboardLayout>
      <div className="fixed inset-0 bg-gray-900/70 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-md mx-4 relative">
          {/* Back/Close Button */}
          <button
            onClick={() => router.push('/hrd/dashboard')}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none"
            aria-label="Back to Dashboard"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Coming Soon!</h2>
          <p className="text-gray-600 dark:text-gray-300">
            This feature is currently under development. We&#39;re working hard to bring you a seamless experience.
          </p>
          <div className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">
            Launching Soon
          </div>
        </div>
      </div>
      {/* Future content can go here, masked by overlay */}
    </HrdDashboardLayout>
  );
};

export default ExitOffboardingComingSoon; 