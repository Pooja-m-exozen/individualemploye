import { createContext, useContext } from 'react';

interface User {
  fullName: string;
  email?: string;
  role?: string;
  // Add other user properties as needed
}

export const UserContext = createContext<User | null>(null);

export const useUser = () => useContext(UserContext); 