import axios from "axios";
import useStore from "../store/useStore";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send cookies (refresh token)
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor: attach access token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: auto-refresh on 401 ──────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.expired &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.accessToken;
        useStore.getState().setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Typed API helpers ───────────────────────────────────────────────────────
export const authAPI = {
  register:   (data) => api.post("/auth/register", data),
  login:      (data) => api.post("/auth/login", data),
  logout:     ()     => api.post("/auth/logout"),
  getMe:      ()     => api.get("/auth/me"),
};

export const rideAPI = {
  estimate:   (data) => api.post("/rides/estimate", data),
  book:       (data) => api.post("/rides/book", data),
  getActive:  ()     => api.get("/rides/active"),
  getHistory: ()     => api.get("/rides/my"),
  getById:    (id)   => api.get(`/rides/${id}`),
  cancel:     (id)   => api.patch(`/rides/${id}/cancel`),
  rate:       (id, rating) => api.patch(`/rides/${id}/rate`, { rating }),
};

export const driverAPI = {
  toggleAvailability: ()         => api.patch("/driver/availability"),
  updateLocation:     (lat, lng) => api.patch("/driver/location", { lat, lng }),
  getNearbyRides:     ()         => api.get("/driver/nearby-rides"),
  acceptRide:         (id)       => api.patch(`/driver/rides/${id}/accept`),
  startRide:          (id)       => api.patch(`/driver/rides/${id}/start`),
  completeRide:       (id)       => api.patch(`/driver/rides/${id}/complete`),
  getStats:           ()         => api.get("/driver/stats"),
};

export default api;
