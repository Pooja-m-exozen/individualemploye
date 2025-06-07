'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner } from 'react-icons/fa';

export default function AttendancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    router.replace('/attendance/view');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center p-8 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
        <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-600 dark:text-blue-400" />
        <p className="mt-4 text-gray-700 dark:text-gray-300 font-medium">
          Loading attendance records...
        </p>
      </div>
    </div>
  );
}