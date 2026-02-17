import type { CollageProject, CollageSnapshot } from '../../../../types/collage';

export type TemplateModel = {
  id: string;
  ownerIdentityId?: string | null;
  name?: string | null;
  state?: string | CollageSnapshot | null;
  snapshotKey?: string | null;
  snapshotVersion?: number | null;
  thumbnailKey?: string | null;
  thumbnailSignature?: string | null;
  thumbnailUpdatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TemplatesByOwnerIdentityIdQuery = {
  templatesByOwnerIdentityIdAndCreatedAt?: {
    items?: (TemplateModel | null)[] | null;
    nextToken?: string | null;
  } | null;
};

export type GetTemplateQuery = {
  getTemplate?: TemplateModel | null;
};

export type CreateTemplateMutation = {
  createTemplate?: TemplateModel | null;
};

export type UpdateTemplateMutation = {
  updateTemplate?: TemplateModel | null;
};

export type DeleteTemplateMutation = {
  deleteTemplate?: TemplateModel | null;
};

export type UpsertProjectPayload = Partial<
  Pick<
    CollageProject,
    | 'name'
    | 'thumbnail'
    | 'thumbnailKey'
    | 'thumbnailSignature'
    | 'thumbnailUpdatedAt'
    | 'state'
    | 'snapshotKey'
    | 'snapshotVersion'
  >
>;

export type ThumbnailCacheEntry = {
  url: string;
  signature: string;
  expiresAt: number;
};

export type TemplatesListener = (templates: CollageProject[]) => void;
export type ProjectListener = (project: CollageProject) => void;

export type GraphQLSubscriptionHandle = {
  unsubscribe?: () => void;
};
