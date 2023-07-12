/* Amplify Params - DO NOT EDIT
	ENV
	FUNCTION_MEMESRCUSERFUNCTION_NAME
	REGION
Amplify Params - DO NOT EDIT */
exports.handler = async function (event) {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));
  console.log(event)
  console.log(event.Records[0].s3)
  console.log(event.Records)
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  console.log(`Bucket: ${bucket}`, `Key: ${key}`);
};