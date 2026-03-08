export const API_BASE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return "https://api.governor.run";
  return "http://localhost:4000";
})();
