/**
 * Custom hook for project-wise admin filtering
 * Automatically filters data based on the logged-in admin's project
 */

import { useMemo } from 'react';
import { getUserProject, isProjectAdmin, getUserRole } from '@/services/auth';

export interface ProjectFilterOptions {
  projectName?: string;
  projectField?: string; // Field name in API/data (default: 'projectName')
}

/**
 * Hook to get project filter for API requests
 * Returns project name if user is a project-wise admin, null otherwise
 */
export const useProjectFilter = () => {
  const projectName = useMemo(() => {
    const role = getUserRole();
    if (role === 'Admin') {
      return getUserProject();
    }
    return null;
  }, []);

  const isProjectWiseAdmin = useMemo(() => {
    return isProjectAdmin();
  }, []);

  /**
   * Get project filter for API query parameters
   */
  const getProjectFilter = (fieldName: string = 'projectName'): Record<string, string> | null => {
    if (projectName) {
      return { [fieldName]: projectName };
    }
    return null;
  };

  /**
   * Add project filter to existing query params
   */
  const addProjectFilter = (
    existingParams: Record<string, any> = {},
    fieldName: string = 'projectName'
  ): Record<string, any> => {
    if (projectName) {
      return {
        ...existingParams,
        [fieldName]: projectName,
      };
    }
    return existingParams;
  };

  /**
   * Filter array of items by project
   */
  const filterByProject = <T extends Record<string, any>>(
    items: T[],
    projectField: string = 'projectName'
  ): T[] => {
    if (!projectName) {
      return items; // If no project filter, return all items
    }
    return items.filter((item) => {
      const itemProject = item[projectField];
      return itemProject && itemProject.toLowerCase() === projectName.toLowerCase();
    });
  };

  return {
    projectName,
    isProjectWiseAdmin,
    getProjectFilter,
    addProjectFilter,
    filterByProject,
  };
};

