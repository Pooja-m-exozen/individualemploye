'use client';

import { useState } from 'react';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaFingerprint, FaPlug, FaSearch } from 'react-icons/fa';
import { useTheme } from "@/context/ThemeContext";

interface SecureyeConnectionHelperProps {
  onScanDevices?: () => void;
  isScanning?: boolean;
  deviceConnected?: boolean;
  selectedDevice?: string | null;
}

export default function SecureyeConnectionHelper({
  onScanDevices,
  isScanning = false,
  deviceConnected = false,
  selectedDevice = null,
}: SecureyeConnectionHelperProps) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`p-4 mb-4 border rounded-lg ${
      theme === 'dark'
        ? 'bg-blue-900/20 border-blue-700'
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start gap-3">
        <FaInfoCircle className={`text-lg mt-0.5 ${
          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
        }`} />
        <div className="flex-1">
          <h3 className={`font-semibold mb-2 ${
            theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
          }`}>
            Secureye Device Setup
          </h3>
          
          {!deviceConnected ? (
            <div className="space-y-2">
              <div className={`p-2 mb-2 rounded border ${
                theme === 'dark'
                  ? 'bg-yellow-900/30 border-yellow-700'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-xs font-semibold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  <FaExclamationTriangle />
                  Windows Format Dialog?
                </p>
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'
                }`}>
                  If Windows asks to format a disk, click <strong>&quot;Cancel&quot;</strong> - do NOT format! 
                  This is normal. Use &quot;Scan Serial Port&quot; instead.
                </p>
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
              }`}>
                Follow these steps to connect your Secureye device:
              </p>
              <ol className={`text-sm space-y-1 list-decimal list-inside ${
                theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
              }`}>
                <li>Ensure your Secureye device is powered on and connected via USB</li>
                <li>If Windows shows format dialog, click <strong>&quot;Cancel&quot;</strong></li>
                <li>Click &quot;Scan Devices&quot; or &quot;Scan Serial Port&quot; button below</li>
                <li>Select your Secureye device from the dropdown</li>
                <li>Click &quot;Connect Device&quot; to establish connection</li>
              </ol>
              
              {onScanDevices && (
                <button
                  onClick={onScanDevices}
                  disabled={isScanning}
                  className={`mt-3 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                    isScanning
                      ? theme === 'dark'
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <FaSearch />
                      <span>Scan for Secureye Device</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-green-300' : 'text-green-700'
              }`}>
                Secureye device connected and ready!
              </p>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`mt-3 text-xs underline ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`}
          >
            {showDetails ? 'Hide' : 'Show'} troubleshooting tips
          </button>

          {showDetails && (
            <div className={`mt-3 p-3 rounded ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <h4 className={`font-semibold mb-2 text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Troubleshooting:
              </h4>
              <ul className={`text-xs space-y-1 list-disc list-inside ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li><strong>Format Dialog?</strong> Click &quot;Cancel&quot; - do NOT format the disk!</li>
                <li>Check Device Manager (Windows) to verify device is recognized</li>
                <li>Look for COM port in Device Manager under &quot;Ports (COM & LPT)&quot;</li>
                <li>Use &quot;Scan Serial Port&quot; button if backend scan doesn&apos;t work</li>
                <li>Ensure Secureye drivers are installed (download from manufacturer)</li>
                <li>Close any other applications using the device</li>
                <li>Disconnect and reconnect the USB cable</li>
                <li>Use Chrome or Edge browser for best compatibility</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

