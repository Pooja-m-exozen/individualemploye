import React from "react";

// Add IndividualEmployeeDetails component
export function IndividualEmployeeDetails({ employeeName, theme }: { employeeName: string; theme: string }) {
  const [employeeData, setEmployeeData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchEmployeeData() {
      setLoading(true);
      try {
        const res = await fetch("https://cafm.zenapi.co.in/api/uniforms/all");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        if (data.success) {
          const matchingRequest = data.uniforms.find((u: unknown) => 
            (u as { fullName: string }).fullName === employeeName || 
            employeeName.includes((u as { fullName: string }).fullName) ||
            (u as { fullName: string }).fullName.includes(employeeName)
          );
          setEmployeeData(matchingRequest);
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (employeeName) {
      fetchEmployeeData();
    }
  }, [employeeName]);

  if (loading) {
    return (
      <div className={`p-3 rounded ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Loading employee details...</span>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className={`p-3 rounded ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
        <div className="text-sm text-gray-500">
          No uniform request found for this employee.
        </div>
      </div>
    );
  }

  // Format sizes for display in a dynamic table
  const formatUniformData = () => {
    const data = employeeData as { uniformType?: string[]; size?: Record<string, string> };
    if (!data.uniformType || !data.size) return [];
    
    if (Array.isArray(data.uniformType)) {
      return data.uniformType.map((type: string) => {
        const size = data.size?.[type];
        return {
          type,
          size: size || "N/A"
        };
      });
    }
    return [];
  };

  const uniformItems = formatUniformData();

  return (
    <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
      <div className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Uniform Request Details:</div>
      
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-4">
        <div><b>Employee ID:</b> {(employeeData as { employeeId?: string }).employeeId || 'N/A'}</div>
        <div><b>Full Name:</b> {(employeeData as { fullName?: string }).fullName || 'N/A'}</div>
        <div><b>Designation:</b> {(employeeData as { designation?: string }).designation || 'N/A'}</div>
        <div><b>Project:</b> {(employeeData as { projectName?: string }).projectName || 'N/A'}</div>
        <div><b>Quantity Requested:</b> {(employeeData as { qty?: number }).qty || 'N/A'}</div>
        <div><b>Status:</b> <span className={`px-2 py-1 rounded text-xs ${(employeeData as { approvalStatus?: string }).approvalStatus === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{(employeeData as { approvalStatus?: string }).approvalStatus || 'N/A'}</span></div>
      </div>

      {/* Dynamic Uniform Items Table */}
      {uniformItems.length > 0 && (
        <div className="mt-4">
          <div className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Requested Items:</div>
          <div className={`overflow-x-auto border rounded-lg ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
            <table className={`w-full text-xs ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
              <thead className={theme === "dark" ? "bg-gray-700" : "bg-gray-50"}>
                <tr>
                  <th className={`px-2 py-1 text-left font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Item Type</th>
                  <th className={`px-2 py-1 text-left font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>Size/Set</th>
                </tr>
              </thead>
              <tbody>
                {uniformItems.map((item, index) => (
                  <tr key={index} className={theme === "dark" ? "border-gray-700" : "border-gray-200"}>
                    <td className={`px-2 py-1 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                      {item.type.length > 20 ? item.type.substring(0, 20) + "..." : item.type}
                    </td>
                    <td className={`px-2 py-1 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>{item.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remarks */}
      {(employeeData as { remarks?: string }).remarks && (
        <div className="mt-4 text-sm">
          <b>Remarks:</b> {(employeeData as { remarks?: string }).remarks}
        </div>
      )}
      
      {/* Request Date */}
      <div className="text-xs text-gray-500 mt-2">
        Request Date: {(employeeData as { requestDate?: string }).requestDate ? new Date((employeeData as { requestDate?: string }).requestDate!).toLocaleString() : ''}
      </div>
    </div>
  );
} 