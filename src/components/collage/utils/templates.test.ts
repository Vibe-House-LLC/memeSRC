import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import {
  clearTemplateCache,
  createProject,
  loadProjects,
  subscribeToTemplates,
  upsertProject,
} from './templates';
import type { CollageSnapshot } from '../../../types/collage';

type AsyncMock = Mock<Promise<unknown>, any[]>;

const createAsyncMock = (): AsyncMock => jest.fn<Promise<unknown>, any[]>();

jest.mock('aws-amplify', () => ({
  API: { graphql: createAsyncMock() },
  Auth: { currentCredentials: createAsyncMock() },
  Storage: {
    put: createAsyncMock(),
    get: createAsyncMock(),
    remove: createAsyncMock(),
  },
  graphqlOperation: (query: unknown, variables: unknown) => ({ query, variables }),
}));

type AmplifyModule = {
  API: { graphql: AsyncMock };
  Auth: { currentCredentials: AsyncMock };
  Storage: {
    put: AsyncMock;
    get: AsyncMock;
    remove: AsyncMock;
  };
};

const amplifyModule = jest.requireMock('aws-amplify') as AmplifyModule;

const mockAmplify = {
  apiGraphql: amplifyModule.API.graphql,
  authCurrentCredentials: amplifyModule.Auth.currentCredentials,
  storagePut: amplifyModule.Storage.put,
  storageGet: amplifyModule.Storage.get,
  storageRemove: amplifyModule.Storage.remove,
};

jest.mock('../../../graphql/mutations', () => ({
  createTemplate: 'createTemplateMutation',
  deleteTemplate: 'deleteTemplateMutation',
  updateTemplate: 'updateTemplateMutation',
}));

jest.mock('../../../graphql/queries', () => ({
  listTemplates: 'listTemplatesQuery',
  getTemplate: 'getTemplateQuery',
}));

describe('templates utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTemplateCache();
    mockAmplify.authCurrentCredentials.mockResolvedValue({ identityId: 'identity-123' });
  });

  it('notifies subscribers when loadProjects fetches templates', async () => {
    const createdAt = '2025-01-27T10:00:00.000Z';
    mockAmplify.apiGraphql.mockResolvedValue({
      data: {
        listTemplates: {
          items: [
            {
              id: 'alpha',
              name: 'Alpha Template',
              createdAt,
              updatedAt: createdAt,
              state: JSON.stringify({
                version: 1,
                images: [],
                panelImageMapping: {},
                panelTransforms: {},
                panelTexts: {},
                selectedTemplateId: null,
                selectedAspectRatio: 'square',
                panelCount: 1,
              }),
            },
          ],
          nextToken: null,
        },
      },
    });

    const listener = jest.fn();
    const unsubscribe = subscribeToTemplates(listener);
    try {
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0]).toEqual([]);

      await loadProjects({ forceRefresh: true });

      expect(listener).toHaveBeenCalledTimes(2);
      const latest = listener.mock.calls[1][0];
      expect(Array.isArray(latest)).toBe(true);
      expect(latest).toHaveLength(1);
      expect(latest[0].id).toBe('alpha');
      expect(latest[0].name).toBe('Alpha Template');
    } finally {
      unsubscribe();
    }
  });

  it('broadcasts updates when templates are created and updated', async () => {
    const timestamp = '2025-01-27T11:00:00.000Z';
    const snapshot: CollageSnapshot = {
      version: 1,
      images: [],
      panelImageMapping: {},
      panelTransforms: {},
      panelTexts: {},
      selectedTemplateId: null,
      selectedAspectRatio: 'square',
      panelCount: 1,
    };

    mockAmplify.apiGraphql.mockImplementation(async ({ query, variables }) => {
      if (query === 'createTemplateMutation') {
        return {
          data: {
            createTemplate: {
              id: 'beta',
              name: variables.input.name,
              ownerIdentityId: 'identity-123',
              createdAt: timestamp,
              updatedAt: timestamp,
              state: null,
            },
          },
        };
      }
      if (query === 'updateTemplateMutation') {
        return {
          data: {
            updateTemplate: {
              id: variables.input.id,
              name: variables.input.name ?? 'Updated Template',
              ownerIdentityId: 'identity-123',
              createdAt: timestamp,
              updatedAt: timestamp,
              state: JSON.stringify(snapshot),
              snapshotKey: variables.input.snapshotKey ?? 'collage/templates/beta/snapshot.json',
              snapshotVersion: variables.input.snapshotVersion ?? 1,
            },
          },
        };
      }
      if (query === 'listTemplatesQuery') {
        return { data: { listTemplates: { items: [], nextToken: null } } };
      }
      throw new Error(`Unexpected query ${String(query)}`);
    });

    mockAmplify.storagePut.mockResolvedValue(undefined);

    const listener = jest.fn();
    const unsubscribe = subscribeToTemplates(listener);
    listener.mockClear();

    try {
      await createProject({ name: 'Created Template' });

      expect(listener).toHaveBeenCalledTimes(1);
      let payload = listener.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].name).toBe('Created Template');

      listener.mockClear();

      await upsertProject('beta', { name: 'Updated Template', state: snapshot });

      expect(mockAmplify.storagePut).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
      payload = listener.mock.calls[0][0];
      expect(payload).toHaveLength(1);
      expect(payload[0].name).toBe('Updated Template');
      expect(payload[0].state?.version).toBe(1);
    } finally {
      unsubscribe();
    }
  });
});
