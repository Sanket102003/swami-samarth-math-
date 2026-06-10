const BASE_URL =
  "https://www.swamisamrathbhuigaon.com/_functions";

async function apiRequest(endpoint, options = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...(options.headers || {}),
  };

  // Debug log
  console.log("API URL:", `${BASE_URL}${endpoint}`);

  let response;

  try {
    response = await fetch(
      `${BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );
  } catch (err) {
    console.error("FETCH ERROR:", err);
    throw new Error(
      "Unable to connect to the server"
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid server response");
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      "API request failed"
    );
  }

  return data;
}

export default apiRequest;