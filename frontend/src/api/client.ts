import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Add request interceptor to attach auth token
apiClient.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem("checkoutdesignator_auth");
    if (stored) {
      try {
        const { token } = JSON.parse(stored);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API error", error.response.data);
      
      // Auto-logout on 401 Unauthorized
      if (error.response.status === 401) {
        const stored = localStorage.getItem("checkoutdesignator_auth");
        if (stored) {
          localStorage.removeItem("checkoutdesignator_auth");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
