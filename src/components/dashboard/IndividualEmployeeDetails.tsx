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

  // Format sizes for display
  const formatSizes = () => {
    const data = employeeData as { uniformType?: string[]; size?: Record<string, string> };
    if (!data.uniformType || !data.size) return "N/A";
    if (Array.isArray(data.uniformType)) {
      return data.uniformType.map((type: string) => {
        const size = data.size?.[type];
        return size ? `${type} (${size})` : type;
      }).join(", ");
    }
    return "N/A";
  };

  return (
    <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
      <div className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Uniform Request Details:</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div><b>Employee ID:</b> {(employeeData as { employeeId?: string }).employeeId || 'N/A'}</div>
        <div><b>Full Name:</b> {(employeeData as { fullName?: string }).fullName || 'N/A'}</div>
        <div><b>Designation:</b> {(employeeData as { designation?: string }).designation || 'N/A'}</div>
        <div><b>Project:</b> {(employeeData as { projectName?: string }).projectName || 'N/A'}</div>
        <div><b>Requested Items:</b> {Array.isArray((employeeData as { uniformType?: string[] }).uniformType) ? (employeeData as { uniformType?: string[] }).uniformType?.join(", ") : "N/A"}</div>
        <div><b>Requested Sizes:</b> {formatSizes()}</div>
        <div><b>Quantity Requested:</b> {(employeeData as { qty?: number }).qty || 'N/A'}</div>
        <div><b>Status:</b> <span className={`px-2 py-1 rounded text-xs ${(employeeData as { approvalStatus?: string }).approvalStatus === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{(employeeData as { approvalStatus?: string }).approvalStatus || 'N/A'}</span></div>
      </div>
      {(employeeData as { remarks?: string }).remarks && (
        <div className="mt-2 text-sm"><b>Remarks:</b> {(employeeData as { remarks?: string }).remarks}</div>
      )}
      <div className="text-xs text-gray-500 mt-2">Request Date: {(employeeData as { requestDate?: string }).requestDate ? new Date((employeeData as { requestDate?: string }).requestDate!).toLocaleString() : ''}</div>
    </div>
  );
} 