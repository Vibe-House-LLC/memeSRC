import { API, graphqlOperation } from "aws-amplify";
import { SourceMediaFile, ModelSourceMediaFilesConnection } from "../types";

const getSourceMediaFilesQuery = /* GraphQL */ `
  query GetSourceMediaFiles($sourceMediaId: ID!, $limit: Int, $nextToken: String) {
    getSourceMedia(id: $sourceMediaId) {
      id
      files(limit: $limit, nextToken: $nextToken) {
        items {
          id
          key
          status
          createdAt
          updatedAt
          sourceMediaFilesId
          unzippedPath
          __typename
        }
        nextToken
        __typename
      }
      __typename
    }
  }
`;

export interface GetSourceMediaFilesResponse {
  data: {
    getSourceMedia: {
      id: string;
      files: ModelSourceMediaFilesConnection;
      __typename: "SourceMedia";
    };
  };
}

export interface GetSourceMediaFilesOptions {
  limit?: number;
  nextToken?: string;
}

export default async function getSourceMediaFiles(
  sourceMediaId: string, 
  options: GetSourceMediaFilesOptions = {}
): Promise<ModelSourceMediaFilesConnection> {
  const { limit = 50, nextToken } = options;
  
  const response = await API.graphql<GetSourceMediaFilesResponse>(
    graphqlOperation(
      getSourceMediaFilesQuery,
      { 
        sourceMediaId,
        limit,
        nextToken
      }
    )
  ) as GetSourceMediaFilesResponse;
  
  return response.data.getSourceMedia.files;
}

// Helper function to get all files (handles pagination automatically)
export async function getAllSourceMediaFiles(sourceMediaId: string): Promise<SourceMediaFile[]> {
  const allFiles: SourceMediaFile[] = [];
  let nextToken: string | null = null;
  
  do {
    const response = await getSourceMediaFiles(sourceMediaId, { nextToken: nextToken || undefined });
    allFiles.push(...response.items);
    nextToken = response.nextToken;
  } while (nextToken);
  
  return allFiles;
}
