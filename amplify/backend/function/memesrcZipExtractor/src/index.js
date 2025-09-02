/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

const { makeGraphQLRequest } = require('/opt/memesrcGraphQlLayer/opt/graphql-handler');
const { sendEmail } = require('/opt/memesrcSesLayer/opt/email-function');
const AWS = require('aws-sdk');
const unzipper = require('unzipper');

// Initialize S3 client
const s3 = new AWS.S3();

const updateFileMutation = `
    mutation UpdateFile($input: UpdateFileInput!) {
        updateFile(input: $input) {
            id
            status

        }
    }
`;

const reviewUrl = process.env.NODE_ENV === 'beta' ? 'https://memesrc.com/dashboard/review-upload?sourceMediaId=' : 'https://dev.memesrc.com/dashboard/review-upload?sourceMediaId=';

/**
 * Extracts a zip file from S3 and uploads its contents to a specified S3 location
 * @param {string} sourceBucket - The S3 bucket containing the zip file
 * @param {string} sourceKey - The S3 key of the zip file
 * @param {string} destinationBucket - The S3 bucket to upload extracted files to
 * @param {string} destinationPrefix - The S3 prefix for extracted files
 * @returns {Promise<Array>} Array of uploaded file keys
 */
const extractZipToS3 = async (sourceBucket, sourceKey, destinationBucket, destinationPrefix) => {
    return new Promise((resolve, reject) => {
        const uploadedFiles = [];
        let hasError = false;

        console.log(`Starting zip extraction from s3://${sourceBucket}/${sourceKey} to s3://${destinationBucket}/${destinationPrefix}`);

        // Create a readable stream from S3
        const s3Stream = s3.getObject({
            Bucket: sourceBucket,
            Key: sourceKey
        }).createReadStream();

        s3Stream.on('error', (error) => {
            console.error('Error reading from S3:', error);
            if (!hasError) {
                hasError = true;
                reject(error);
            }
        });

        // Parse the zip stream
        s3Stream.pipe(unzipper.Parse())
            .on('entry', async (entry) => {
                const fileName = entry.path;
                const type = entry.type; // 'Directory' or 'File'

                console.log(`Processing entry: ${fileName} (${type})`);

                if (type === 'File') {
                    try {
                        // Create the destination key
                        const destinationKey = `${destinationPrefix}/${fileName}`;

                        // Upload the file to S3
                        const uploadParams = {
                            Bucket: destinationBucket,
                            Key: destinationKey,
                            Body: entry,
                            ContentType: getContentType(fileName)
                        };

                        console.log(`Uploading ${fileName} to s3://${destinationBucket}/${destinationKey}`);

                        const result = await s3.upload(uploadParams).promise();
                        uploadedFiles.push(result.Key);
                        console.log(`Successfully uploaded: ${result.Key}`);

                    } catch (error) {
                        console.error(`Error uploading ${fileName}:`, error);
                        if (!hasError) {
                            hasError = true;
                            reject(error);
                        }
                        return;
                    }
                } else {
                    // Skip directories
                    entry.autodrain();
                }
            })
            .on('error', (error) => {
                console.error('Error parsing zip:', error);
                if (!hasError) {
                    hasError = true;
                    reject(error);
                }
            })
            .on('close', () => {
                if (!hasError) {
                    console.log(`Zip extraction completed. Uploaded ${uploadedFiles.length} files.`);
                    resolve(uploadedFiles);
                }
            });
    });
};

/**
 * Determines content type based on file extension
 * @param {string} fileName - The file name
 * @returns {string} The content type
 */
