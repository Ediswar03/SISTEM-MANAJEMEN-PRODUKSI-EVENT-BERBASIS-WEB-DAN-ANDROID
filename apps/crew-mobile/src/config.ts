/** Shared API origin for the future Expo client. Not a database connection. */
export const CREW_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
