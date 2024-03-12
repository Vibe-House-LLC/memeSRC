const https = require('https');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    const { id, query } = event.pathParameters;
    const decodedQuery = decodeURIComponent(query);
    
    try {
        const csvUrl = `https://memesrc.com/v2/${id}/_docs.csv`;
        
        const csvData = await new Promise((resolve, reject) => {
            https.get(csvUrl, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    resolve(data);
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
        
        const lines = csvData.split("\n");
        const headers = lines[0].split(",").map((header) => header.trim());
        const showObj = lines.slice(1).map((line) => {
            const values = line.split(",").map((value) => value.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] ? values[index] : "";
                if (header === "subtitle_text" && obj[header]) {
                    obj.base64_subtitle = obj[header];
                    obj[header] = atob(obj[header]);
                }
                return obj;
            }, {});
        });

        const searchTerms = decodedQuery.trim().toLowerCase().split(" ");
        let results = [];
        showObj.forEach((line) => {
            let score = 0;
            if (line.subtitle_text.toLowerCase().includes(decodedQuery)) {
                score += 10;
            }
            searchTerms.forEach((term) => {
                if (line.subtitle_text.toLowerCase().includes(term)) {
                    score += 1;
                }
            });
            if (score > 0) {
                results.push({ ...line, score });
            }
        });

        results.sort((a, b) => b.score - a.score);
        results = results.slice(0, 150);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(results),
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
};
