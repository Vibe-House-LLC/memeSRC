// index.js for memesrcSearchV2 function

/* Amplify Params - DO NOT EDIT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//*
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

const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm");
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    console.log('Throw Away Console Log');

    const prefix = process.env.ENV === "dev" ? "dev" : 'v2'

    const { id, query } = event.pathParameters;
    const decodedQuery = decodeURIComponent(query);

    const opensearchUrl = 'https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com';
    let searchPath;

    if (id === '_universal') {
        searchPath = `/${prefix}-*,-fc-*/_search`;
    } else {
        const indices = id.split(',');
        const processedIndices = indices.map(index => `${prefix}-${index}`);
        searchPath = `/${processedIndices.join(',')}/_search`;
    }

    const ssmClient = new SSMClient();
    const { Parameters } = await ssmClient.send(
        new GetParametersCommand({
            Names: ["opensearchUser", "opensearchPass"].map(secretName => process.env[secretName]),
            WithDecryption: true,
        })
    );

    const OPENSEARCH_USER = Parameters.find(param => param.Name === process.env.opensearchUser).Value;
    const OPENSEARCH_PASS = Parameters.find(param => param.Name === process.env.opensearchPass).Value;

    const options = {
        hostname: opensearchUrl.replace('https://', ''),
        // hostname: "https://httpstat.us/500",  // this can be used test opensearch failures
        path: searchPath,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        auth: `${OPENSEARCH_USER}:${OPENSEARCH_PASS}`,
    };

    // Function to perform the search request
    const performSearch = async (payload) => {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (error) {
                        console.error('JSON Parse Error:', error);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('OpenSearch Error:', error);
                reject(error);
            });

            req.write(JSON.stringify(payload));
            req.end();
        });
    };

    let opensearchResponse;

    try {
        // 1. Try advanced search with query_string (supports AND, OR, NOT, "phrase")
        // We wrap it in a bool query to restore the 'match_phrase' boost from the old implementation
        // This ensures that exact phrase matches are ranked higher, preserving the old "feel".
        const advancedPayload = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "query_string": {
                                "query": decodedQuery,
                                "fields": ["subtitle_text", "season", "episode"],
                                "default_operator": "OR"
                            }
                        }
                    ],
                    "should": [
                        {
                            "match_phrase": {
                                "subtitle_text": {
                                    "query": decodedQuery,
                                    "boost": 2
                                }
                            }
                        }
                    ]
                }
            },
            "size": 350
        };

        try {
            opensearchResponse = await performSearch(advancedPayload);

            // Check if OpenSearch returned an error (e.g. syntax error from unmatched quotes)
            if (opensearchResponse.error) {
                console.log("Advanced search failed (likely syntax error), falling back to simple search.", opensearchResponse.error);
                throw new Error("OpenSearch query error");
            }

            const advancedHits =
                (opensearchResponse &&
                    opensearchResponse.hits &&
                    Array.isArray(opensearchResponse.hits.hits)
                    ? opensearchResponse.hits.hits
                    : []);

            if (advancedHits.length === 0) {
                console.log("Advanced search returned 0 hits, falling back to simple search for broader matches.");
                throw new Error("No advanced results");
            }
        } catch (e) {
            // 2. Fallback to simple_query_string (more forgiving) or original match logic
            console.log("Falling back to simple_query_string");
            const fallbackPayload = {
                "query": {
                    "simple_query_string": {
                        "query": decodedQuery,
                        "fields": ["subtitle_text"],
                        "default_operator": "or"
                    }
                },
                "size": 350
            };
            opensearchResponse = await performSearch(fallbackPayload);
        }

        const sources = opensearchResponse.hits.hits.map(hit => ({
            ...hit._source,
            cid: hit._index.replace(new RegExp(`^${prefix}-`), '')
        }));

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                results: sources
            }),
        };
    } catch (error) {
        console.error(`OpenSearch is down: ${error}`);

        if (id === '_universal' || (id.split(',').length - 1) >= 2) {
            return {
                statusCode: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ error: "OpenSearch is down." }),
            };
        } else {
            console.log('Falling back to CSV approach.');

            const indices = id.split(',');
            const s3Client = new S3Client({ region: process.env.REGION });
            const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

            try {
                const promises = indices.map((index) => {
                    const objectKey = `src/${index}/_docs.csv`;
                    const csvFilePath = path.join('/tmp', `${index}.csv`);

                    console.log("Getting docs for: ", index);

                    // Check if the CSV file exists in the /tmp directory
                    if (fs.existsSync(csvFilePath)) {
                        console.log("Loading cached docs: ", csvFilePath);
                        return Promise.resolve({ index, data: fs.readFileSync(csvFilePath, 'utf8') });
                    } else {
                        console.log("Loading remote docs from S3: ", objectKey);
                    }

                    const getObjectParams = {
                        Bucket: bucketName,
                        Key: objectKey,
                    };

                    const getObjectCommand = new GetObjectCommand(getObjectParams);

                    return s3Client.send(getObjectCommand)
                        .then((response) => {
                            return new Promise((resolve, reject) => {
                                let data = '';
                                response.Body.on('data', (chunk) => {
                                    data += chunk;
                                });
                                response.Body.on('end', () => {
                                    // Write the downloaded CSV data to the /tmp directory
                                    fs.writeFileSync(csvFilePath, data, 'utf8');
                                    resolve({ index, data });
                                });
                                response.Body.on('error', (error) => {
                                    console.error('S3 GetObject Error:', error);
                                    reject(error);
                                });
                            });
                        })
                        .catch((error) => {
                            console.error('S3 GetObject Error:', error);
                            // Resolve with an object indicating the index is offline
                            console.log("Index was offline: ", index);
                            return Promise.resolve({ index, offline: true });
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
                    const nonSpecialQuery = decodedQuery.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
                    const nonSpecialSearchTerms = nonSpecialQuery.split(" ");

                    let results = [];
                    showObj.forEach((line) => {
                        let score = 0;
                        const subtitleText = line.subtitle_text ? line.subtitle_text.toLowerCase() : '';
                        const nonSpecialSubtitle = subtitleText.replace(/[^a-zA-Z0-9\s]/g, '');

                        if (subtitleText.includes(decodedQuery)) {
                            score += 10;
                        }
                        if (nonSpecialSubtitle.includes(nonSpecialQuery)) {
                            score += 5;
                        }
                        searchTerms.forEach((term) => {
                            if (subtitleText.includes(term)) {
                                score += 1;
                            }
                        });
                        nonSpecialSearchTerms.forEach((term) => {
                            if (nonSpecialSubtitle.includes(term)) {
                                score += 1;
                            }
                        });
                        if (score > 0) {
                            results.push({ ...line, score, cid: index });
                        }
                    });

                    combinedResults = combinedResults.concat(results);
                }

                combinedResults.sort((a, b) => {
                    if (b.score === a.score) {
                        // If scores are the same, sort by subtitle length in ascending order
                        return a.subtitle_text.length - b.subtitle_text.length;
                    }
                    // If scores are different, sort by score in descending order
                    return b.score - a.score;
                });
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
    }
};
