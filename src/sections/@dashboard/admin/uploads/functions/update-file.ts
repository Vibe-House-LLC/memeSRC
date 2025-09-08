import { API, graphqlOperation } from "aws-amplify";
import { updateFile as updateFileMutation } from "src/graphql/mutations";
import { UpdateFileApiResponse } from "../types";

export default async function updateFile(id: string, data: any) {
    const response = await API.graphql<UpdateFileApiResponse>(
        graphqlOperation(
            updateFileMutation,
            { id, data }
        )
    ) as UpdateFileApiResponse;

    return response.data.updateFile;
}