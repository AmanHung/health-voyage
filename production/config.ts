// Public identifiers only. Never place OAuth secrets or patient data here.
export const config = {
  apiUrl: import.meta.env.VITE_GOOGLE_API_URL || '',
  liffId: import.meta.env.VITE_LIFF_ID || '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};
export function configured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.apiUrl)
    && /^\d+-[A-Za-z0-9]+$/.test(config.liffId)
    && config.googleClientId.endsWith('.apps.googleusercontent.com');
}
