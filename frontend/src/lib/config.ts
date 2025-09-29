const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");
