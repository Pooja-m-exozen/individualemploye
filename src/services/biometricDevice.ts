/**
 * Biometric Device Integration Service
 * Supports: Fingerprint scanners, Face recognition devices, Iris scanners
 */

export interface BiometricDevice {
  id: string;
  name: string;
  type: 'fingerprint' | 'face' | 'iris' | 'palm';
  manufacturer?: string;
  model?: string;
  isConnected: boolean;
  capabilities: string[];
}

export interface BiometricCaptureResult {
  success: boolean;
  biometricData: string; // Base64 encoded or template data
  quality: number;
  message: string;
  deviceId?: string;
}

export interface BiometricMatchResult {
  success: boolean;
  matched: boolean;
  employeeId?: string;
  confidence: number;
  message: string;
}

// Web Serial API types
interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number; dataBits?: number; parity?: 'none' | 'even' | 'odd'; stopBits?: number; flowControl?: 'none' | 'hardware' }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number; serialNumber?: string };
}

// Web USB API types
interface USBDevice {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  manufacturerName?: string;
  productName?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBInTransferResult {
  data?: DataView;
  status: 'ok' | 'stall' | 'babble';
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

// Device configuration
const BIOMETRIC_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://cafm.zenapi.co.in/api',
  supportedDevices: [
    {
      type: 'fingerprint',
      manufacturers: ['Mantra', 'SecuGen', 'DigitalPersona', 'Futronic', 'ZKTeco', 'Identix', 'Secureye'],
    },
    {
      type: 'face',
      manufacturers: ['Hikvision', 'ZKTeco', 'Suprema', 'BioStar'],
    },
    {
      type: 'iris',
      manufacturers: ['IriTech', 'LG'],
    },
  ],
};

/**
 * Check for available biometric devices
 * Note: Web Serial API requires user gesture, so it's not used automatically
 */
export async function scanForDevices(useWebSerial: boolean = false): Promise<BiometricDevice[]> {
  try {
    // Option 1: Check via WebUSB/WebSerial API (only if explicitly requested with user gesture)
    if (useWebSerial && 'serial' in navigator) {
      try {
        return await scanSerialDevices();
      } catch (error) {
        // If Web Serial fails, fall back to backend
        console.warn('Web Serial scan failed, falling back to backend:', error);
      }
    }

    // Option 2: Check via backend service directly (consistent with other services)
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/devices/scan`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      
      // If it's an HTML error page, provide helpful message
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Biometric device scan endpoint not found. The backend endpoint GET /api/biometric/devices/scan needs to be implemented.');
        } else {
          throw new Error(`Backend endpoint not available (Status: ${response.status}). Please ensure the backend endpoint GET /api/biometric/devices/scan is implemented.`);
        }
      }
      
      throw new Error('Invalid response format from server');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Device scan failed');
    }

    const devices = data.devices || [];
    
    // Filter out non-biometric devices
    return filterBiometricDevices(devices);
  } catch (error) {
    console.error('Device scan error:', error);
    return [];
  }
}

/**
 * Filter devices to only include biometric devices
 */
function filterBiometricDevices(devices: unknown[]): BiometricDevice[] {
  // Keywords that indicate non-biometric devices
  const nonBiometricKeywords = [
    'buds', 'earbuds', 'headphone', 'bluetooth', 'audio', 'speaker',
    'mouse', 'keyboard', 'webcam', 'camera', 'printer', 'scanner',
    'monitor', 'display', 'screen'
  ];

  // Keywords that indicate biometric devices
  const biometricKeywords = [
    'fingerprint', 'biometric', 'secureye', 'identix', 'mantra', 'secugen',
    'zkteco', 'suprema', 'bistar', 'hikvision', 'futronic', 'digitalpersona'
  ];

  return devices
    .map((device: unknown) => {
      // Type guard to check if device has the required structure
      const isBiometricDevice = (d: unknown): d is BiometricDevice => {
        return (
          typeof d === 'object' &&
          d !== null &&
          'id' in d &&
          'name' in d &&
          'type' in d &&
          typeof (d as { id?: unknown }).id === 'string' &&
          typeof (d as { name?: unknown }).name === 'string' &&
          typeof (d as { type?: unknown }).type === 'string'
        );
      };
      
      // If device has proper structure, use it
      if (isBiometricDevice(device)) {
        return device;
      }

      // If device is just a string (like "COM12" or device name)
      if (typeof device === 'string') {
        const deviceName = device.toLowerCase();
        
        // Check if it's a COM port (potential biometric device)
        if (deviceName.startsWith('com') && /^com\d+$/i.test(device)) {
          return {
            id: `com-${device.replace(/^com/gi, '')}`,
            name: `Serial Port ${device.toUpperCase()}`,
            type: 'fingerprint' as const,
            manufacturer: 'Unknown',
            model: device.toUpperCase(),
            isConnected: false,
            capabilities: ['capture', 'match', 'enroll'],
          } as BiometricDevice;
        }

        // Check if it contains biometric keywords
        const isBiometric = biometricKeywords.some(keyword => 
          deviceName.includes(keyword.toLowerCase())
        );

        // Check if it's a non-biometric device
        const isNonBiometric = nonBiometricKeywords.some(keyword => 
          deviceName.includes(keyword.toLowerCase())
        );

        if (isBiometric && !isNonBiometric) {
          return {
            id: `device-${device.replace(/\s+/g, '-').toLowerCase()}`,
            name: device,
            type: 'fingerprint' as const,
            manufacturer: 'Unknown',
            model: device,
            isConnected: false,
            capabilities: ['capture', 'match', 'enroll'],
          } as BiometricDevice;
        }
      }

      // If device is an object but missing fields
      if (typeof device === 'object' && device !== null && 'name' in device) {
        const deviceObj = device as { 
          id?: string; 
          name?: string; 
          type?: string; 
          manufacturer?: string; 
          model?: string; 
          isConnected?: boolean; 
          capabilities?: string[];
        };
        
        const deviceName = deviceObj.name?.toLowerCase() || '';
        
        // Skip non-biometric devices
        if (nonBiometricKeywords.some(keyword => deviceName.includes(keyword))) {
          return null;
        }

        // Create proper BiometricDevice structure
        return {
          id: deviceObj.id || `device-${Date.now()}-${Math.random()}`,
          name: deviceObj.name || 'Unknown Device',
          type: (deviceObj.type || 'fingerprint') as 'fingerprint' | 'face' | 'iris' | 'palm',
          manufacturer: deviceObj.manufacturer || 'Unknown',
          model: deviceObj.model || deviceObj.name || 'Unknown',
          isConnected: deviceObj.isConnected || false,
          capabilities: deviceObj.capabilities || ['capture', 'match', 'enroll'],
        } as BiometricDevice;
      }

      return null;
    })
    .filter((device): device is BiometricDevice => device !== null)
    .filter((device) => {
      // Final filter: exclude devices with non-biometric names
      const deviceName = device.name.toLowerCase();
      return !nonBiometricKeywords.some(keyword => deviceName.includes(keyword));
    });
}

// Store serial ports in memory for connection
// SerialPort is from the Web Serial API (browser global)
const serialPorts = new Map<string, SerialPort>();

/**
 * Scan for devices via Web Serial API
 * Note: This requires a user gesture (button click) to work
 */
async function scanSerialDevices(): Promise<BiometricDevice[]> {
  try {
    // This requires user interaction to grant permission
    // Must be called from a button click handler, not from useEffect
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser');
    }

    // Web Serial API types
    interface SerialNavigator extends Navigator {
      serial: {
        requestPort(): Promise<SerialPort>;
        getPorts(): Promise<SerialPort[]>;
      };
    }
    
    const port = await (navigator as SerialNavigator).serial.requestPort();
    
    // Get port info - try to extract COM port name if available
    const portInfo = port.getInfo();
    const vendorId = portInfo.usbVendorId;
    const productId = portInfo.usbProductId;
    
    // Try to get port name from the port object (if available)
    let portName = 'Serial Port';
    try {
      // Some browsers expose the port name differently
      if (portInfo.serialNumber) {
        portName = `Serial Port (${portInfo.serialNumber})`;
      }
    } catch {
      // Port name not available
    }
    
    // Create a unique ID for this port
    const portId = `serial-${vendorId || 'unknown'}-${productId || Date.now()}`;
    
    // Store the port object for later use (don't close it yet)
    // We'll keep it open so the backend can use it
    serialPorts.set(portId, port);
    
    // Get port name from user's selection (the dialog shows COM port names)
    // We'll use a descriptive name based on the vendor/product info
    let deviceName = 'Serial Port Device';
    if (vendorId && productId) {
      deviceName = `Serial Device (Vendor: 0x${vendorId.toString(16)}, Product: 0x${productId.toString(16)})`;
    } else {
      deviceName = 'Serial Port Device (Selected from Browser)';
    }
    
    const portInfoObj: BiometricDevice = {
      id: portId,
      name: deviceName,
      type: 'fingerprint' as const,
      manufacturer: 'Serial Port',
      model: portName,
      isConnected: false,
      capabilities: ['capture', 'match', 'enroll'],
    };

    // Note: We're NOT closing the port here - it needs to stay open for the backend
    // The backend will handle opening/closing the port when connecting

    return [portInfoObj];
  } catch (error) {
    // User cancelled or permission denied
    if (error instanceof Error && (error.name === 'NotFoundError' || error.name === 'AbortError')) {
      console.log('No serial port selected or user cancelled');
      return [];
    }
    console.error('Serial device scan error:', error);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Get stored serial port by device ID
 */
export function getSerialPort(deviceId: string): SerialPort | undefined {
  return serialPorts.get(deviceId);
}

/**
 * Send data to serial port and read response
 * Helper function for communicating with serial port devices
 */
export async function sendSerialCommand(
  deviceId: string,
  command: Uint8Array,
  timeout: number = 5000
): Promise<Uint8Array | null> {
  const port = serialPorts.get(deviceId);
  if (!port) {
    throw new Error('Serial port not found. Please connect the device first.');
  }

  try {
    if (!port.writable || !port.readable) {
      throw new Error('Serial port is not open or not accessible');
    }
    
    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();

    // Send command
    await writer.write(command);
    writer.releaseLock();

    // Read response with timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeout);
    });

    const readPromise = (async () => {
      const { value, done } = await reader.read();
      reader.releaseLock();
      return done ? null : value;
    })();

    const result = await Promise.race([readPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error('Serial command error:', error);
    throw error;
  }
}

/**
 * Connect to a biometric device
 * For serial port devices, connects directly via Web Serial API
 * For other devices, uses backend API
 */
export async function connectDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if this is a serial port device (stored in our map)
    const serialPort = serialPorts.get(deviceId);
    
    if (serialPort) {
      // Handle serial port connection directly via Web Serial API
      try {
        // Check if port is already open by checking readable/writable properties
        let isOpen = false;
        try {
          // Try to access readable/writable - if port is open, these will be available
          if (serialPort.readable && serialPort.writable) {
            isOpen = true;
          }
        } catch {
          // Port is not open or accessible
          isOpen = false;
        }

        if (isOpen) {
          return {
            success: true,
            message: 'Serial port device already connected',
          };
        }

        // Check if port object is still valid by checking if it has the open method
        if (typeof serialPort.open !== 'function') {
          // Port object is invalid - remove it and ask user to scan again
          serialPorts.delete(deviceId);
          return {
            success: false,
            message: 'Serial port connection lost. Please click "Scan Serial Port" again to re-select your device.',
          };
        }

        // If port exists but is not open, try to close it first (in case it's in a bad state)
        try {
          // Check if port has a close method and try to close it
          if (typeof serialPort.close === 'function') {
            try {
              await serialPort.close();
              // Wait a bit for the port to fully close
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (closeError: unknown) {
              // Ignore close errors - port might already be closed or in invalid state
              const error = closeError as { message?: string };
              const closeErrorMsg = error?.message || '';
              if (!closeErrorMsg.includes('not open') && !closeErrorMsg.includes('InvalidStateError')) {
                console.log('Port close attempt:', closeError);
              }
            }
          }
        } catch (e) {
          // Port might not have close method or might be in invalid state
          console.log('Could not close port before opening:', e);
        }

        // Get baud rate from environment variable or device-specific config, default to 9600
        const baudRate = parseInt(process.env.NEXT_PUBLIC_SERIAL_BAUD_RATE || '9600', 10);
        
        // Try to open the port with settings
        // Note: Some devices may require different baud rates (common: 9600, 115200, 57600, 38400)
        try {
          await serialPort.open({
            baudRate: baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: 'none',
          });
        } catch (openError: unknown) {
          // If opening fails, try with a different baud rate (common fallback)
          const error = openError as { message?: string };
          const errorMsg = error?.message || '';
          if (errorMsg.includes('Failed to open') && baudRate === 9600) {
            // Try common alternative baud rates
            const alternativeBaudRates = [115200, 57600, 38400, 19200];
            let opened = false;
            
            for (const altBaudRate of alternativeBaudRates) {
              try {
                // Close first if needed
                try {
                  if (serialPort.readable || serialPort.writable) {
                    await serialPort.close();
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                } catch {
                  // Ignore
                }
                
                await serialPort.open({
                  baudRate: altBaudRate,
                  dataBits: 8,
                  parity: 'none',
                  stopBits: 1,
                  flowControl: 'none',
                });
                opened = true;
                console.log(`Successfully opened port with baud rate: ${altBaudRate}`);
                break;
              } catch {
                // Try next baud rate
                continue;
              }
            }
            
            if (!opened) {
              throw openError; // Re-throw original error if all attempts fail
            }
          } else {
            throw openError; // Re-throw if it's not a baud rate issue
          }
        }

        // Store connection status
        serialPorts.set(deviceId, serialPort);

        return {
          success: true,
          message: 'Serial port device connected successfully via Web Serial API',
        };
      } catch (portError: unknown) {
        console.error('Serial port connection error:', portError);
        
        // Handle different error types
        const error = portError as { message?: string; name?: string; toString?: () => string } | null;
        const errorMessage = error?.message || error?.toString?.() || String(portError) || 'Unknown error';
        const errorName = error?.name || '';
        
        // If port is already open, that's okay
        if (errorMessage.includes('already open') || errorName === 'InvalidStateError') {
          // Check if it's actually open
          try {
            if (serialPort.readable && serialPort.writable) {
              return {
                success: true,
                message: 'Serial port device already connected',
              };
            }
          } catch {
            // Port is not actually open, try to open it
          }
        }

        // More specific error messages
        if (errorMessage.includes('Failed to open serial port') || errorMessage.includes('Failed to execute')) {
          // Port is likely invalid - remove it from storage so user can scan again
          serialPorts.delete(deviceId);
          
          return {
            success: false,
            message: `Serial port connection failed. Possible causes:
1. Port is already in use by another application
2. Device is disconnected or not properly connected
3. Incorrect baud rate settings (current: ${parseInt(process.env.NEXT_PUBLIC_SERIAL_BAUD_RATE || '9600', 10)})
4. Device drivers not installed
5. Port was closed or lost connection

Please try:
- Click "Scan Serial Port" again to re-select the device
- Disconnect and reconnect the device
- Close any other applications using the serial port (like device manager, terminal, etc.)
- Check device manager to ensure the port is recognized
- Restart the browser if the issue persists`,
          };
        }

        // If we get here, the port is likely invalid - remove it from storage
        // so user can scan again
        serialPorts.delete(deviceId);
        
        return {
          success: false,
          message: `Failed to open serial port: ${errorMessage}. The port connection was lost. Please click "Scan Serial Port" again to re-select your device.`,
        };
      }
    }

    // For non-serial devices, use backend API
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/devices/${deviceId}/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Device connection failed');
    }

    return {
      success: true,
      message: data.message || 'Device connected successfully',
    };
  } catch (error) {
    console.error('Device connection error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Device connection failed',
    };
  }
}

/**
 * Disconnect from a biometric device
 * For serial port devices, closes the port directly
 * For other devices, uses backend API
 */
export async function disconnectDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if this is a serial port device
    const serialPort = serialPorts.get(deviceId);
    
    if (serialPort) {
      // Close the serial port directly
      try {
        await serialPort.close();
        serialPorts.delete(deviceId);
        return {
          success: true,
          message: 'Serial port device disconnected successfully',
        };
      } catch (portError) {
        // If port is already closed, that's okay
        if (portError instanceof Error && portError.message.includes('closed')) {
          serialPorts.delete(deviceId);
          return {
            success: true,
            message: 'Serial port device already disconnected',
          };
        }
        throw portError;
      }
    }

    // For non-serial devices, use backend API
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/devices/${deviceId}/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Device disconnection failed');
    }

    return {
      success: true,
      message: data.message || 'Device disconnected successfully',
    };
  } catch (error) {
    console.error('Device disconnection error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Device disconnection failed',
    };
  }
}

/**
 * Capture biometric data from device
 */
export async function captureBiometric(
  deviceId: string,
  type: 'fingerprint' | 'face' | 'iris'
): Promise<BiometricCaptureResult> {
  try {
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/devices/${deviceId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        type,
        timeout: parseInt(process.env.NEXT_PUBLIC_BIOMETRIC_TIMEOUT || '30000', 10), // Configurable timeout, default 30 seconds
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Biometric capture failed');
    }

    return {
      success: true,
      biometricData: data.biometricData,
      quality: data.quality || 0,
      message: data.message || 'Biometric captured successfully',
      deviceId: data.deviceId,
    };
  } catch (error) {
    console.error('Biometric capture error:', error);
    return {
      success: false,
      biometricData: '',
      quality: 0,
      message: error instanceof Error ? error.message : 'Biometric capture failed',
    };
  }
}

/**
 * Enroll biometric data for an employee
 */
export async function enrollBiometric(
  employeeId: string,
  deviceId: string,
  type: 'fingerprint' | 'face' | 'iris',
  biometricData: string,
  attempts: number = 3
): Promise<{ success: boolean; message: string; templateId?: string }> {
  try {
    // Capture multiple samples for better accuracy
    const samples: string[] = [];
    
    for (let i = 0; i < attempts; i++) {
      const capture = await captureBiometric(deviceId, type);
      if (capture.success) {
        samples.push(capture.biometricData);
      }
    }

    if (samples.length === 0) {
      throw new Error('Failed to capture biometric samples');
    }

    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        employeeId,
        deviceId,
        type,
        samples,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Biometric enrollment failed');
    }

    return {
      success: true,
      message: data.message || 'Biometric enrolled successfully',
      templateId: data.templateId,
    };
  } catch (error) {
    console.error('Biometric enrollment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Biometric enrollment failed',
    };
  }
}

/**
 * Match biometric data against enrolled templates
 */
export async function matchBiometric(
  deviceId: string,
  type: 'fingerprint' | 'face' | 'iris',
  employeeId?: string
): Promise<BiometricMatchResult> {
  try {
    // First capture the biometric
    const capture = await captureBiometric(deviceId, type);
    
    if (!capture.success) {
      throw new Error(capture.message);
    }

    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        deviceId,
        type,
        biometricData: capture.biometricData,
        employeeId, // Optional: verify against specific employee
        threshold: 0.7, // Minimum confidence threshold
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Biometric matching failed');
    }

    return {
      success: true,
      matched: data.matched || false,
      employeeId: data.employeeId,
      confidence: data.confidence || 0,
      message: data.message || (data.matched ? 'Biometric matched successfully' : 'Biometric not recognized'),
    };
  } catch (error) {
    console.error('Biometric matching error:', error);
    return {
      success: false,
      matched: false,
      confidence: 0,
      message: error instanceof Error ? error.message : 'Biometric matching failed',
    };
  }
}

/**
 * Delete enrolled biometric for an employee
 */
export async function deleteBiometric(
  employeeId: string,
  type: 'fingerprint' | 'face' | 'iris'
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/delete/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ type }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Biometric deletion failed');
    }

    return {
      success: true,
      message: data.message || 'Biometric deleted successfully',
    };
  } catch (error) {
    console.error('Biometric deletion error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Biometric deletion failed',
    };
  }
}

/**
 * Get device status
 */
export async function getDeviceStatus(deviceId: string): Promise<{
  success: boolean;
  isConnected: boolean;
  batteryLevel?: number;
  firmwareVersion?: string;
  message: string;
}> {
  try {
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/devices/${deviceId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get device status');
    }

    return {
      success: true,
      isConnected: data.isConnected || false,
      batteryLevel: data.batteryLevel,
      firmwareVersion: data.firmwareVersion,
      message: data.message || 'Status retrieved successfully',
    };
  } catch (error) {
    console.error('Device status error:', error);
    return {
      success: false,
      isConnected: false,
      message: error instanceof Error ? error.message : 'Failed to get device status',
    };
  }
}

/**
 * Verify and mark attendance automatically (for door devices)
 * This endpoint handles: capture → match → mark attendance in one call
 */
export async function verifyAndMarkAttendance(
  deviceId: string,
  latitude?: number,
  longitude?: number,
  timeout: number = 30000
): Promise<{
  success: boolean;
  message: string;
  data?: {
    employeeId: string;
    employeeName?: string;
    attendanceType: 'punch-in' | 'punch-out';
    timestamp: string;
    confidence: number;
  };
}> {
  try {
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/verify-and-mark-attendance/${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        timeout,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify and mark attendance');
    }

    return {
      success: true,
      message: data.message || 'Attendance marked successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Verify and mark attendance error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify and mark attendance',
    };
  }
}

/**
 * Simple enrollment - one call to enroll employee
 * For serial port devices, attempts backend enrollment
 * Note: Backend must have Secureye SDK integrated for serial port enrollment
 */
export async function enrollBiometricSimple(
  deviceId: string,
  employeeId: string,
  timeout: number = 30000
): Promise<{
  success: boolean;
  message: string;
  data?: {
    employeeId: string;
    biometricType: string;
    deviceId: string;
    enrolledAt: string;
    qualityScore: number;
  };
}> {
  try {
    // Check if this is a serial port device
    const isSerialPort = serialPorts.has(deviceId);
    
    if (isSerialPort) {
      // For serial ports, we need backend SDK integration
      // Try the backend endpoint - it may work if backend has SDK
      const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/enroll-simple/${deviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          employeeId,
          timeout,
          // Include serial port info if backend can use it
          connectionType: 'serial',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If backend SDK is not integrated, provide helpful message
        if (data.error && data.error.includes('SDK not integrated')) {
          throw new Error(
            'Backend Secureye SDK not integrated. ' +
            'For serial port devices, the backend needs Secureye SDK integration. ' +
            'Alternatively, use Mobile/Camera enrollment mode to capture fingerprints.'
          );
        }
        throw new Error(data.message || data.error || 'Failed to enroll biometric');
      }

      return {
        success: true,
        message: data.message || 'Biometric enrolled successfully',
        data: data.data,
      };
    }

    // For non-serial devices, use standard enrollment
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/enroll-simple/${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        employeeId,
        timeout,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to enroll biometric');
    }

    return {
      success: true,
      message: data.message || 'Biometric enrolled successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Simple enrollment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to enroll biometric',
    };
  }
}

/**
 * Enroll biometric from mobile device (camera, USB scanner, or SDK)
 * Accepts fingerprint template directly - no physical device connection needed
 */
export async function enrollBiometricMobile(
  employeeId: string,
  biometricTemplate: string,
  biometricType: 'fingerprint' | 'face' | 'iris' = 'fingerprint',
  qualityScore?: number,
  imageData?: string
): Promise<{ 
  success: boolean; 
  message: string; 
  data?: {
    employeeId: string;
    biometricType: string;
    enrolledAt: string;
    qualityScore: number;
  };
}> {
  try {
    // Build request body - only include qualityScore if provided (let backend calculate if not provided)
    interface RequestBody {
      employeeId: string;
      biometricTemplate: string;
      biometricType: string;
      qualityScore?: number;
      imageData?: string;
    }
    
    const requestBody: RequestBody = {
      employeeId,
      biometricTemplate,
      biometricType,
    };
    
    // Only include qualityScore if explicitly provided (backend will calculate from data if not provided)
    if (qualityScore !== undefined && qualityScore !== null) {
      requestBody.qualityScore = qualityScore;
    }
    
    if (imageData) {
      requestBody.imageData = imageData;
    }
    
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/enroll-mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Mobile biometric enrollment failed');
    }

    return {
      success: true,
      message: data.message || 'Biometric enrolled successfully from mobile',
      data: data.data,
    };
  } catch (error) {
    console.error('Mobile biometric enrollment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Mobile biometric enrollment failed',
    };
  }
}

/**
 * Match biometric from mobile device
 * Matches fingerprint template against enrolled templates
 */
export async function matchBiometricMobile(
  biometricTemplate: string,
  employeeId?: string,
  threshold: number = 0.7,
  biometricType: 'fingerprint' | 'face' | 'iris' = 'fingerprint'
): Promise<BiometricMatchResult> {
  try {
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/match-mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        biometricTemplate,
        employeeId,
        threshold,
        biometricType,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Mobile biometric matching failed');
    }

    return {
      success: true,
      matched: data.matched || false,
      employeeId: data.employeeId,
      confidence: data.confidence || 0,
      message: data.message || (data.matched ? 'Biometric matched successfully' : 'Biometric not recognized'),
    };
  } catch (error) {
    console.error('Mobile biometric matching error:', error);
    return {
      success: false,
      matched: false,
      confidence: 0,
      message: error instanceof Error ? error.message : 'Mobile biometric matching failed',
    };
  }
}

/**
 * Scan for USB fingerprint scanners connected via OTG (mobile devices)
 * Uses WebUSB API to detect connected USB devices
 */
export async function scanUSBDevices(): Promise<BiometricDevice[]> {
  try {
    if (!('usb' in navigator)) {
      throw new Error('WebUSB API not supported in this browser. Use Chrome/Edge on Android.');
    }

    // Web USB API types
    interface USBNavigator extends Navigator {
      usb: {
        requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number }> }): Promise<USBDevice>;
        getDevices(): Promise<USBDevice[]>;
      };
    }
    
    // Request USB device access
    const device = await (navigator as USBNavigator).usb.requestDevice({
      filters: [
        // Common fingerprint scanner vendor IDs
        { vendorId: 0x0c45 }, // Microdia (Mantra)
        { vendorId: 0x08ff }, // AuthenTec
        { vendorId: 0x05ba }, // SecuGen
        { vendorId: 0x147e }, // Upek
        { vendorId: 0x1c7a }, // DigitalPersona
      ]
    });

    if (device) {
      return [{
        id: `usb-${device.vendorId}-${device.productId}`,
        name: `USB Fingerprint Scanner (Vendor: 0x${device.vendorId.toString(16)})`,
        type: 'fingerprint' as const,
        manufacturer: 'USB Device',
        model: `Product ID: 0x${device.productId.toString(16)}`,
        isConnected: false,
        capabilities: ['capture', 'match', 'enroll'],
      }];
    }

    return [];
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      console.log('No USB device selected');
      return [];
    }
    console.error('USB device scan error:', error);
    throw error;
  }
}

/**
 * Capture fingerprint directly from USB scanner (mobile via OTG)
 * This requires the scanner's SDK to be integrated
 */
export async function captureFingerprintFromUSB(deviceId: string): Promise<{
  success: boolean;
  biometricTemplate?: string;
  imageData?: string;
  message: string;
}> {
  try {
    // This would typically use the scanner's SDK
    // For now, we'll call the backend which should handle USB communication
    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/devices/${deviceId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        type: 'fingerprint',
        timeout: parseInt(process.env.NEXT_PUBLIC_BIOMETRIC_TIMEOUT || '30000', 10), // Configurable timeout
        source: 'usb-mobile',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to capture from USB scanner');
    }

    return {
      success: true,
      biometricTemplate: data.biometricTemplate || data.biometricData,
      imageData: data.imageData,
      message: data.message || 'Fingerprint captured successfully from USB scanner',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to capture from USB scanner',
    };
  }
}

/**
 * Capture fingerprint image from camera (for mobile devices)
 * Returns base64 encoded image that can be sent to backend for template extraction
 */
export async function captureFingerprintFromCamera(): Promise<{
  success: boolean;
  imageData?: string;
  message: string;
}> {
  return new Promise((resolve) => {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use back camera on mobile if available
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({
            success: false,
            message: 'No image selected',
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          resolve({
            success: true,
            imageData,
            message: 'Fingerprint image captured successfully',
          });
        };
        reader.onerror = () => {
          resolve({
            success: false,
            message: 'Failed to read image file',
          });
        };
        reader.readAsDataURL(file);
      };

      input.oncancel = () => {
        resolve({
          success: false,
          message: 'Image capture cancelled',
        });
      };

      // Trigger file picker
      input.click();
    } catch (error) {
      resolve({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to capture fingerprint image',
      });
    }
  });
}

/**
 * Mark attendance with fingerprint verification for a specific employee
 * Flow:
 * 1. Checks if fingerprint is enrolled for the employee ID
 * 2. If not enrolled: returns an error message
 * 3. If enrolled: captures fingerprint from the device and matches it
 * 4. If matches: submits attendance
 * 5. If doesn't match: returns an error
 */
export async function markAttendanceWithFingerprint(
  employeeId: string,
  deviceId: string,
  latitude?: number,
  longitude?: number
): Promise<{
  success: boolean;
  message: string;
  data?: {
    employeeId: string;
    employeeName?: string;
    attendanceType: 'punch-in' | 'punch-out';
    timestamp: string;
    confidence?: number;
  };
}> {
  try {
    interface RequestBody {
      latitude?: number;
      longitude?: number;
    }
    
    const requestBody: RequestBody = {};

    if (latitude !== undefined && latitude !== null) {
      requestBody.latitude = latitude;
    }

    if (longitude !== undefined && longitude !== null) {
      requestBody.longitude = longitude;
    }

    const response = await fetch(`${BIOMETRIC_CONFIG.apiUrl}/biometric/mark-attendance/${employeeId}/${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to mark attendance with fingerprint verification');
    }

    return {
      success: true,
      message: data.message || 'Attendance marked successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Fingerprint attendance marking error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to mark attendance with fingerprint verification',
    };
  }
}