const getContentType = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'txt': 'text/plain',
        'json': 'application/json',
        'xml': 'application/xml',
        'pdf': 'application/pdf'
    };
    return contentTypes[extension] || 'application/octet-stream';
};

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`ZIP EXTRACTOR EVENT: ${JSON.stringify(event)}`);

    let statusCode = 200;
    let body;

    try {
        // Parse the event payload
        const {
            fileId,
            sourceMediaId,
            key,
            extractionLocationKey,
            pendingAlias,
            emailAddresses,
        } = JSON.parse(event.body || event.Records?.[0]?.body || JSON.stringify(event));


        const completeReviewUrl = reviewUrl + sourceMediaId;

        console.log(`Processing zip extraction for file ${fileId}`);
        console.log(`Source key: ${key}`);
        console.log(`Extraction location: ${extractionLocationKey}`);
        console.log(`Email addresses: ${JSON.stringify(emailAddresses)}`);

        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
        console.log(`Using bucket: ${bucketName}`);

        // Send start notification email if email addresses are provided
        if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
            try {
                console.log('Sending extraction start notification email...');
                
                const htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #2c3e50;">Zip Extraction Started</h1>
                            <p>Hi there,</p>
                            <p>Your zip file extraction has started for source media ID: <strong>${sourceMediaId}</strong>.</p>
                            <p>We'll notify you when the process is complete. You can review your content at:</p>
                            <p><a href="${completeReviewUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Upload</a></p>
                            <p>Best regards,<br>The memeSRC Team</p>
                        </body>
                    </html>
                `;
                
                const textBody = `Zip Extraction Started

                                Hi there,

                                Your zip file extraction has started for source media ID: ${sourceMediaId}.

                                We'll notify you when the process is complete. You can review your content at:
                                Review URL: ${completeReviewUrl}

                                Best regards,
                                The memeSRC Team`;

                await sendEmail({
                    toAddresses: emailAddresses,
                    subject: 'memeSRC: Zip Extraction Started',
                    htmlBody,
                    textBody
                });
                console.log('Start notification email sent successfully');
            } catch (emailError) {
                console.error('Error sending start notification email:', emailError);
                // Don't fail the extraction if email fails
            }
        }

        // Extract the zip file
        const uploadedFiles = await extractZipToS3(
            bucketName,
            key,
            bucketName,
            extractionLocationKey
        );

        console.log(`Successfully extracted ${uploadedFiles.length} files from zip`);
        console.log(`Uploaded files: ${JSON.stringify(uploadedFiles)}`);

        // Update file status to 'PROCESSED'
        await makeGraphQLRequest({
            query: updateFileMutation,
            variables: {
                input: {
                    id: fileId,
                    status: 'PROCESSED'
                }
            }
        });
        console.log(`Updated file ${fileId} status to PROCESSED`);

        // Send success notification email if email addresses are provided
        if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
            try {
                console.log('Sending extraction success notification email...');
                
                const htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #27ae60;">✅ Zip Extraction Completed Successfully</h1>
                            <p>Great news!</p>
                            <p>Your zip file extraction has completed successfully! We extracted <strong>${uploadedFiles.length} files</strong> from your zip archive for source media ID: <strong>${sourceMediaId}</strong>.</p>
                            <p>You can now review your uploaded content:</p>
                            <p><a href="${completeReviewUrl}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Upload</a></p>
                            <p>Thank you for using memeSRC!</p>
                            <p>Best regards,<br>The memeSRC Team</p>
                        </body>
                    </html>
                `;
                
                const textBody = `✅ Zip Extraction Completed Successfully

                                    Great news!

                                    Your zip file extraction has completed successfully! We extracted ${uploadedFiles.length} files from your zip archive for source media ID: ${sourceMediaId}.

                                    You can now review your uploaded content:
                                    Review URL: ${completeReviewUrl}

                                    Thank you for using memeSRC!

                                    Best regards,
                                    The memeSRC Team`;

                await sendEmail({
                    toAddresses: emailAddresses,
                    subject: 'memeSRC: Zip Extraction Complete',
                    htmlBody,
                    textBody
                });
                console.log('Success notification email sent successfully');
            } catch (emailError) {
                console.error('Error sending success notification email:', emailError);
                // Don't fail the extraction if email fails
            }
        }

        body = {
            success: true,
            fileId,
            sourceMediaId,
            pendingAlias,
            extractionLocation: extractionLocationKey,
            uploadedFiles,
            extractedFileCount: uploadedFiles.length,
        };

    } catch (error) {
        console.error('Error in zip extraction:', error);
        
        // Send failure notification email if email addresses are provided
        // We need to get emailAddresses from the event again since we're in the catch block
        try {
            const eventData = JSON.parse(event.body || event.Records?.[0]?.body || JSON.stringify(event));
            const { emailAddresses, sourceMediaId } = eventData;
            
            if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
                console.log('Sending extraction failure notification email...');
                
                const completeReviewUrl = (process.env.NODE_ENV === 'beta' ? 'https://memesrc.com/dashboard/review-upload?sourceMediaId=' : 'https://dev.memesrc.com/dashboard/review-upload?sourceMediaId=') + sourceMediaId;
                
                const htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #e74c3c;">❌ Zip Extraction Failed</h1>
                            <p>We're sorry to inform you that your zip file extraction has failed.</p>
                            <p><strong>Source Media ID:</strong> ${sourceMediaId}</p>
                            <p><strong>Error Details:</strong> ${error.message}</p>
                            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #e74c3c;">What to do next:</h3>
                                <ul>
                                    <li>Try uploading your zip file again</li>
                                    <li>Make sure your zip file is not corrupted</li>
                                    <li>Ensure your zip contains supported file formats</li>
                                    <li>Contact support if the issue persists</li>
                                </ul>
                            </div>
                            <p>You can try again or review your upload status:</p>
                            <p><a href="${completeReviewUrl}" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Upload</a></p>
                            <p>Best regards,<br>The memeSRC Team</p>
                        </body>
                    </html>
                `;
                
                const textBody = `❌ Zip Extraction Failed

                                We're sorry to inform you that your zip file extraction has failed.

                                Source Media ID: ${sourceMediaId}
                                Error Details: ${error.message}

                                What to do next:
                                - Try uploading your zip file again
                                - Make sure your zip file is not corrupted
                                - Ensure your zip contains supported file formats
                                - Contact support if the issue persists

                                You can try again or review your upload status:
                                Review URL: ${completeReviewUrl}

                                Best regards,
                                The memeSRC Team`;

                await sendEmail({
                    toAddresses: emailAddresses,
                    subject: 'memeSRC: Zip Extraction Failed',
                    htmlBody,
                    textBody
                });
                console.log('Failure notification email sent successfully');
            }
        } catch (emailError) {
            console.error('Error sending failure notification email:', emailError);
            // Don't change the original error response if email fails
        }
        
        statusCode = 500;
        body = {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }

    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify(body),
    };
};
