import { nanoid } from 'nanoid';

const SESSION_STORAGE_KEY = 'sessionID';
const SESSION_ID_PREFIX = 'sess-';

let inMemorySessionId: string | null = null;
let hasLoggedReadFailure = false;
let hasLoggedWriteFailure = false;

const buildSessionId = (): string => `${SESSION_ID_PREFIX}${nanoid(12)}`;

const readSessionId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.startsWith(SESSION_ID_PREFIX)) {
      return existing;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedReadFailure) {
      hasLoggedReadFailure = true;
      // eslint-disable-next-line no-console
      console.warn('Unable to read session id from sessionStorage', error);
    }
  }

  return null;
};

const persistSessionId = (sessionId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedWriteFailure) {
      hasLoggedWriteFailure = true;
      // eslint-disable-next-line no-console
      console.warn('Unable to persist session id', error);
    }
  }
};

const getSessionID = async (): Promise<string> => {
  if (inMemorySessionId) {
    return inMemorySessionId;
  }

  const existing = readSessionId();
  if (existing) {
    inMemorySessionId = existing;
    return existing;
  }

  const newSessionId = buildSessionId();
  inMemorySessionId = newSessionId;
  persistSessionId(newSessionId);
  return newSessionId;
};

export default getSessionID;
