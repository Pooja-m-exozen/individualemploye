import { getAuthToken } from './auth';

export const BASE_URL = 'http://192.168.0.5:4000';

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
};
