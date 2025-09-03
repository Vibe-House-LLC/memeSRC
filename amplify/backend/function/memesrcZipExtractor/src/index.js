/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

const { makeGraphQLRequest } = require('/opt/graphql-handler');
const { sendEmail } = require('/opt/email-function');
const AWS = require('aws-sdk');
const yauzl = require('yauzl');
const fs = require('fs');
const path = require('path');

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
 * Validates zip file before processing
 * @param {string} sourceBucket - The S3 bucket containing the zip file
 * @param {string} sourceKey - The S3 key of the zip file
 * @returns {Promise<Object>} Validation result with file info
 */
const validateZipFile = async (sourceBucket, sourceKey) => {
    try {
        console.log(`Validating zip file: s3://${sourceBucket}/${sourceKey}`);
        
        // Get file metadata first
        const headResult = await s3.headObject({
            Bucket: sourceBucket,
            Key: sourceKey
        }).promise();
        
        const fileSize = headResult.ContentLength;
        console.log(`Zip file size: ${fileSize} bytes`);
        
        // Check if file size is reasonable (not 0 and not too large)
        if (fileSize === 0) {
            throw new Error('Zip file is empty (0 bytes)');
        }
        
        // Check for maximum file size (e.g., 10GB)
        const maxFileSize = 10 * 1024 * 1024 * 1024; // 10GB
        if (fileSize > maxFileSize) {
            throw new Error(`Zip file too large: ${fileSize} bytes (max: ${maxFileSize} bytes)`);
        }
        
        return {
            valid: true,
            fileSize,
            lastModified: headResult.LastModified
        };
    } catch (error) {
        console.error('Zip validation failed:', error);
        throw new Error(`Zip validation failed: ${error.message}`);
    }
};

/**
 * Cleans up temporary files and directories
 * @param {string} tempDir - The temporary directory to clean up
 */
const cleanupTempFiles = async (tempDir) => {
    try {
        if (fs.existsSync(tempDir)) {
            console.log(`Cleaning up temporary directory: ${tempDir}`);
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    await cleanupTempFiles(filePath);
                    fs.rmdirSync(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
            }
            fs.rmdirSync(tempDir);
            console.log(`Cleaned up temporary directory: ${tempDir}`);
        }
    } catch (error) {
        console.error(`Error cleaning up temp files: ${error.message}`);
        // Don't throw - cleanup errors shouldn't fail the main process
    }
};

/**
 * Extracts a single entry from a zip file using yauzl
 * @param {Object} zipfile - The yauzl zipfile object
 * @param {Object} entry - The zip entry to extract
 * @param {string} outputPath - Where to extract the file
 * @returns {Promise} Promise that resolves when extraction is complete
 */
const extractEntry = (zipfile, entry, outputPath) => {
    return new Promise((resolve, reject) => {
        // Create directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
                reject(err);
                return;
            }
            
            const writeStream = fs.createWriteStream(outputPath);
            
            writeStream.on('error', reject);
            writeStream.on('close', resolve);
            readStream.on('error', reject);
            
            readStream.pipe(writeStream);
        });
    });
};

/**
 * Extracts a zip file from S3 and uploads its contents to a specified S3 location
 * Uses ephemeral storage (/tmp) and yauzl for reliable zip handling
 * @param {string} sourceBucket - The S3 bucket containing the zip file
 * @param {string} sourceKey - The S3 key of the zip file
 * @param {string} destinationBucket - The S3 bucket to upload extracted files to
 * @param {string} destinationPrefix - The S3 prefix for extracted files
 * @returns {Promise<Array>} Array of uploaded file keys
 */
