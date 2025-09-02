import { API, graphqlOperation } from "aws-amplify";
import { listAliases as listAliasesQuery } from "src/graphql/queries";
import { ListAliasesApiResponse } from "../types";

const listAllAliases = async (nextToken: string | null = null) => {
    const response = await API.graphql<ListAliasesApiResponse>(
        graphqlOperation(
            listAliasesQuery,
            {
                nextToken
            }
        )
    ) as ListAliasesApiResponse;
    
    if (response?.data?.listAliases) {
        return response.data.listAliases;
    }
    return null;
}

export default async function listAliases() {
    const aliases = [];
    let nextToken: string | null = null;
    do {
        // eslint-disable-next-line no-await-in-loop
        const response = await listAllAliases(nextToken);
        if (response) {
            const { items, nextToken: newNextToken } = response;
            aliases.push(...items);
            nextToken = newNextToken;
        }
    } while (nextToken);
    
    if (aliases) {
        return aliases;
    }
    return null;
}