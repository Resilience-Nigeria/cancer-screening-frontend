export interface Facility {
  id: number;
  facilityName: string;
  facilityCode: string;
  facilityState?: string | null;
  facilityLga?: string | null;
  facilityAddress?: string | null;
}

export interface User {
  id: number;
  facilityId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  alternatePhoneNumber?: string | null;
  role: string;
  status?: string;
  facility?: Facility | null;
}

// Updated login response with status field
export interface LoginResponse {
  status: boolean;
  message: string;
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

// Legacy response type for backward compatibility
export interface LegacyLoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;  // Can be email or phone number
  password: string;
}

export interface RefreshResponse {
  status: boolean;
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MeResponse {
  status: boolean;
  user: User;
}

export interface LogoutResponse {
  status: boolean;
  message: string;
}

export interface ErrorResponse {
  status: false;
  code?: string;
  message: string;
}