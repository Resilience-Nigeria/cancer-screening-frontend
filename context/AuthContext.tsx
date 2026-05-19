import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';

interface Facility {
  facilityId: number;
  facilityName: string;
  facilityCode: string;
}

interface UserRole {
  roleId: number;
  roleName: 'SUPER_ADMIN' | 'NICRAT_STAFF' | 'HOSPITAL_ADMIN' | 'DATA_CLERK';
  roleDescription?: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: number; // roleId
  user_role?: UserRole;
  facilityId?: number;
  facility?: Facility;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Role checks
  isSuperAdmin: () => boolean;
  isNicratStaff: () => boolean;
  isHospitalAdmin: () => boolean;
  isDataClerk: () => boolean;
  
  // Access level checks
  hasNationalAccess: () => boolean;
  hasFacilityAccess: () => boolean;
  
  // Permission checks
  canCreateUsers: () => boolean;
  canManageFacilities: () => boolean;
  canViewAllData: () => boolean;
  
  // Get role display name
  getRoleName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Get current user from API
      const { data } = await api.get('/auth/me');
      setUser(data.user || data);
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    
    localStorage.setItem('token', data.token || data.access_token);
    setUser(data.user);
    
    // Redirect based on role
    router.push('/ncsr/dashboard');
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  }

  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user || data);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }

  // Role check methods
  function isSuperAdmin(): boolean {
    return user?.user_role?.roleName === 'SUPER_ADMIN';
  }

  function isNicratStaff(): boolean {
    return user?.user_role?.roleName === 'NICRAT_STAFF';
  }

  function isHospitalAdmin(): boolean {
    return user?.user_role?.roleName === 'HOSPITAL_ADMIN';
  }

  function isDataClerk(): boolean {
    return user?.user_role?.roleName === 'DATA_CLERK';
  }

  // Access level checks
  function hasNationalAccess(): boolean {
    const roleName = user?.user_role?.roleName;
    return roleName === 'SUPER_ADMIN' || roleName === 'NICRAT_STAFF';
  }

  function hasFacilityAccess(): boolean {
    const roleName = user?.user_role?.roleName;
    return roleName === 'HOSPITAL_ADMIN' || roleName === 'DATA_CLERK';
  }

  // Permission checks
  function canCreateUsers(): boolean {
    const roleName = user?.user_role?.roleName;
    return roleName === 'SUPER_ADMIN' || roleName === 'HOSPITAL_ADMIN';
  }

  function canManageFacilities(): boolean {
    return isSuperAdmin();
  }

  function canViewAllData(): boolean {
    return hasNationalAccess();
  }

  // Get role display name
  function getRoleName(): string {
    const roleName = user?.user_role?.roleName;
    if (!roleName) return 'Unknown';
    
    const roleNames: Record<string, string> = {
      'SUPER_ADMIN': 'Super Administrator',
      'NICRAT_STAFF': 'NICRAT Staff',
      'HOSPITAL_ADMIN': 'Hospital Administrator',
      'DATA_CLERK': 'Data Clerk',
    };
    
    return roleNames[roleName] || roleName;
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isSuperAdmin,
    isNicratStaff,
    isHospitalAdmin,
    isDataClerk,
    hasNationalAccess,
    hasFacilityAccess,
    canCreateUsers,
    canManageFacilities,
    canViewAllData,
    getRoleName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: Array<'SUPER_ADMIN' | 'NICRAT_STAFF' | 'HOSPITAL_ADMIN' | 'DATA_CLERK'>
) {
  return function ProtectedRoute(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push('/login');
        } else if (allowedRoles && !allowedRoles.includes(user.user_role?.roleName as any)) {
          router.push('/ncsr/unauthorized');
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    if (allowedRoles && !allowedRoles.includes(user.user_role?.roleName as any)) {
      return null;
    }

    return <Component {...props} />;
  };
}