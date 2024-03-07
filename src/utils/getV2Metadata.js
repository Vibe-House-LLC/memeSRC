import { API } from "aws-amplify"
import { getAlias, getV2ContentMetadata } from "../graphql/queries"

export default function getV2Metadata(seriesId) {
    return new Promise((resolve, reject) => {
        API.graphql({
            query: getAlias,
            variables: { id: seriesId },
            authMode: 'API_KEY'
        }).then(aliasResponse => {
            if (aliasResponse?.data?.getAlias?.v2ContentMetadata) {
                console.log('METADATA LOADED FROM ALIAS')
                resolve(aliasResponse.data.getAlias.v2ContentMetadata)
            } else {
                API.graphql({
                    query: getV2ContentMetadata,
                    variables: { id: seriesId },
                    authMode: 'API_KEY',
                }).then(response => {
                    if (response?.data?.getV2ContentMetadata) {
                        console.log('METADATA LOADED FROM CID')
                        resolve(response.data.getV2ContentMetadata)
                    } else {
                        reject(new Error('No metadata found'))
                    }
                }).catch(error => {
                    console.log(error)
                    reject(error)
                })
            }
        }).catch(error => {
            console.log(error)
            reject(error)
        })
    })
}
