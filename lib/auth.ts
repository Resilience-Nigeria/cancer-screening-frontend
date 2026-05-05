const TOKEN_KEY = "csr_token";
const USER_KEY = "csr_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// New user data functions
export function setUser(user: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

export function getUserFullName(): string {
  const user = getUser();
  if (!user) return "";
  return `${user.firstName} ${user.lastName}`.trim();
}

export function getUserRole(): string | null {
  const user = getUser();
  return user?.role || null;
}

export function hasRole(role: string): boolean {
  const userRole = getUserRole();
  return userRole === role;
}

export function getUserFacility() {
  const user = getUser();
  return user?.facility || null;
}

export function getFacilityName(): string {
  const facility = getUserFacility();
  return facility?.facilityName || "";
}

export function getFacilityId(): number | null {
  const user = getUser();
  return user?.facilityId || null;
}

export function getUserEmail(): string {
  const user = getUser();
  return user?.email || "";
}

export function getUserPhone(): string {
  const user = getUser();
  return user?.phoneNumber || "";
}

export function isAccountActive(): boolean {
  const user = getUser();
  return user?.status === "active" || true; // Default to true if status not present
}

export function clearAuth() {
  clearToken();
}