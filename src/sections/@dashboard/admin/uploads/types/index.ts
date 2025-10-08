// TypeScript types for Source Media uploads data

export interface User {
  id: string;
  username: string;
}

export interface Series {
  name: string;
}

// Detailed types for GetSourceMedia query
export interface DetailedUser {
  id: string;
  username: string;
  email: string;
  earlyAccessStatus: string;
  contributorAccessStatus: string;
  stripeId: string | null;
  status: string;
  credits: number;
  subscriptionPeriodStart: string | null;
  subscriptionPeriodEnd: string | null;
  subscriptionStatus: string | null;
  magicSubscription: boolean | null;
  createdAt: string;
  updatedAt: string;
  userDetailsStripeCustomerInfoId: string | null;
  __typename: "UserDetails";
}

export interface DetailedSeries {
  id: string;
  tvdbid: number | null;
  slug: string;
  name: string;
  year: number | null;
  image: string | null;
  description: string | null;
  statusText: string | null;
  createdAt: string;
  updatedAt: string;
  __typename: "Series";
}

export interface SourceMediaFile {
  id: string;
  key: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sourceMediaFilesId: string;
  pendingAlias: string | null;
  __typename?: "SourceMediaFiles";
}

export interface File {
  id: string;
  sourceMedia: SourceMedia;
  key: string;
  unzippedPath: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  sourceMediaFilesId: string;
  __typename: "File";
}

export interface Alias {
  id: string;
  createdAt: string;
  updatedAt: string;
  aliasV2ContentMetadataId: string;
  __typename: "Alias";
}

export interface ModelSourceMediaFilesConnection {
  items: SourceMediaFile[];
  nextToken: string | null;
  __typename: "ModelSourceMediaFilesConnection";
}

export interface ModelAliasConnection {
  items: Alias[];
  nextToken: string | null;
  __typename: "ModelAliasConnection";
}

export interface DetailedSourceMedia {
  id: string;
  identityId: string | null;
  series: DetailedSeries;
  files: ModelSourceMediaFilesConnection;
  status: string;
  user: DetailedUser;
  createdAt: string;
  updatedAt: string;
  userDetailsSourceMediaId: string | null;
  sourceMediaSeriesId: string;
  pendingAlias: string | null;
  __typename: "SourceMedia";
}

export interface SourceMedia {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userDetailsSourceMediaId: string | null;
  sourceMediaSeriesId: string;
  user: User | null;
  series: Series;
  __typename: "SourceMedia";
}

export interface ModelSourceMediaConnection {
  items: SourceMedia[];
  nextToken: string | null;
  __typename: "ModelSourceMediaConnection";
}

export interface ListSourceMediasResponse {
  listSourceMedias: ModelSourceMediaConnection;
}

export interface SourceMediaApiResponse {
  data: ListSourceMediasResponse;
}

export interface GetSourceMediaResponse {
  getSourceMedia: DetailedSourceMedia;
}

export interface GetSourceMediaApiResponse {
  data: GetSourceMediaResponse;
}

export interface UpdateSourceMediaResponse {
  updateSourceMedia: DetailedSourceMedia;
}

export interface UpdateSourceMediaApiResponse {
  data: UpdateSourceMediaResponse;
}

export interface UpdateFileResponse {
  updateFile: File;
}

export interface UpdateFileApiResponse {
  data: UpdateFileResponse;
}

export interface ListAliasesResponse {
  listAliases: ModelAliasConnection;
}

export interface ListAliasesApiResponse {
  data: ListAliasesResponse;
}

// Utility types for common operations
export type SourceMediaStatus = "uploaded" | "processing" | "completed" | "failed";

export interface SourceMediaFilters {
  status?: SourceMediaStatus;
  userId?: string;
  seriesId?: string;
  username?: string;
  seriesName?: string;
}

export interface SourceMediaSortOptions {
  field: "createdAt" | "updatedAt" | "status";
  direction: "asc" | "desc";
}

// Type guards for runtime type checking
export const isSourceMedia = (obj: unknown): obj is SourceMedia => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    typeof record.status === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    (record.userDetailsSourceMediaId === null || typeof record.userDetailsSourceMediaId === "string") &&
    typeof record.sourceMediaSeriesId === "string" &&
    (record.user === null || isUser(record.user)) &&
    isSeries(record.series) &&
    record.__typename === "SourceMedia";
};

export const isUser = (obj: unknown): obj is User => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    typeof record.username === "string";
};

export const isSeries = (obj: unknown): obj is Series => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.name === "string";
};

