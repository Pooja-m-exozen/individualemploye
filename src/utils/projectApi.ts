/**
 * Utility functions for making API calls with project filtering
 * Automatically adds project filter for project-wise admins
 */

import { getUserProject, isProjectAdmin } from '@/services/auth';

/**
 * Add project filter to API URL if user is a project-wise admin
 * @param baseUrl - Base API URL
 * @param projectField - Field name for project filter (default: 'projectName')
 * @returns URL with project filter if applicable
 */
export const addProjectFilterToUrl = (
  baseUrl: string,
  projectField: string = 'projectName'
): string => {
  if (isProjectAdmin()) {
    const project = getUserProject();
    if (project) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${projectField}=${encodeURIComponent(project)}`;
    }
  }
  return baseUrl;
};

/**
 * Add project filter to query parameters object
 * @param params - Existing query parameters
 * @param projectField - Field name for project filter (default: 'projectName')
 * @returns Query parameters with project filter if applicable
 */
export const addProjectFilterToParams = (
  params: Record<string, string | number | boolean> = {},
  projectField: string = 'projectName'
): Record<string, string | number | boolean> => {
  if (isProjectAdmin()) {
    const project = getUserProject();
    if (project) {
      return {
        ...params,
        [projectField]: project,
      };
    }
  }
  return params;
};

/**
 * Filter array of items by project
 * @param items - Array of items to filter
 * @param projectField - Field name containing project name (default: 'projectName')
 * @returns Filtered array
 */
export const filterItemsByProject = <T extends Record<string, unknown>>(
  items: T[],
  projectField: string = 'projectName'
): T[] => {
  if (!isProjectAdmin()) {
    return items; // Return all items if not project-wise admin
  }
  
  const project = getUserProject();
  if (!project) {
    return items;
  }
  
  return items.filter((item) => {
    const itemProject = item[projectField];
    return itemProject && itemProject.toLowerCase() === project.toLowerCase();
  });
};

