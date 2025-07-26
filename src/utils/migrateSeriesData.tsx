import { API, graphqlOperation } from "aws-amplify";
import { listSeries } from "../graphql/queries";
import { updateSeries } from "../graphql/mutations";

async function getAllSeries(nextToken = null, series = []) {
    const result = await API.graphql(graphqlOperation(listSeries, { nextToken }));
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
        const response = await API.graphql(graphqlOperation(updateSeries, { input: updatedItem }));
        console.log(response);
    }, Promise.resolve()); // Initial promise
}

export function listSeriesData() {
    return getAllSeries().catch(error => {
        console.error("Error retrieving series", error);
        throw error;
    });
}
