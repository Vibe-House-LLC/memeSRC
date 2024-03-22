/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["opensearchUser","opensearchPass"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/

const aws = require('aws-sdk');
const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    console.log('Throw Away Console Log')
    
    const { id, query } = event.pathParameters;
    const decodedQuery = decodeURIComponent(query);
    
    const opensearchUrl = 'https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com';
    
    if (id === '_universal') {
        // Perform OpenSearch search for _universal index
        const searchPath = '/v2-*,-fc-*/_search';
        const searchPayload = {
            "query": {
                "match": {
                    "subtitle_text": decodedQuery
                }
            },
            "size": 500
        };

        const { Parameters } = await new aws.SSM()
          .getParameters({
            Names: ["opensearchUser", "opensearchPass"].map(secretName => process.env[secretName]),
            WithDecryption: true,
          })
          .promise();
    
        const OPENSEARCH_USER = Parameters.find(param => param.Name === process.env.opensearchUser).Value;
        const OPENSEARCH_PASS = Parameters.find(param => param.Name === process.env.opensearchPass).Value;
    
        const options = {
            hostname: opensearchUrl.replace('https://', ''),
            path: searchPath,
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            auth: `${OPENSEARCH_USER}:${OPENSEARCH_PASS}`,
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const searchResults = JSON.parse(data);
                    resolve({
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "*",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(searchResults),
                    });
                });
            });

            req.on('error', (error) => {
                console.error('Error:', error);
                reject({
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "*",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ error: "An error occurred while processing the request." }),
                });
            });

            req.write(JSON.stringify(searchPayload));
            req.end();
        });
    } else {
        // Perform the original search methodology for other indices
        const indices = id.split(',');
        
        try {
            const promises = indices.map((index) => {
                const csvUrl = `https://memesrc.com/v2/${index}/_docs.csv`;
                const csvFilePath = path.join('/tmp', `${index}.csv`);
                
                console.log("Getting docs for: ", index);
                // Check if the CSV file exists in the /tmp directory
                if (fs.existsSync(csvFilePath)) {
                    console.log("Loading cached docs: ", csvFilePath)
                    return Promise.resolve({ index, data: fs.readFileSync(csvFilePath, 'utf8') });
                } else {
                    console.log("Loading remote docs: ", csvUrl)
                }
                
                return new Promise((resolve) => {
                    https.get(csvUrl, (response) => {
                        if (response.statusCode === 200) {
                            let data = '';
                            response.on('data', (chunk) => {
                                data += chunk;
                            });
                            response.on('end', () => {
                                // Write the downloaded CSV data to the /tmp directory
                                fs.writeFileSync(csvFilePath, data, 'utf8');
                                resolve({ index, data });
                            });
                        } else {
                            // Resolve with an object indicating the index is offline
                            console.log("Index was offline: ", index);
                            resolve({ index, offline: true });
                        }
                    }).on('error', () => {
                        // Resolve with an object indicating the index is offline
                        resolve({ index, offline: true });
                    });
                });
            });
            
            const csvDataArray = await Promise.all(promises);
            
            let combinedResults = [];
            let offlineIndexes = [];
            
            for (const { index, data, offline } of csvDataArray) {
                if (offline) {
                    // Add the offline index to the offlineIndexes array
                    offlineIndexes.push(index);
                    continue;
                }
                
                const lines = data.split("\n");
                const headers = lines[0].split(",").map((header) => header.trim());
                const showObj = lines.slice(1).map((line) => {
                    const values = line.split(",").map((value) => value.trim());
                    return headers.reduce((obj, header, index) => {
                        obj[header] = values[index] ? values[index] : "";
                        if (header === "subtitle_text" && obj[header]) {
                            obj[header] = Buffer.from(obj[header], 'base64').toString();
                        }
                        return obj;
                    }, {});
                });
                
                const searchTerms = decodedQuery.trim().toLowerCase().split(" ");
                let results = [];
                showObj.forEach((line) => {
                    let score = 0;
                    if (line.subtitle_text && line.subtitle_text.toLowerCase().includes(decodedQuery)) {
                        score += 10;
                    }
                    searchTerms.forEach((term) => {
                        if (line.subtitle_text && line.subtitle_text.toLowerCase().includes(term)) {
                            score += 1;
                        }
                    });
                    if (score > 0) {
                        results.push({ ...line, score, index_id: index });
                    }
                });
                
                combinedResults = combinedResults.concat(results);
            }
            
            combinedResults.sort((a, b) => b.score - a.score);
            combinedResults = combinedResults.slice(0, 150);
            
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ results: combinedResults, offline_indexes: offlineIndexes }),
            };
        } catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ error: "An error occurred while processing the request." }),
            };
        }
    }
};
