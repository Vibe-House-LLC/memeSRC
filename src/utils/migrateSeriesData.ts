import { API, graphqlOperation } from 'aws-amplify';
import { listSeries } from '../graphql/queries';
import { updateSeries } from '../graphql/mutations';

async function getAllSeries(nextToken: string | null = null, series: any[] = []): Promise<any[]> {
  const result: any = await (API.graphql(graphqlOperation(listSeries, { nextToken })) as any);
  series.push(...result.data.listSeries.items);

  if (result.data.listSeries.nextToken) {
    return getAllSeries(result.data.listSeries.nextToken, series);
  }
  return series;
}

export async function updateSeriesData(series: any[]): Promise<void> {
  await series.reduce(async (promise: Promise<void>, item: any) => {
    await promise; // Wait for the previous promise to resolve

    const updatedItem = { id: item.id, tvdbid: item.tvdbid };
    const response: any = await (API.graphql(
      graphqlOperation(updateSeries, { input: updatedItem })
    ) as any);
    console.log(response);
  }, Promise.resolve()); // Initial promise
}

export function listSeriesData(): Promise<any[]> {
  return getAllSeries().catch((error) => {
    console.error('Error retrieving series', error);
    throw error;
  });
}

