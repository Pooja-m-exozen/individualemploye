'use client';

import { useState, useEffect } from 'react';
import { FaFingerprint, FaSpinner, FaCheckCircle, FaExclamationCircle, FaDoorOpen, FaClock, FaSearch } from 'react-icons/fa';
import { isAuthenticated } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useTheme } from "@/context/ThemeContext";
import { scanForDevices, connectDevice, verifyAndMarkAttendance, BiometricDevice } from '@/services/biometricDevice';

// Door location (update with your actual door coordinates)
const DOOR_LOCATION = {
  latitude: 12.96792375,
  longitude: 77.60584455,
};

function DoorAttendanceContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const [availableDevices, setAvailableDevices] = useState<BiometricDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'idle' | 'connected' | 'ready'>('idle');
  const [lastAttendance, setLastAttendance] = useState<{
    employeeId: string;
    employeeName?: string;
    attendanceType: 'punch-in' | 'punch-out';
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    // Don't auto-scan on mount - requires user gesture for Web Serial API
    // User must click "Scan Devices" button
  }, [router]);

  const scanDevices = async (useWebSerial: boolean = false) => {
    setIsScanning(true);
    setError(null);
    try {
      const devices = await scanForDevices(useWebSerial);
      setAvailableDevices(devices);
      if (devices.length > 0 && !selectedDevice) {
        setSelectedDevice(devices[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan devices');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectDevice = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectDevice(selectedDevice);
      if (result.success) {
        setDeviceStatus('connected');
        setSuccess('Device connected successfully');
        setTimeout(() => {
          setDeviceStatus('ready');
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect device');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFingerprintScan = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    if (deviceStatus !== 'ready') {
      setError('Please connect device first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await verifyAndMarkAttendance(
        selectedDevice,
        DOOR_LOCATION.latitude,
        DOOR_LOCATION.longitude,
        30000 // 30 second timeout
      );

      if (result.success && result.data) {
        setSuccess(
          `Attendance ${result.data.attendanceType === 'punch-in' ? 'marked (Punch In)' : 'marked (Punch Out)'} for ${result.data.employeeId}!`
        );
        setLastAttendance({
          employeeId: result.data.employeeId,
          employeeName: result.data.employeeName,
          attendanceType: result.data.attendanceType,
          timestamp: result.data.timestamp,
        });
      } else {
        setError(result.message || 'Failed to mark attendance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process fingerprint');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-scan when device is ready (optional - for continuous scanning)
  useEffect(() => {
    if (deviceStatus === 'ready' && !isProcessing) {
      // You can add auto-scanning logic here if needed
      // For now, we'll use manual button click
    }
  }, [deviceStatus, isProcessing]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className={`p-6 mb-6 border rounded-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <FaDoorOpen className="text-blue-600" />
          Door Attendance System
        </h1>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Scan fingerprint to automatically mark attendance (Punch In/Out)
        </p>
      </div>

      {/* Device Selection */}
      <div className={`p-6 mb-6 border rounded-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className="text-lg font-semibold mb-4">Device Setup</h2>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => scanDevices(false)}
            disabled={isScanning}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isScanning
                ? theme === 'dark'
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isScanning ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <FaSearch />
                <span>Scan Devices (Backend)</span>
              </>
            )}
          </button>
          {typeof window !== 'undefined' && 'serial' in navigator && (
            <button
              onClick={() => scanDevices(true)}
              disabled={isScanning}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isScanning
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isScanning ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <FaFingerprint />
                  <span>Scan Serial Port</span>
                </>
              )}
            </button>
          )}
        </div>

        {availableDevices.length > 0 ? (
          <div className="space-y-2 mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Available Biometric Devices
            </label>
            <select
              value={selectedDevice || ''}
              onChange={(e) => {
                setSelectedDevice(e.target.value);
                setDeviceStatus('idle');
              }}
              className={`w-full px-4 py-2 border rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select a device</option>
              {availableDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} 
                  {device.manufacturer !== 'Unknown' && ` (${device.manufacturer})`}
                  {device.name.includes('COM') && ' - Serial Port (Try Secureye)'}
                  {device.isConnected ? ' - Connected' : ' - Not Connected'}
                </option>
              ))}
            </select>
            {availableDevices.some(d => d.name.includes('COM')) && (
              <p className={`text-xs mt-2 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                ⚠️ COM ports detected. If your Secureye device is connected via USB/Serial, 
                try connecting to the COM port. The backend will attempt to identify the device.
              </p>
            )}
          </div>
        ) : (
          <p className={`text-sm mb-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            No biometric devices found. Click &quot;Scan Devices&quot; to search.
            <br />
            <span className="text-xs mt-1 block">
              Note: Make sure your Secureye device is connected and drivers are installed.
            </span>
          </p>
        )}

        {selectedDevice && deviceStatus !== 'ready' && (
          <button
            onClick={handleConnectDevice}
            disabled={isConnecting || deviceStatus === 'connected'}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isConnecting || deviceStatus === 'connected'
                ? theme === 'dark'
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : theme === 'dark'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isConnecting ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : deviceStatus === 'connected' ? (
              <>
                <FaCheckCircle />
                <span>Connected</span>
              </>
            ) : (
              <>
                <FaFingerprint />
                <span>Connect Device</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Attendance Scanner */}
      {deviceStatus === 'ready' && (
        <div className={`p-6 mb-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaFingerprint />
            Scan Fingerprint
          </h2>

          <div className={`p-6 rounded-lg text-center mb-4 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className={`text-6xl mb-4 ${
              isProcessing ? 'text-blue-500' : 'text-gray-400'
            }`}>
              <FaFingerprint />
            </div>
            <p className={`text-lg font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {isProcessing ? 'Processing...' : 'Ready to Scan'}
            </p>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {isProcessing 
                ? 'Place finger on scanner and wait...' 
                : 'Click button below and place finger on scanner'}
            </p>
          </div>

          <button
            onClick={handleFingerprintScan}
            disabled={isProcessing}
            className={`w-full px-4 py-4 rounded-lg font-medium flex items-center justify-center gap-2 text-lg ${
              isProcessing
                ? theme === 'dark'
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Processing Fingerprint...</span>
              </>
            ) : (
              <>
                <FaFingerprint />
                <span>Scan Fingerprint & Mark Attendance</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Last Attendance Record */}
      {lastAttendance && (
        <div className={`p-6 mb-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-green-900/30 border-green-700'
            : 'bg-green-50 border-green-200'
        }`}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FaCheckCircle className="text-green-600" />
            Last Attendance Record
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={`font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Employee ID:
              </span>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}>
                {lastAttendance.employeeId}
              </span>
            </div>
            {lastAttendance.employeeName && (
              <div className="flex justify-between">
                <span className={`font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Name:
                </span>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}>
                  {lastAttendance.employeeName}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={`font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Type:
              </span>
              <span className={`font-semibold ${
                lastAttendance.attendanceType === 'punch-in' ? 'text-green-600' : 'text-blue-600'
              }`}>
                {lastAttendance.attendanceType === 'punch-in' ? 'Punch In' : 'Punch Out'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Time:
              </span>
              <span className={`flex items-center gap-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
              }`}>
                <FaClock className="text-sm" />
                {new Date(lastAttendance.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className={`p-4 mb-4 rounded-lg flex items-center gap-2 ${
          theme === 'dark'
            ? 'bg-red-900/30 border border-red-700 text-red-300'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className={`p-4 mb-4 rounded-lg flex items-center gap-2 ${
          theme === 'dark'
            ? 'bg-green-900/30 border border-green-700 text-green-300'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <FaCheckCircle />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

export default function DoorAttendancePage() {
  return (
    <DashboardLayout>
      <DoorAttendanceContent />
    </DashboardLayout>
  );
}

