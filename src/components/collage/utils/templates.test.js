import { deleteTemplate, updateTemplate } from '../../../graphql/mutations';
import { templatesByOwnerIdentityIdAndCreatedAt } from '../../../graphql/queries';

const mockGraphql = jest.fn();
const mockCurrentCredentials = jest.fn();
const mockStoragePut = jest.fn();
const mockStorageRemove = jest.fn();
const mockStorageGet = jest.fn();

jest.mock('aws-amplify', () => ({
  API: {
    graphql: (...args) => mockGraphql(...args),
  },
  Auth: {
    currentCredentials: (...args) => mockCurrentCredentials(...args),
  },
  Storage: {
    put: (...args) => mockStoragePut(...args),
    remove: (...args) => mockStorageRemove(...args),
    get: (...args) => mockStorageGet(...args),
  },
  graphqlOperation: (query, variables) => ({ query, variables }),
}));

const {
  __debugGetCache,
  clearTemplateCache,
  deleteProject,
  loadProjects,
  upsertProject,
} = require('./templates');

const BASE_RECORD = {
  id: 'template-1',
  ownerIdentityId: 'identity-1',
  name: 'Original Name',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  snapshotKey: 'collage/templates/template-1/snapshot.json',
  snapshotVersion: 2,
  thumbnailKey: 'collage/templates/template-1/thumbnail.jpg',
  thumbnailSignature: null,
  thumbnailUpdatedAt: null,
};

describe('templates module', () => {
  beforeEach(() => {
    clearTemplateCache();
    mockGraphql.mockReset();
    mockCurrentCredentials.mockReset();
    mockStoragePut.mockReset();
    mockStorageRemove.mockReset();
    mockStorageGet.mockReset();

    mockCurrentCredentials.mockResolvedValue({ identityId: 'identity-1' });
    mockStoragePut.mockResolvedValue(undefined);
    mockStorageRemove.mockResolvedValue(undefined);
    mockStorageGet.mockResolvedValue(null);
  });

  it('loads projects once and serves cached clones on subsequent reads', async () => {
    mockGraphql.mockImplementation(async (operation) => {
      if (operation?.query === templatesByOwnerIdentityIdAndCreatedAt) {
        return {
          data: {
            templatesByOwnerIdentityIdAndCreatedAt: {
              items: [BASE_RECORD],
              nextToken: null,
            },
          },
        };
      }
      throw new Error('Unexpected graphql operation in loadProjects test');
    });

    const first = await loadProjects();
    expect(first).toHaveLength(1);
    expect(first[0].name).toBe('Original Name');

    first[0].name = 'Mutated in test';

    const second = await loadProjects();
    expect(second).toHaveLength(1);
    expect(second[0].name).toBe('Original Name');

    const listCalls = mockGraphql.mock.calls.filter(
      ([operation]) => operation?.query === templatesByOwnerIdentityIdAndCreatedAt
    );
    expect(listCalls).toHaveLength(1);
  });

  it('upserts project state and updates cache with mocked API response', async () => {
    mockGraphql.mockImplementation(async (operation) => {
      if (operation?.query === templatesByOwnerIdentityIdAndCreatedAt) {
        return {
          data: {
            templatesByOwnerIdentityIdAndCreatedAt: {
              items: [BASE_RECORD],
              nextToken: null,
            },
          },
        };
      }

      if (operation?.query === updateTemplate) {
        return {
          data: {
            updateTemplate: {
              ...BASE_RECORD,
              name: operation?.variables?.input?.name || 'Updated Name',
              updatedAt: '2025-01-02T00:00:00.000Z',
              snapshotVersion: operation?.variables?.input?.snapshotVersion || 3,
            },
          },
        };
      }

      throw new Error('Unexpected graphql operation in upsertProject test');
    });

    await loadProjects();

    const snapshot = {
      version: 1,
      images: [{ url: 'https://example.com/image.jpg' }],
      panelImageMapping: { 'panel-1': 0 },
      panelTransforms: {},
      panelTexts: {},
      selectedTemplateId: 'tmpl-1',
      selectedAspectRatio: 'portrait',
      panelCount: 1,
      borderThickness: 'medium',
      borderColor: '#fff',
    };

    const updated = await upsertProject('template-1', {
      name: 'Updated Name',
      state: snapshot,
    });

    expect(mockStoragePut).toHaveBeenCalledTimes(1);

    const updateCall = mockGraphql.mock.calls.find(
      ([operation]) => operation?.query === updateTemplate
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall?.[0]?.variables?.input?.snapshotVersion).toBe(3);

    expect(updated.name).toBe('Updated Name');
    expect(updated.state).toEqual(snapshot);

    const cached = __debugGetCache().get('template-1');
    expect(cached?.name).toBe('Updated Name');
    expect(cached?.state).toEqual(snapshot);
  });

  it('deletes project and removes snapshot/thumbnail objects from storage', async () => {
    mockGraphql.mockImplementation(async (operation) => {
      if (operation?.query === templatesByOwnerIdentityIdAndCreatedAt) {
        return {
          data: {
            templatesByOwnerIdentityIdAndCreatedAt: {
              items: [BASE_RECORD],
              nextToken: null,
            },
          },
        };
      }

      if (operation?.query === deleteTemplate) {
        return {
          data: {
            deleteTemplate: {
              id: 'template-1',
            },
          },
        };
      }

      throw new Error('Unexpected graphql operation in deleteProject test');
    });

    await loadProjects();
    expect(__debugGetCache().has('template-1')).toBe(true);

    await deleteProject('template-1');

    expect(mockStorageRemove).toHaveBeenCalledTimes(2);
    expect(mockStorageRemove).toHaveBeenCalledWith('collage/templates/template-1/snapshot.json', expect.any(Object));
    expect(mockStorageRemove).toHaveBeenCalledWith('collage/templates/template-1/thumbnail.jpg', expect.any(Object));
    expect(__debugGetCache().has('template-1')).toBe(false);
  });
});
