import { API } from 'aws-amplify';
import { getAlias, getV2ContentMetadata } from '../graphql/queries';

export default async function getV2Metadata(seriesId: string): Promise<any> {
  try {
    const aliasResponse: any = await (API.graphql({
      query: getAlias,
      variables: { id: seriesId },
      authMode: 'API_KEY',
    }) as Promise<any>);

    if (aliasResponse?.data?.getAlias?.v2ContentMetadata) {
      return aliasResponse.data.getAlias.v2ContentMetadata;
    }

    const response: any = await (API.graphql({
      query: getV2ContentMetadata,
      variables: { id: seriesId },
      authMode: 'API_KEY',
    }) as Promise<any>);

    if (response?.data?.getV2ContentMetadata) {
      return response.data.getV2ContentMetadata;
    }

    throw new Error('No metadata found');
  } catch (error) {
    console.log(error);
    throw error;
  }
}
