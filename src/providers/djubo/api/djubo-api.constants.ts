export const DJUBO_DEFAULT_BASE_URL =
  "https://www.secure-booking-engine.com/djubo-direct";

export const DJUBO_ENDPOINTS = {
  availability: { method: "POST", path: "/availability", enabled: true },
  guestCreate: { method: "POST", path: "/guest-populate", enabled: true },
  guestUpdate: { method: "POST", path: "/guest-populate", enabled: true },
  guestHistory: {
    method: "POST",
    path: "/guest-history-search",
    enabled: true,
  },
  booking: { method: "POST", path: "/booking_submit", enabled: true },
  bookingInformation: { method: "GET", path: "/booking_verify", enabled: true },
  reservation: { method: "POST", path: "/fetch-reservation", enabled: true },
  roomAvailability: {
    method: "POST",
    path: "/room-availability",
    enabled: true,
  },
  roomStatus: { method: "POST", path: "/fetch-room-status", enabled: true },
  checkIn: { method: "POST", path: "/update-booking-stage", enabled: true },
  checkOut: { method: "POST", path: "/update-booking-stage", enabled: true },
  cancellation: { method: "POST", path: "/cancel-reservation", enabled: true },
  bookingUpdate: { method: "POST", path: "/update-reservation", enabled: true },
} as const;
