export const hashString = (str) => {
  let hash = 0;
  if (!str || str.length === 0) return hash;
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
