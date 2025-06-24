"use client";
import React, { useState, useMemo, useRef, ChangeEvent, FormEvent } from "react";
import { FaSearch, FaProjectDiagram } from "react-icons/fa";
import { useTheme } from "@/context/ThemeContext";

interface Project {
  projectName: string;
  address: string;
  totalManpower: number;
  designationWiseCount: Record<string, number>;
  updatedDate: string;
}

interface DesignationCount {
  designation: string;
  count: string;
}

const dummyProjects: Project[] = [
  {
    projectName: "Salarapuria Sattva Northland",
    address:
      "Salarpuria Sattva Northland, Survey No. 130, Hennur Main Road Post, near United Public School, Kannuru, Bengaluru, Karnataka 562149",
    totalManpower: 4,
    designationWiseCount: {
      "Security Supervisor": 4,
    },
    updatedDate: "2025-02-07T06:21:03.212Z",
  },
  {
    projectName: "Prestige Lakeside Habitat",
    address:
      "Prestige Lakeside Habitat, Whitefield-Sarjapur Road, Varthur, Bengaluru, Karnataka 560087",
    totalManpower: 10,
    designationWiseCount: {
      "Security Supervisor": 2,
      "Security Guard": 8,
    },
    updatedDate: "2025-01-15T10:45:00.000Z",
  },
  {
    projectName: "Brigade Gateway",
    address:
      "Brigade Gateway, Dr Rajkumar Rd, Malleswaram West, Bengaluru, Karnataka 560055",
    totalManpower: 6,
    designationWiseCount: {
      "Security Supervisor": 1,
      "Security Guard": 5,
    },
    updatedDate: "2025-02-01T14:30:00.000Z",
  },
];

const designationOptions = [
  "All Designations",
  ...Array.from(
    new Set(
      dummyProjects.flatMap((p) => Object.keys(p.designationWiseCount))
    )
  ),
];

