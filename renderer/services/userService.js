import apiRequest from "./api";

// Get profile
export async function getProfile() {
  return await apiRequest("/profile");
}

// Update profile
export async function updateProfile(formData) {
  return await apiRequest("/update_profile", {
    method: "POST",
    body: JSON.stringify(formData),
  });
}