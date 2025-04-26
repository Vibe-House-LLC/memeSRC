import { generateClient } from 'aws-amplify/api';
import { getAlias, getV2ContentMetadata } from '../graphql/queries';

const client = generateClient();

export default function getV2Metadata(seriesId) {
    return new Promise((resolve, reject) => {
        client.graphql({
            query: getAlias,
            variables: { id: seriesId },
            authMode: 'awsIam'
        }).then(aliasResponse => {
            if (aliasResponse?.data?.getAlias?.v2ContentMetadata) {
                // console.log('METADATA LOADED FROM ALIAS')
                resolve(aliasResponse.data.getAlias.v2ContentMetadata)
            } else {
                client.graphql({
                    query: getV2ContentMetadata,
                    variables: { id: seriesId },
                    authMode: 'awsIam'
                }).then(response => {
                    if (response?.data?.getV2ContentMetadata) {
                        // console.log('METADATA LOADED FROM CID')
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
