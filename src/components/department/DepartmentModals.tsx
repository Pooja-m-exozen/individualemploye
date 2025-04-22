'use client';

import {  FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Department {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentModalsProps {
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  department: Department | null;
  newDepartment: { name: string; description: string };
  onAdd: (e: React.FormEvent) => Promise<void>;
  onEdit: (e: React.FormEvent) => Promise<void>;
  onDelete: () => Promise<void>;
  onCloseAdd: () => void;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onNewDepartmentChange: (field: string, value: string) => void;
  onEditDepartmentChange: (field: string, value: string) => void;
}

export default function DepartmentModals({
  isAddModalOpen,
  isEditModalOpen,
  isDeleteModalOpen,
  department,
  newDepartment,
  onAdd,
  onEdit,
  onDelete,
  onCloseAdd,
  onCloseEdit,
  onCloseDelete,
  onNewDepartmentChange,
  onEditDepartmentChange,
}: DepartmentModalsProps) {
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const inputStyles = `
    w-full rounded-lg border-2 border-gray-200 text-gray-900 
    shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 
    hover:border-blue-400 transition-all duration-200 px-4 py-3
    bg-white/50 backdrop-blur-sm
  `;

  const buttonStyles = {
    primary: `
      px-5 py-2.5 bg-blue-600 text-white rounded-lg 
      hover:bg-blue-700 active:bg-blue-800 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
      transition-all duration-200 font-medium
      disabled:opacity-50 disabled:cursor-not-allowed
      transform hover:scale-105 active:scale-100
    `,
    secondary: `
      px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg 
      hover:bg-gray-50 active:bg-gray-100
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
      transition-all duration-200 font-medium
      transform hover:scale-105 active:scale-100
    `,
    delete: `
      px-5 py-2.5 bg-red-600 text-white rounded-lg 
      hover:bg-red-700 active:bg-red-800 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 
      transition-all duration-200 font-medium
      transform hover:scale-105 active:scale-100
    `
  };

  return (
    <AnimatePresence>
      {/* Add Department Modal */}
      {isAddModalOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white/90 backdrop-blur-xl rounded-xl p-8 w-full max-w-md shadow-2xl relative"
          >
            <button
              onClick={onCloseAdd}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 
                transition-colors duration-200 rounded-full p-2 hover:bg-gray-100"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Add New Department</h2>
              <p className="text-gray-600 mt-2">Create a new department in your organization</p>
            </div>

            <form onSubmit={onAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDepartment.name}
                  onChange={(e) => onNewDepartmentChange('name', e.target.value)}
                  className={inputStyles}
                  required
                  placeholder="Enter department name"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  Description
                </label>
                <textarea
                  value={newDepartment.description}
                  onChange={(e) => onNewDepartmentChange('description', e.target.value)}
                  className={inputStyles}
                  placeholder="Enter department description"
                />
              </div>
              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={onCloseAdd}
                  className={buttonStyles.secondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={buttonStyles.primary}
                >
                  Add Department
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && department && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white/90 backdrop-blur-xl rounded-xl p-8 w-full max-w-md shadow-2xl relative"
          >
            <button
              onClick={onCloseEdit}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 
                transition-colors duration-200 rounded-full p-2 hover:bg-gray-100"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Edit Department</h2>
              <p className="text-gray-600 mt-2">Modify the details of the department</p>
            </div>
            <form onSubmit={onEdit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  Department Name
                </label>
                <input
                  type="text"
                  value={department.name}
                  onChange={(e) => onEditDepartmentChange('name', e.target.value)}
                  className={inputStyles}
                  required
                  placeholder="Enter department name"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  Description
                </label>
                <textarea
                  value={department.description}
                  onChange={(e) => onEditDepartmentChange('description', e.target.value)}
                  className={inputStyles}
                  placeholder="Enter department description"
                />
              </div>
              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className={buttonStyles.secondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={buttonStyles.primary}
                >
                  Update Department
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white/90 backdrop-blur-xl rounded-xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-red-600">Delete Department</h2>
              <p className="text-gray-600 mt-2">
                Are you sure you want to delete this department? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={onCloseDelete}
                className={buttonStyles.secondary}
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className={buttonStyles.delete}
              >
                Delete Department
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
