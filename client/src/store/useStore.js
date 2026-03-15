import { create } from "zustand";
import { persist } from "zustand/middleware";

const useStore = create(
  persist(
    (set, get) => ({
      // ─── Auth ────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (token) => set({ accessToken: token }),

      login: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, activeRide: null }),

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      // ─── Active Ride ─────────────────────────────────────────────────
      activeRide: null,
      setActiveRide: (ride) => set({ activeRide: ride }),
      clearActiveRide: () => set({ activeRide: null }),

      // ─── Fare Estimate ───────────────────────────────────────────────
      fareEstimate: null,
      setFareEstimate: (estimate) => set({ fareEstimate: estimate }),

      // ─── Driver State ────────────────────────────────────────────────
      nearbyRides: [],
      setNearbyRides: (rides) => set({ nearbyRides: rides }),

      driverStats: null,
      setDriverStats: (stats) => set({ driverStats: stats }),

      // ─── Notification ────────────────────────────────────────────────
      notification: null,
      setNotification: (msg, type = "info") =>
        set({ notification: { msg, type, id: Date.now() } }),
      clearNotification: () => set({ notification: null }),
    }),
    {
      name: "chaloride-store",
      // Only persist these keys
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useStore;
