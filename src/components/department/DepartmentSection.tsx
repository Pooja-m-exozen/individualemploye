import { FaBuilding, FaEdit, FaTrash, FaUserFriends, FaBriefcase } from 'react-icons/fa';
import { Department } from '@/services/departments';

interface DepartmentSectionProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function DepartmentSection({
  departments,
  onEdit,
  onDelete,
  isLoading = false,
  error = null,
}: DepartmentSectionProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-xl">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {departments.map((department) => (
        <div
          key={department._id}
          className="relative bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out overflow-hidden"
        >
          {/* Status indicator */}
          <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
          
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaBuilding className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    {department.name}
                  </h3>
                  <p className="text-sm font-medium text-blue-600">
                    ID: {department._id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onEdit(department)}
                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                  title="Edit Department"
                >
                  <FaEdit className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit</span>
                </button>
                <button 
                  onClick={() => onDelete(department._id)}
                  className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                  title="Delete Department"
                >
                  <FaTrash className="w-4 h-4" />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
            </div>

            <p className="text-black mb-4">
              {department.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FaUserFriends className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Employees</p>
                  <p className="text-lg font-semibold text-purple-600">24</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FaBriefcase className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Positions</p>
                  <p className="text-lg font-semibold text-orange-600">8</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-black">Created:</p>
              <p className="text-sm text-black">
                {new Date(department.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
