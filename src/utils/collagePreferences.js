// Utility helpers for collage related pages

export const hashString = (str) => {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash * 33) - hash) + char;
    hash = Math.imul(hash, 1); // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

export const getCollagePreferenceKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-collage-preference-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-collage-preference-${hashedUsername}`;
};

export const getCollagePreference = (user) => {
  const key = getCollagePreferenceKey(user);
  return localStorage.getItem(key) || 'new';
};

export const setCollagePreference = (user, preference) => {
  const key = getCollagePreferenceKey(user);
  localStorage.setItem(key, preference);
};

export const getBannerDismissKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-banner-dismiss-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-banner-dismiss-${hashedUsername}`;
};

export const isBannerDismissed = (user) => {
  const key = getBannerDismissKey(user);
  const dismissedTimestamp = localStorage.getItem(key);
  if (!dismissedTimestamp) return false;

  const now = new Date().getTime();
  const dismissedTime = parseInt(dismissedTimestamp, 10);
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  return (now - dismissedTime) < sevenDaysInMs;
};

export const setBannerDismissed = (user) => {
  const key = getBannerDismissKey(user);
  const now = new Date().getTime().toString();
  localStorage.setItem(key, now);
};
