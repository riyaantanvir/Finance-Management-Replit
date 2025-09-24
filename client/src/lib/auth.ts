import { User } from "@shared/schema";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export const getAuthState = (): AuthState => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return { user: null, isAuthenticated: false };
  }
  
  try {
    const user = JSON.parse(userStr);
    return { user, isAuthenticated: true };
  } catch {
    localStorage.removeItem('user');
    return { user: null, isAuthenticated: false };
  }
};

export const setAuthState = (user: User | null) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const clearAuthState = () => {
  localStorage.removeItem('user');
};
