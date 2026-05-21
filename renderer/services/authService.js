import apiRequest from "./api";

// ===============================
// Register User
// ===============================
export async function registerUser(formData) {
  try {
    const data = await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Registration failed",
    };
  }
}

// ===============================
// Login User
// ===============================
export async function loginUser(credentials) {
  try {
    const data = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Login failed",
    };
  }
}

// ===============================
// Save Authentication Data
// ===============================
export function saveAuthData(data) {
  if (!data || !data.token || !data.user) {
    console.error("Invalid authentication data");
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.user.role || "");
  localStorage.setItem("name", data.user.name || "");
  localStorage.setItem("user", JSON.stringify(data.user));
}

// ===============================
// Logout User
// ===============================
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("name");
  localStorage.removeItem("user");
}

// ===============================
// Get Token
// ===============================
export function getToken() {
  return localStorage.getItem("token");
}

// ===============================
// Get Current User
// ===============================
export function getCurrentUser() {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
}

// ===============================
// Check if User is Authenticated
// ===============================
export function isAuthenticated() {
  return !!getToken();
}

// ===============================
// Get User Role
// ===============================
export function getUserRole() {
  return localStorage.getItem("role");
}

// ===============================
// Get User Name
// ===============================
export function getUserName() {
  return localStorage.getItem("name");
}

// ===============================
// Clear All Authentication Data
// ===============================
export function clearAuthData() {
  logout();
}