// indexToOpenSearch.js

const { Client } = require('@opensearch-project/opensearch');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const inputArg = process.argv[2]; // This assumes the input argument is the first after the script name

async function csvToOpenSearch(OPENSEARCH_ENDPOINT, OPENSEARCH_USER, OPENSEARCH_PASS) {
  const client = new Client({
    node: OPENSEARCH_ENDPOINT,
    auth: {
      username: OPENSEARCH_USER,
      password: OPENSEARCH_PASS,
    },
  });

  
  // !!! TODO - Swap this to use the CSV in S3
  const csvPath = path.join(process.env.HOME, '.memesrc', 'processing', inputArg, '_docs.csv');
  // !!!


  const indexName = `v2-${inputArg}`;
  const batchSize = 500;
  const delayBetweenBatches = 1000; // Delay in milliseconds (e.g., 1000ms = 1 second)

  try {
    const rows = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          if (row.subtitle_text) {
            const decodedSubtitle = Buffer.from(row.subtitle_text, 'base64').toString('utf-8');
            row.subtitle_text = decodedSubtitle;
          }
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const batches = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const bulkBody = batch.flatMap((doc) => [
        { index: { _index: indexName } },
        doc,
      ]);
      batches.push(bulkBody);
    }

    let processedCount = 0;

    for (const bulkBody of batches) {
      const bulkResponse = await client.bulk({
        body: bulkBody,
      });
      console.log("Bulk indexing response:", bulkResponse.body);
      processedCount += bulkBody.length / 2;
      console.log(`Processed ${processedCount} out of ${rows.length} rows`);

      // Delay execution before processing the next batch
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }

    console.log('CSV indexing completed.');
  } catch (error) {
    console.error('Error indexing CSV:', error);
  }
}
