// Shared by middleware (edge) and the server, so no Node-only imports here.

export const SECURE_COOKIE =
  process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";

/** `__Host-` requires Secure, Path=/ and no Domain, so it is only used over HTTPS. */
export const SESSION_COOKIE = SECURE_COOKIE ? "__Host-rp_session" : "rp_session";

/** Both possible names, for middleware's presence check (its env may differ from the server's). */
export const SESSION_COOKIE_NAMES = ["__Host-rp_session", "rp_session"];
