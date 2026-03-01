import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API error", error.response.data);
    }
    return Promise.reject(error);
  }
);