export default function ProjectManagementPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("All Designations");
  const [projects, setProjects] = useState<Project[]>(dummyProjects);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    projectName: string;
    address: string;
    totalManpower: string;
    designationWiseCount: DesignationCount[];
  }>({
    projectName: "",
    address: "",
    totalManpower: "",
    designationWiseCount: [{ designation: "", count: "" }],
  });
  const modalRef = useRef<HTMLDivElement | null>(null);

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idx: number | null = null
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("designation-") || name.startsWith("count-")) {
      const field = name.split("-")[0];
      const index = parseInt(name.split("-")[1], 10);
      setForm((prev) => {
        const updated = [...prev.designationWiseCount];
        (updated[index] as any)[field] = value;
        return { ...prev, designationWiseCount: updated };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addDesignationField = () => {
    setForm((prev) => ({
      ...prev,
      designationWiseCount: [...prev.designationWiseCount, { designation: "", count: "" }],
    }));
  };

  const removeDesignationField = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      designationWiseCount: prev.designationWiseCount.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateProject = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const designationObj: Record<string, number> = {};
    form.designationWiseCount.forEach((item) => {
      if (item.designation && item.count) {
        designationObj[item.designation] = parseInt(item.count, 10);
      }
    });
    setProjects((prev) => [
      {
        projectName: form.projectName,
        address: form.address,
        totalManpower: parseInt(form.totalManpower, 10),
        designationWiseCount: designationObj,
        updatedDate: new Date().toISOString(),
      },
      ...prev,
    ]);
    setShowModal(false);
    setForm({
      projectName: "",
      address: "",
      totalManpower: "",
      designationWiseCount: [{ designation: "", count: "" }],
    });
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        search === "" ||
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        project.address.toLowerCase().includes(search.toLowerCase());
      const matchesDesignation =
        designationFilter === "All Designations" ||
        Object.keys(project.designationWiseCount).includes(designationFilter);
      return matchesSearch && matchesDesignation;
    });
  }, [search, designationFilter, projects]);

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-900"
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div
          className={`rounded-2xl mb-8 p-6 flex items-center gap-5 shadow-lg bg-gradient-to-r ${
            theme === "dark"
              ? "from-blue-900 to-blue-700"
              : "from-blue-500 to-blue-800"
          }`}
        >
          <div
            className={`rounded-xl p-4 flex items-center justify-center ${
              theme === "dark" ? "bg-blue-900 bg-opacity-40" : "bg-blue-600 bg-opacity-30"
            }`}
          >
            <FaProjectDiagram className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Project Management</h1>
            <p className="text-white text-base opacity-90">View and manage all projects and their manpower details.</p>
          </div>
        </div>
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex flex-row flex-wrap gap-2 items-center w-full md:w-auto">
            <div className="relative w-44 min-w-[130px]">
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              >
                {designationOptions.map((designation) => (
                  <option key={designation} value={designation}>{designation}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Search project name or address..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 ${
                  theme === "dark"
                    ? "bg-gray-800 border-blue-900 text-white"
                    : "bg-white border-gray-200 text-black"
                }`}
              />
            </div>
          </div>
        </div>
        {/* Create Project Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowModal(true)}
            className={`font-semibold px-6 py-2 rounded-lg shadow transition-colors flex items-center gap-2 ${
              theme === "dark"
                ? "bg-blue-700 hover:bg-blue-800 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            + Create Project
          </button>
        </div>
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div
              ref={modalRef}
              className={`rounded-2xl shadow-xl p-8 w-full max-w-lg relative ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              <button
                className={`absolute top-4 right-4 text-2xl ${theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>Create Project</h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Project Name</label>
                  <input
                    name="projectName"
                    value={form.projectName}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Total Manpower</label>
                  <input
                    name="totalManpower"
                    type="number"
                    min="1"
                    value={form.totalManpower}
                    onChange={handleFormChange}
                    required
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Designation-wise Count</label>
                  {form.designationWiseCount.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        name={`designation-${idx}`}
                        value={item.designation}
                        onChange={e => handleFormChange(e, idx)}
                        placeholder="Designation"
                        required
                        className={`flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                      <input
                        name={`count-${idx}`}
                        type="number"
                        min="1"
                        value={item.count}
                        onChange={e => handleFormChange(e, idx)}
                        placeholder="Count"
                        required
                        className={`w-24 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${theme === "dark" ? "bg-gray-800 border-blue-900 text-white" : "border-gray-300"}`}
                      />
                      {form.designationWiseCount.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDesignationField(idx)}
                          className="text-red-500 hover:text-red-700 text-lg px-2"
                          aria-label="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDesignationField}
                    className={`text-sm mt-1 ${theme === "dark" ? "text-blue-400 hover:underline" : "text-blue-600 hover:underline"}`}
                  >
                    + Add Designation
                  </button>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "border-blue-900 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2 rounded-lg font-semibold shadow ${theme === "dark" ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Table */}
        <div className={`overflow-x-auto rounded-xl border shadow-xl ${theme === "dark" ? "border-blue-900 bg-gray-800" : "border-blue-100 bg-white"}`}>
          <table className="min-w-full divide-y">
            <thead className={theme === "dark" ? "bg-blue-900 sticky top-0 z-10" : "bg-blue-50 sticky top-0 z-10"}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Project Name</th>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Address</th>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Total Manpower</th>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Designation-wise Count</th>
                <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${theme === "dark" ? "text-blue-200" : "text-blue-700"}`}>Last Updated</th>
              </tr>
            </thead>
            <tbody className={theme === "dark" ? "divide-y divide-blue-900" : "divide-y divide-blue-50"}>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-4 py-12 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No projects found</td>
                </tr>
              ) : filteredProjects.map((project, idx) => (
                <tr key={idx} className={theme === "dark" ? "hover:bg-blue-900 transition" : "hover:bg-blue-50 transition"}>
                  <td className={`px-4 py-3 font-bold ${theme === "dark" ? "text-blue-200" : "text-blue-800"}`}>{project.projectName}</td>
                  <td className="px-4 py-3 max-w-xs break-words">{project.address}</td>
                  <td className="px-4 py-3">{project.totalManpower}</td>
                  <td className="px-4 py-3">
                    {Object.entries(project.designationWiseCount)
                      .map(([designation, count]) => `${designation}: ${count}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3">{new Date(project.updatedDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}