const isQuotaExceededError = (error: unknown): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (error instanceof DOMException) {
    return (
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  return false;
};

const hasLocalStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export const safeGetItem = (key: string): string | null => {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`localStorage getItem failed for key "${key}".`, error);
    return null;
  }
};

export const safeRemoveItem = (key: string): boolean => {
  if (!hasLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`localStorage removeItem failed for key "${key}".`, error);
    return false;
  }
};

export const safeSetItem = (key: string, value: string): boolean => {
  if (!hasLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn(`localStorage quota exceeded when setting key "${key}".`);

      try {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.warn(`localStorage retry failed for key "${key}".`, retryError);
      }
    } else {
      console.warn(`localStorage setItem failed for key "${key}".`, error);
    }

    return false;
  }
};

export const readJSON = <T>(key: string): T | null => {
  const raw = safeGetItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`localStorage JSON parse failed for key "${key}".`, error);
    return null;
  }
};

export const writeJSON = (key: string, value: unknown): boolean => {
  try {
    const serialized = JSON.stringify(
      value,
      (propertyKey, propertyValue) => {
        if (propertyKey === 'storage') {
          return undefined;
        }

        if (
          typeof Storage !== 'undefined' &&
          propertyValue instanceof Storage
        ) {
          return undefined;
        }

        return propertyValue;
      }
    );
    return safeSetItem(key, serialized);
  } catch (error) {
    console.warn(`localStorage JSON stringify failed for key "${key}".`, error);
    return false;
  }
};

