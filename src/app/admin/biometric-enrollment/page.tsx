'use client';

import { useState, useEffect } from 'react';
import { FaFingerprint, FaSpinner, FaCheckCircle, FaExclamationCircle, FaUser, FaSearch, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { isAuthenticated } from '@/services/auth';
import { useRouter } from 'next/navigation';
import AdminDashboardLayout from '@/components/dashboard/AdminDashboardLayout';
import { useTheme } from "@/context/ThemeContext";
import Image from 'next/image';
import { scanForDevices, connectDevice, enrollBiometricSimple, enrollBiometricMobile, captureFingerprintFromCamera, scanUSBDevices, captureFingerprintFromUSB, BiometricDevice } from '@/services/biometricDevice';
import { FaCamera, FaMobileAlt, FaUsb } from 'react-icons/fa';

function BiometricEnrollmentContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const [availableDevices, setAvailableDevices] = useState<BiometricDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'connecting' | 'ready' | 'enrolling' | 'success' | 'failed'>('idle');
  const [enrollmentMode, setEnrollmentMode] = useState<'device' | 'mobile'>('device');
  const [mobileTemplate, setMobileTemplate] = useState<string>('');
  const [mobileImage, setMobileImage] = useState<string>('');
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [isEnrollingMobile, setIsEnrollingMobile] = useState(false);
  const [usbDevices, setUsbDevices] = useState<BiometricDevice[]>([]);
  const [selectedUSBDevice, setSelectedUSBDevice] = useState<string | null>(null);
  const [isScanningUSB, setIsScanningUSB] = useState(false);
  const [isCapturingFromUSB, setIsCapturingFromUSB] = useState(false);
  const [usbTemplate, setUsbTemplate] = useState<string>('');

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
    setSuccess(null);
    try {
      const devices = await scanForDevices(useWebSerial);
      setAvailableDevices(devices);
      if (devices.length > 0 && !selectedDevice) {
        setSelectedDevice(devices[0].id);
        setSuccess(`Found ${devices.length} device(s)`);
      } else if (devices.length === 0) {
        setError('No biometric devices found. Make sure your Secureye device is connected and the backend endpoint is implemented.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan devices';
      setError(errorMessage);
      console.error('Device scan error:', err);
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
    setEnrollmentStatus('connecting');

    try {
      const result = await connectDevice(selectedDevice);
      if (result.success) {
        setEnrollmentStatus('ready');
        setSuccess('Device connected successfully');
      } else {
        setEnrollmentStatus('failed');
        setError(result.message);
      }
    } catch (err) {
      setEnrollmentStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to connect device');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    if (!employeeId.trim()) {
      setError('Please enter employee ID');
      return;
    }

    if (enrollmentStatus !== 'ready') {
      setError('Please connect device first');
      return;
    }

    setIsEnrolling(true);
    setError(null);
    setSuccess(null);
    setEnrollmentStatus('enrolling');

    try {
      // Use timeout from backend response or default to 30 seconds
      const result = await enrollBiometricSimple(selectedDevice, employeeId.trim());
      
      if (result.success) {
        setEnrollmentStatus('success');
        setSuccess(`Biometric enrolled successfully for ${employeeId}! Quality: ${result.data?.qualityScore || 'N/A'}%`);
        setEmployeeId(''); // Clear for next enrollment
        setTimeout(() => {
          setEnrollmentStatus('ready');
          setSuccess(null);
        }, 3000);
      } else {
        setEnrollmentStatus('failed');
        setError(result.message);
      }
    } catch (err) {
      setEnrollmentStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to enroll biometric');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleScanUSB = async () => {
    setIsScanningUSB(true);
    setError(null);
    try {
      const devices = await scanUSBDevices();
      setUsbDevices(devices);
      if (devices.length > 0) {
        setSelectedUSBDevice(devices[0].id);
        setSuccess(`Found ${devices.length} USB fingerprint scanner(s)`);
      } else {
        setError('No USB fingerprint scanners found. Make sure scanner is connected via OTG adapter.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan USB devices';
      setError(errorMessage);
      if (errorMessage.includes('WebUSB')) {
        setError('WebUSB not supported. Use Chrome/Edge browser on Android. Make sure USB scanner is connected via OTG adapter.');
      }
    } finally {
      setIsScanningUSB(false);
    }
  };

  const handleCaptureFromUSB = async () => {
    if (!selectedUSBDevice) {
      setError('Please select a USB scanner first');
      return;
    }

    setIsCapturingFromUSB(true);
    setError(null);
    setSuccess('Place your finger on the USB scanner...');

    try {
      const result = await captureFingerprintFromUSB(selectedUSBDevice);
      if (result.success) {
        if (result.biometricTemplate) {
          setUsbTemplate(result.biometricTemplate);
          setSuccess('Fingerprint captured from USB scanner! Template ready for enrollment.');
        } else if (result.imageData) {
          setMobileImage(result.imageData);
          setSuccess('Fingerprint image captured from USB scanner!');
        } else {
          setError('No template or image received from scanner');
        }
      } else {
        setError(result.message || 'Failed to capture from USB scanner');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture from USB scanner');
    } finally {
      setIsCapturingFromUSB(false);
    }
  };

  const handleCaptureImage = async () => {
    setIsCapturingImage(true);
    setError(null);
    try {
      const result = await captureFingerprintFromCamera();
      if (result.success && result.imageData) {
        setMobileImage(result.imageData);
        setSuccess('Fingerprint image captured. Please extract template or upload template directly.');
      } else {
        setError(result.message || 'Failed to capture image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture image');
    } finally {
      setIsCapturingImage(false);
    }
  };

  const handleMobileEnroll = async () => {
    if (!employeeId.trim()) {
      setError('Please enter employee ID');
      return;
    }

    if (!usbTemplate.trim() && !mobileTemplate.trim() && !mobileImage) {
      setError('Please capture fingerprint from USB scanner, camera, or paste a template');
      return;
    }

    setIsEnrollingMobile(true);
    setError(null);
    setSuccess(null);

    try {
      // Priority: USB template > manual template > image
      const templateToSend = usbTemplate.trim() || mobileTemplate.trim() || mobileImage;
      
      // Quality score will be determined by backend from the captured data
      const result = await enrollBiometricMobile(
        employeeId.trim(),
        templateToSend,
        'fingerprint',
        undefined, // Let backend determine quality score from actual data
        mobileImage || undefined
      );

      if (result.success) {
        setSuccess(result.message || 'Biometric enrolled successfully from mobile!');
        setEmployeeId('');
        setMobileTemplate('');
        setMobileImage('');
        setUsbTemplate('');
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        setError(result.message || 'Mobile enrollment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll biometric from mobile');
    } finally {
      setIsEnrollingMobile(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className={`p-6 mb-6 border rounded-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <FaFingerprint className="text-blue-600" />
          Biometric Enrollment
        </h1>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Register employee fingerprints for door access and attendance
        </p>
        
        {/* Mode Selection */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setEnrollmentMode('device')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              enrollmentMode === 'device'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaFingerprint />
            Hardware Device
          </button>
          <button
            onClick={() => setEnrollmentMode('mobile')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              enrollmentMode === 'mobile'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaMobileAlt />
            Mobile/Camera
          </button>
        </div>
      </div>

      {/* Device Selection - Only show in device mode */}
      {enrollmentMode === 'device' && (
      <div className={`p-6 mb-6 border rounded-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className="text-lg font-semibold mb-4">Select Device</h2>
        
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
          {'serial' in navigator && (
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
          <div className="space-y-2">
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Available Biometric Devices
            </label>
            <select
              value={selectedDevice || ''}
              onChange={(e) => setSelectedDevice(e.target.value)}
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
            {availableDevices.some(d => d.name.includes('Serial') || d.name.includes('COM')) && (
              <div className={`p-3 rounded-lg mt-2 ${
                theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-sm flex items-start gap-2 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Serial Port Selected:</strong> When the browser dialog appeared, you should have selected 
                    the COM port that corresponds to your Secureye biometric device (usually COM12 or COM13, 
                    NOT OnePlus Buds or other Bluetooth devices). The device will now appear in the dropdown above. 
                    Select it and click &quot;Connect Device&quot; to establish the connection.
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              No biometric devices found. Click &quot;Scan Devices&quot; to search.
            </p>
            {isScanning && (
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm flex items-start gap-2 ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Serial Port Selection:</strong> If a browser dialog appeared asking to select a serial port:
                    <br />• Select the COM port that matches your Secureye device (usually COM12 or COM13)
                    <br />• Avoid selecting &quot;OnePlus Buds&quot; or other Bluetooth/audio devices
                    <br />• Look for ports labeled &quot;Bluetooth Peripheral Device&quot; or &quot;commonSpp&quot; which might be your device
                    <br />• Click &quot;Connect&quot; in the dialog to proceed
                  </span>
                </p>
              </div>
            )}
            <span className={`text-xs block ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Note: Make sure your Secureye device is connected and drivers are installed.
            </span>
          </div>
        )}

        {selectedDevice && (
          <button
            onClick={handleConnectDevice}
            disabled={isConnecting || enrollmentStatus === 'ready'}
            className={`mt-4 px-4 py-2 rounded-lg flex items-center gap-2 ${
              isConnecting || enrollmentStatus === 'ready'
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
            ) : enrollmentStatus === 'ready' ? (
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
      )}

      {/* Device Enrollment Form */}
      {enrollmentMode === 'device' && enrollmentStatus === 'ready' && (
        <div className={`p-6 mb-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaUser />
            Enroll Employee
          </h2>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Enter employee ID (e.g., EMP001)"
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {selectedDevice && availableDevices.find(d => d.id === selectedDevice)?.name.includes('Serial') && (
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm flex items-start gap-2 ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Serial Port Device Connected:</strong> Enrollment for serial port devices requires 
                    Secureye SDK integration on the backend. If enrollment fails, you can use the 
                    <strong> Mobile/Camera enrollment mode</strong> as an alternative to capture fingerprints 
                    using your phone&apos;s camera or a USB scanner.
                  </span>
                </p>
              </div>
            )}

            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm flex items-start gap-2 ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                <span>
                  When you click &quot;Enroll&quot;, place the employee&apos;s finger on the scanner. 
                  The system will capture the fingerprint and enroll it automatically.
                </span>
              </p>
            </div>

            <button
              onClick={handleEnroll}
              disabled={isEnrolling || !employeeId.trim()}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                isEnrolling || !employeeId.trim()
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isEnrolling ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Enrolling... Place finger on scanner</span>
                </>
              ) : (
                <>
                  <FaFingerprint />
                  <span>Enroll Biometric</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Enrollment Form */}
      {enrollmentMode === 'mobile' && (
        <div className={`p-6 mb-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaMobileAlt />
            Mobile/Camera Enrollment
          </h2>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Enter employee ID (e.g., EMP001)"
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* USB Scanner Section */}
            <div className={`p-4 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`text-md font-semibold mb-3 flex items-center gap-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <FaUsb />
                USB Fingerprint Scanner (via OTG)
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleScanUSB}
                  disabled={isScanningUSB}
                  className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                    isScanningUSB
                      ? theme === 'dark'
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isScanningUSB ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Scanning USB Devices...</span>
                    </>
                  ) : (
                    <>
                      <FaUsb />
                      <span>Scan for USB Scanner</span>
                    </>
                  )}
                </button>

                {usbDevices.length > 0 && (
                  <div className="space-y-2">
                    <select
                      value={selectedUSBDevice || ''}
                      onChange={(e) => setSelectedUSBDevice(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select USB Scanner</option>
                      {usbDevices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.name}
                        </option>
                      ))}
                    </select>

                    {selectedUSBDevice && (
                      <button
                        onClick={handleCaptureFromUSB}
                        disabled={isCapturingFromUSB}
                        className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                          isCapturingFromUSB
                            ? theme === 'dark'
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : theme === 'dark'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isCapturingFromUSB ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            <span>Place finger on scanner...</span>
                          </>
                        ) : (
                          <>
                            <FaFingerprint />
                            <span>Capture from USB Scanner</span>
                          </>
                        )}
                      </button>
                    )}

                    {usbTemplate && (
                      <div className={`p-2 rounded text-sm ${
                        theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
                      }`}>
                        ✓ Template captured from USB scanner
                      </div>
                    )}
                  </div>
                )}

                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  📱 Connect USB fingerprint scanner to your phone via OTG adapter. 
                  Works with Chrome/Edge on Android. Your phone&apos;s built-in sensor cannot be used.
                </p>
              </div>
            </div>

            {/* Camera Capture */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Or Capture Fingerprint Image (Camera)
              </label>
              <button
                onClick={handleCaptureImage}
                disabled={isCapturingImage}
                className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  isCapturingImage
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isCapturingImage ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Capturing...</span>
                  </>
                ) : (
                  <>
                    <FaCamera />
                    <span>Capture from Camera</span>
                  </>
                )}
              </button>
              {mobileImage && (
                <div className="mt-4">
                  <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Image captured successfully
                  </p>
                  <Image 
                    src={mobileImage} 
                    alt="Captured fingerprint" 
                    width={300}
                    height={300}
                    unoptimized
                    className="max-w-xs rounded-lg border border-gray-300"
                  />
                </div>
              )}
            </div>

            {/* Template Upload */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Or Enter Fingerprint Template (Base64)
              </label>
              <textarea
                value={mobileTemplate}
                onChange={(e) => setMobileTemplate(e.target.value)}
                placeholder="Paste Base64-encoded fingerprint template here (optional if image is captured)"
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                If you have a fingerprint template from a USB scanner or SDK, paste it here. 
                Otherwise, capture an image and the backend will extract the template.
              </p>
            </div>

            {/* Info Box */}
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm flex items-start gap-2 ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Mobile Enrollment Options:</strong><br />
                  1. <strong>Camera:</strong> Capture fingerprint image using your phone camera. The backend will extract the template.<br />
                  2. <strong>USB Scanner:</strong> Connect a USB fingerprint scanner to your phone (via OTG adapter) and use its SDK to get templates.<br />
                  3. <strong>Direct Template:</strong> If you already have a Base64 fingerprint template, paste it directly.
                </span>
              </p>
            </div>

            {/* Enroll Button */}
            <button
              onClick={handleMobileEnroll}
              disabled={isEnrollingMobile || !employeeId.trim() || (!usbTemplate.trim() && !mobileTemplate.trim() && !mobileImage)}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                isEnrollingMobile || !employeeId.trim() || (!usbTemplate.trim() && !mobileTemplate.trim() && !mobileImage)
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isEnrollingMobile ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <FaFingerprint />
                  <span>Enroll from Mobile</span>
                </>
              )}
            </button>
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
          <button
            onClick={() => setError(null)}
            className="ml-auto"
          >
            <FaTimes />
          </button>
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
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto"
          >
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  );
}

export default function BiometricEnrollmentPage() {
  return (
    <AdminDashboardLayout>
      <BiometricEnrollmentContent />
    </AdminDashboardLayout>
  );
}