const extractZipToS3 = async (sourceBucket, sourceKey, destinationBucket, destinationPrefix) => {
    // First validate the zip file
    await validateZipFile(sourceBucket, sourceKey);
    
    // Create unique temp directory
    const timestamp = Date.now();
    const tempDir = path.join('/tmp', `zip-extraction-${timestamp}`);
    const zipFilePath = path.join('/tmp', `source-${timestamp}.zip`);
    
    console.log(`Starting zip extraction from s3://${sourceBucket}/${sourceKey} to s3://${destinationBucket}/${destinationPrefix}`);
    console.log(`Using temporary directory: ${tempDir}`);
    
    try {
        // Create temp directory
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Download zip file to ephemeral storage
        console.log('Downloading zip file to ephemeral storage...');
        const zipObject = await s3.getObject({
            Bucket: sourceBucket,
            Key: sourceKey
        }).promise();
        
        // Write zip file to /tmp
        fs.writeFileSync(zipFilePath, zipObject.Body);
        console.log(`Downloaded zip file to ${zipFilePath}: ${zipObject.Body.length} bytes`);
        
        // Extract zip file using yauzl
        console.log(`Opening zip file with yauzl...`);
        const zipfile = await new Promise((resolve, reject) => {
            yauzl.open(zipFilePath, { lazyEntries: true, strictFileNames: false }, (err, zipfile) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(zipfile);
            });
        });
        
        console.log(`Zip file opened successfully. Entry count: ${zipfile.entryCount}`);
        
        const uploadedFiles = [];
        const skippedFiles = [];
        let processedEntries = 0;
        
        // Process entries one by one
        await new Promise((resolve, reject) => {
            zipfile.on('entry', async (entry) => {
                const fileName = entry.fileName;
                try {
                    processedEntries++;
                    const isDirectory = /\/$/.test(fileName);
                    
                    console.log(`Processing entry ${processedEntries}/${zipfile.entryCount}: ${fileName} (${isDirectory ? 'Directory' : 'File'})`);
                    
                    if (isDirectory) {
                        console.log(`Skipping directory: ${fileName}`);
                        zipfile.readEntry();
                        return;
                    }
                    
                    // Skip hidden files and system files
                    if (fileName.startsWith('.') || fileName.includes('__MACOSX') || fileName.includes('.DS_Store')) {
                        console.log(`Skipping system file: ${fileName}`);
                        skippedFiles.push(fileName);
                        zipfile.readEntry();
                        return;
                    }
                    
                    // Check file size before processing
                    const fileSize = entry.uncompressedSize;
                    const maxIndividualFileSize = 2 * 1024 * 1024 * 1024; // 2GB per file
                    
                    if (fileSize > maxIndividualFileSize) {
                        console.log(`Skipping large file: ${fileName} (${fileSize} bytes)`);
                        skippedFiles.push(`${fileName} (too large: ${fileSize} bytes)`);
                        zipfile.readEntry();
                        return;
                    }
                    
                    // Extract the file
                    const outputPath = path.join(tempDir, fileName);
                    await extractEntry(zipfile, entry, outputPath);
                    
                    // Upload to S3
                    const destinationKey = `${destinationPrefix}/${fileName}`;
                    const fileStream = fs.createReadStream(outputPath);
                    const uploadParams = {
                        Bucket: destinationBucket,
                        Key: destinationKey,
                        Body: fileStream,
                        ContentType: getContentType(fileName)
                    };
                    
                    console.log(`Uploading ${fileName} to s3://${destinationBucket}/${destinationKey}`);
                    
                    const result = await s3.upload(uploadParams).promise();
                    uploadedFiles.push(result.Key);
                    console.log(`Successfully uploaded: ${result.Key}`);
                    
                    // Continue to next entry
                    zipfile.readEntry();
                    
                } catch (error) {
                    console.error(`Error processing entry ${fileName}:`, error);
                    reject(new Error(`Processing error for ${fileName}: ${error.message}`));
                    return;
                }
            });
            
            zipfile.on('end', () => {
                console.log('Finished processing all zip entries');
                resolve();
            });
            
            zipfile.on('error', (error) => {
                console.error('Zip file error:', error);
                reject(error);
            });
            
            // Start reading entries
            zipfile.readEntry();
        });
        
        // Remove the zip file to free up space
        fs.unlinkSync(zipFilePath);
        console.log('Zip file removed to free space');
        
        console.log(`Zip extraction completed. Total entries: ${zipfile.entryCount}, Processed: ${processedEntries}, Uploaded: ${uploadedFiles.length}, Skipped: ${skippedFiles.length}`);
        if (skippedFiles.length > 0) {
            console.log(`Skipped files: ${JSON.stringify(skippedFiles)}`);
        }
        
        return uploadedFiles;
        
    } catch (error) {
        console.error('Error in zip extraction:', error);
        
        // Provide more specific error messages
        let errorMessage = `Zip extraction error: ${error.message}`;
        if (error.message.includes('end of central directory record signature not found')) {
            errorMessage = 'Zip file appears to be corrupted or incomplete. Please try re-uploading the file.';
        } else if (error.message.includes('invalid signature')) {
            errorMessage = 'Invalid zip file format. Please ensure the file is a valid zip archive.';
        } else if (error.message.includes('bad archive')) {
            errorMessage = 'Zip file structure is invalid or corrupted.';
        } else if (error.message.includes('ENOSPC')) {
            errorMessage = 'Not enough disk space available for extraction. The zip file may be too large.';
        }
        
        throw new Error(errorMessage);
        
    } finally {
        // Always clean up temp files
        await cleanupTempFiles(tempDir);
        
        // Also clean up the zip file if it still exists
        try {
            if (fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up zip file:', cleanupError.message);
        }
    }
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
        'pdf': 'application/pdf',
        'csv': 'text/csv',
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
            extractionLocation,
            extractionLocationKey,
            pendingAlias,
            emailAddresses,
        } = JSON.parse(event.body || event.Records?.[0]?.body || JSON.stringify(event));

        await makeGraphQLRequest({
            query: updateFileMutation,
            variables: {
                input: {
                    id: fileId,
                    status: 'extracting'
                }
            }
        });


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
                
                const emailTimestamp = new Date().toISOString();
                const htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #2c3e50;">Zip Extraction Started</h1>
                            <p>Hi there,</p>
                            <p>Your zip file extraction has started for source media ID: <strong>${sourceMediaId}</strong>.</p>
                            <p>We'll notify you when the process is complete. You can review your content at:</p>
                            <p><a href="${completeReviewUrl}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Upload</a></p>
                            <p>Best regards,<br>The memeSRC Team</p>
                            <!-- Email ID: ${emailTimestamp} -->
                        </body>
                    </html>
                `;
                
                const textBody = `Zip Extraction Started

                                Hi there,

                                Your zip file extraction has started for source media ID: ${sourceMediaId}.

                                We'll notify you when the process is complete. You can review your content at:
                                Review URL: ${completeReviewUrl}

                                Best regards,
                                The memeSRC Team

                                Email ID: ${emailTimestamp}`;

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
        const extractionResult = await extractZipToS3(
            bucketName,
            key,
            bucketName,
            extractionLocationKey
        );

        // Handle both old return format (just array) and new return format (object with details)
        const uploadedFiles = Array.isArray(extractionResult) ? extractionResult : extractionResult.uploadedFiles || [];
        const skippedFiles = extractionResult.skippedFiles || [];

        console.log(`Successfully extracted ${uploadedFiles.length} files from zip`);
        console.log(`Uploaded files: ${JSON.stringify(uploadedFiles)}`);
        if (skippedFiles.length > 0) {
            console.log(`Skipped files: ${JSON.stringify(skippedFiles)}`);
        }

        // Update file status to 'PROCESSED'
        await makeGraphQLRequest({
            query: updateFileMutation,
            variables: {
                input: {
                    id: fileId,
                    status: 'extracted',
                    unzippedPath: extractionLocation
                }
            }
        });
        console.log(`Updated file ${fileId} status to PROCESSED`);

        // Send success notification email if email addresses are provided
        if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
            try {
                console.log('Sending extraction success notification email...');
                
                const emailTimestamp = new Date().toISOString();
                const skippedFilesInfo = skippedFiles.length > 0 ? 
                    `<div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #856404;">📋 Processing Summary</h3>
                        <p><strong>Successfully uploaded:</strong> ${uploadedFiles.length} files</p>
                        <p><strong>Skipped files:</strong> ${skippedFiles.length} (system files, duplicates, or files too large)</p>
                    </div>` : '';

                const htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #27ae60;">✅ Zip Extraction Completed Successfully</h1>
                            <p>Great news!</p>
                            <p>Your zip file extraction has completed successfully! We extracted <strong>${uploadedFiles.length} files</strong> from your zip archive for source media ID: <strong>${sourceMediaId}</strong>.</p>
                            ${skippedFilesInfo}
                            <p>You can now review your uploaded content:</p>
                            <p><a href="${completeReviewUrl}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Upload</a></p>
                            <p>Thank you for using memeSRC!</p>
                            <p>Best regards,<br>The memeSRC Team</p>
                            <!-- Email ID: ${emailTimestamp} -->
                        </body>
                    </html>
                `;
                
                const skippedFilesText = skippedFiles.length > 0 ? 
                    `\n                                    Processing Summary:
                                    - Successfully uploaded: ${uploadedFiles.length} files
                                    - Skipped files: ${skippedFiles.length} (system files, duplicates, or files too large)\n` : '';

                const textBody = `✅ Zip Extraction Completed Successfully

                                    Great news!

                                    Your zip file extraction has completed successfully! We extracted ${uploadedFiles.length} files from your zip archive for source media ID: ${sourceMediaId}.${skippedFilesText}

                                    You can now review your uploaded content:
                                    Review URL: ${completeReviewUrl}

                                    Thank you for using memeSRC!

                                    Best regards,
                                    The memeSRC Team

                                    Email ID: ${emailTimestamp}`;

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

        const eventData = JSON.parse(event.body || event.Records?.[0]?.body || JSON.stringify(event));
        const { fileId } = eventData;

        await makeGraphQLRequest({
            query: updateFileMutation,
            variables: {
                input: {
                    id: fileId,
                    status: 'extractionFailed'
                }
            }
        });
        
        // Send failure notification email if email addresses are provided
        // We need to get emailAddresses from the event again since we're in the catch block
        try {
            const eventData = JSON.parse(event.body || event.Records?.[0]?.body || JSON.stringify(event));
            const { emailAddresses, sourceMediaId } = eventData;
            
            if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
                console.log('Sending extraction failure notification email...');
                
                const emailTimestamp = new Date().toISOString();
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
                            <!-- Email ID: ${emailTimestamp} -->
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
                                The memeSRC Team

                                Email ID: ${emailTimestamp}`;

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