export const isSourceMediaApiResponse = (obj: unknown): obj is SourceMediaApiResponse => {
  const record = obj as Record<string, unknown>;
  const data = record.data as Record<string, unknown>;
  const listSourceMedias = data?.listSourceMedias as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.data === "object" &&
    record.data !== null &&
    typeof listSourceMedias === "object" &&
    listSourceMedias !== null &&
    Array.isArray(listSourceMedias.items) &&
    listSourceMedias.items.every(isSourceMedia) &&
    (listSourceMedias.nextToken === null || typeof listSourceMedias.nextToken === "string") &&
    listSourceMedias.__typename === "ModelSourceMediaConnection";
};

// Type guards for detailed types
export const isDetailedUser = (obj: unknown): obj is DetailedUser => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    typeof record.username === "string" &&
    typeof record.email === "string" &&
    typeof record.earlyAccessStatus === "string" &&
    typeof record.contributorAccessStatus === "string" &&
    (record.stripeId === null || typeof record.stripeId === "string") &&
    typeof record.status === "string" &&
    typeof record.credits === "number" &&
    (record.subscriptionPeriodStart === null || typeof record.subscriptionPeriodStart === "string") &&
    (record.subscriptionPeriodEnd === null || typeof record.subscriptionPeriodEnd === "string") &&
    (record.subscriptionStatus === null || typeof record.subscriptionStatus === "string") &&
    (record.magicSubscription === null || typeof record.magicSubscription === "boolean") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    (record.userDetailsStripeCustomerInfoId === null || typeof record.userDetailsStripeCustomerInfoId === "string") &&
    record.__typename === "UserDetails";
};

export const isDetailedSeries = (obj: unknown): obj is DetailedSeries => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    (record.tvdbid === null || typeof record.tvdbid === "number") &&
    typeof record.slug === "string" &&
    typeof record.name === "string" &&
    (record.year === null || typeof record.year === "number") &&
    (record.image === null || typeof record.image === "string") &&
    (record.description === null || typeof record.description === "string") &&
    (record.statusText === null || typeof record.statusText === "string") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    record.__typename === "Series";
};

export const isSourceMediaFile = (obj: unknown): obj is SourceMediaFile => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    typeof record.key === "string" &&
    typeof record.status === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.sourceMediaFilesId === "string";
};

export const isModelSourceMediaFilesConnection = (obj: unknown): obj is ModelSourceMediaFilesConnection => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    Array.isArray(record.items) &&
    record.items.every(isSourceMediaFile) &&
    (record.nextToken === null || typeof record.nextToken === "string") &&
    record.__typename === "ModelSourceMediaFilesConnection";
};

export const isDetailedSourceMedia = (obj: unknown): obj is DetailedSourceMedia => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    isDetailedSeries(record.series) &&
    isModelSourceMediaFilesConnection(record.files) &&
    typeof record.status === "string" &&
    isDetailedUser(record.user) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    (record.userDetailsSourceMediaId === null || typeof record.userDetailsSourceMediaId === "string") &&
    typeof record.sourceMediaSeriesId === "string" &&
    record.__typename === "SourceMedia";
};

export const isGetSourceMediaApiResponse = (obj: unknown): obj is GetSourceMediaApiResponse => {
  const record = obj as Record<string, unknown>;
  const data = record.data as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.data === "object" &&
    record.data !== null &&
    isDetailedSourceMedia(data.getSourceMedia);
};

export const isUpdateSourceMediaApiResponse = (obj: unknown): obj is UpdateSourceMediaApiResponse => {
  const record = obj as Record<string, unknown>;
  const data = record.data as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.data === "object" &&
    record.data !== null &&
    isDetailedSourceMedia(data.updateSourceMedia);
};

export const isFile = (obj: unknown): obj is File => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    isSourceMedia(record.sourceMedia) &&
    typeof record.key === "string" &&
    (record.unzippedPath === null || typeof record.unzippedPath === "string") &&
    typeof record.status === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.sourceMediaFilesId === "string" &&
    record.__typename === "File";
};

export const isUpdateFileApiResponse = (obj: unknown): obj is UpdateFileApiResponse => {
  const record = obj as Record<string, unknown>;
  const data = record.data as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.data === "object" &&
    record.data !== null &&
    isFile(data.updateFile);
};

export const isAlias = (obj: unknown): obj is Alias => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.aliasV2ContentMetadataId === "string" &&
    record.__typename === "Alias";
};

export const isModelAliasConnection = (obj: unknown): obj is ModelAliasConnection => {
  const record = obj as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    Array.isArray(record.items) &&
    record.items.every(isAlias) &&
    (record.nextToken === null || typeof record.nextToken === "string") &&
    record.__typename === "ModelAliasConnection";
};

export const isListAliasesApiResponse = (obj: unknown): obj is ListAliasesApiResponse => {
  const record = obj as Record<string, unknown>;
  const data = record.data as Record<string, unknown>;
  return typeof obj === "object" &&
    obj !== null &&
    typeof record.data === "object" &&
    record.data !== null &&
    isModelAliasConnection(data.listAliases);
};
