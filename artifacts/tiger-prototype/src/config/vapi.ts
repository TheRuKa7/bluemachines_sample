/**
 * VAPI credentials for Blue Machines interview prototype.
 * User will rotate keys after interview — committed per explicit request.
 */
export const VAPI_PUBLIC_KEY =
  import.meta.env.VITE_VAPI_PUBLIC_KEY ?? "7eb1f78f-53d5-4a6d-8efe-af3e9a045157";

/** Persistent assistant created via VAPI API (server-provisioned). */
export const VAPI_ASSISTANT_ID =
  import.meta.env.VITE_VAPI_ASSISTANT_ID ?? "c341c52c-69bb-4a37-a6f8-b31d1910273f";

export const VAPI_SESSION_API = "/api/vapi-session";
