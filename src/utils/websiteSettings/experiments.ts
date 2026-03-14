import { API, graphqlOperation } from 'aws-amplify';
import { getWebsiteSetting } from '../../graphql/queries';

const GLOBAL_SETTINGS_ID = 'globalSettings';
const INVALID_EXPERIMENTS_HOST_NAMES = new Set(['example.com']);

export type ExperimentsHostStatus = {
  apiBase: string | null;
  healthy: boolean;
  reason: string;
};

const normalizeExperimentsHostName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const normalizedInput = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    return new URL(normalizedInput).origin;
  } catch (_) {
    return null;
  }
};

export const getExperimentsHostName = async (): Promise<string | null> => {
  const response = await (API.graphql(
    graphqlOperation(getWebsiteSetting, { id: GLOBAL_SETTINGS_ID })
  ) as Promise<any>);
  return normalizeExperimentsHostName(response?.data?.getWebsiteSetting?.experimentsHostName);
};

export const getExperimentsHostStatus = async (): Promise<ExperimentsHostStatus> => {
  const apiBase = await getExperimentsHostName();
  if (!apiBase) {
    return {
      apiBase: null,
      healthy: false,
      reason: 'Experiments host name is not configured.',
    };
  }

  const hostname = new URL(apiBase).hostname.toLowerCase();
  if (INVALID_EXPERIMENTS_HOST_NAMES.has(hostname)) {
    return {
      apiBase,
      healthy: false,
      reason: 'Experiments host name is still using a placeholder value.',
    };
  }

  try {
    const response = await fetch(`${apiBase}/api/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        apiBase,
        healthy: false,
        reason: 'Experiments service is unavailable right now.',
      };
    }

    try {
      const payload = await response.json();
      if (payload?.ok === false || payload?.services?.comfy?.ok === false) {
        return {
          apiBase,
          healthy: false,
          reason: payload?.error || payload?.services?.comfy?.error || 'Experiments service is unavailable right now.',
        };
      }
    } catch (_) {
      // A 200 response is sufficient for enablement even if the body is empty or non-JSON.
    }

    return {
      apiBase,
      healthy: true,
      reason: '',
    };
  } catch (_) {
    return {
      apiBase,
      healthy: false,
      reason: 'Experiments service is unavailable right now.',
    };
  }
};
