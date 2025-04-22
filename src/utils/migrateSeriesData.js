import { generateClient } from 'aws-amplify/api';
import { listSeries } from "../graphql/queries";
import { updateSeries } from "../graphql/mutations";

const client = generateClient();

async function getAllSeries(nextToken = null, series = []) {
    const result = await client.graphql({
        query: listSeries,
        variables: { nextToken },
        authMode: 'awsIam'
    });
    series.push(...result.data.listSeries.items);

    if (result.data.listSeries.nextToken) {
        return getAllSeries(result.data.listSeries.nextToken, series);
    }
    return series;
}

export async function updateSeriesData(series) {
    await series.reduce(async (promise, item) => {
        await promise; // Wait for the previous promise to resolve

        const updatedItem = { id: item.id, tvdbid: item.tvdbid };
        const response = await client.graphql({
            query: updateSeries,
            variables: { input: updatedItem },
            authMode: 'awsIam'
        });
        console.log(response);
    }, Promise.resolve()); // Initial promise
}

export function listSeriesData() {
    return getAllSeries().catch(error => {
        console.error("Error retrieving series", error);
        throw error;
    });
}
