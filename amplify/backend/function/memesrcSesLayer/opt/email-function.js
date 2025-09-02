const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Initialize SES client
const sesClient = new SESClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

/**
 * Validates an email address using a basic regex pattern
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sends an email via AWS SES to multiple recipients
 * @param {Object} params - Email parameters
 * @param {string[]} params.toAddresses - Array of recipient email addresses
 * @param {string} params.subject - Email subject line
 * @param {string} params.htmlBody - HTML body content (optional)
 * @param {string} params.textBody - Plain text body content (optional)
 * @param {string} params.fromAddress - Sender email address (defaults to no-reply@memesrc.com)
 * @param {string[]} params.ccAddresses - Array of CC email addresses (optional)
 * @param {string[]} params.bccAddresses - Array of BCC email addresses (optional)
 * @returns {Promise<Object>} - SES response object
 */
async function sendEmail({
  toAddresses,
  subject,
  htmlBody = '',
  textBody = '',
  fromAddress = 'no-reply@memesrc.com',
  ccAddresses = [],
  bccAddresses = []
}) {
  try {
    // Validation
    if (!toAddresses || !Array.isArray(toAddresses) || toAddresses.length === 0) {
      throw new Error('toAddresses must be a non-empty array');
    }

    if (!subject || typeof subject !== 'string') {
      throw new Error('subject must be a non-empty string');
    }

    if (!htmlBody && !textBody) {
      throw new Error('Either htmlBody or textBody must be provided');
    }

    // Validate all email addresses
    const allEmails = [fromAddress, ...toAddresses, ...ccAddresses, ...bccAddresses];
    const invalidEmails = allEmails.filter(email => email && !isValidEmail(email));
    
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    }

    // Prepare email body
    const body = {};
    if (htmlBody) {
      body.Html = {
        Charset: 'UTF-8',
        Data: htmlBody
      };
    }
    if (textBody) {
      body.Text = {
        Charset: 'UTF-8',
        Data: textBody
      };
    }

    // Prepare destination
    const destination = {
      ToAddresses: toAddresses
    };
    
    if (ccAddresses.length > 0) {
      destination.CcAddresses = ccAddresses;
    }
    
    if (bccAddresses.length > 0) {
      destination.BccAddresses = bccAddresses;
    }

    // Create the send email command
    const command = new SendEmailCommand({
      Destination: destination,
      Message: {
        Body: body,
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      },
      Source: fromAddress
    });

    // Send the email
    const response = await sesClient.send(command);
    
    console.log('Email sent successfully:', {
      messageId: response.MessageId,
      toAddresses,
      subject,
      fromAddress
    });

    return {
      success: true,
      messageId: response.MessageId,
      toAddresses,
      subject,
      fromAddress
    };

  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      toAddresses,
      subject,
      fromAddress
    };
  }
}

/**
 * Sends a simple text email to multiple recipients
 * @param {string[]} toAddresses - Array of recipient email addresses
 * @param {string} subject - Email subject line
 * @param {string} textBody - Plain text body content
 * @param {string} fromAddress - Sender email address (defaults to no-reply@memesrc.com)
 * @returns {Promise<Object>} - SES response object
 */
async function sendTextEmail(toAddresses, subject, textBody, fromAddress = 'no-reply@memesrc.com') {
  return sendEmail({
    toAddresses,
    subject,
    textBody,
    fromAddress
  });
}

/**
 * Sends an HTML email to multiple recipients
 * @param {string[]} toAddresses - Array of recipient email addresses
 * @param {string} subject - Email subject line
 * @param {string} htmlBody - HTML body content
 * @param {string} textBody - Plain text fallback (optional)
 * @param {string} fromAddress - Sender email address (defaults to no-reply@memesrc.com)
 * @returns {Promise<Object>} - SES response object
 */
async function sendHtmlEmail(toAddresses, subject, htmlBody, textBody = '', fromAddress = 'no-reply@memesrc.com') {
  return sendEmail({
    toAddresses,
    subject,
    htmlBody,
    textBody,
    fromAddress
  });
}

/**
 * Sends a templated email (useful for common email types)
 * @param {string[]} toAddresses - Array of recipient email addresses
 * @param {string} template - Template type ('welcome', 'reset', 'notification', etc.)
 * @param {Object} templateData - Data to populate the template
 * @param {string} fromAddress - Sender email address (defaults to no-reply@memesrc.com)
 * @returns {Promise<Object>} - SES response object
 */
async function sendTemplatedEmail(toAddresses, template, templateData = {}, fromAddress = 'no-reply@memesrc.com') {
  // Basic template system - can be expanded
  const templates = {
    notification: {
      subject: templateData.subject || 'Notification from memeSRC',
      html: `
        <html>
          <body>
            <h1>${templateData.title || 'Notification'}</h1>
            <p>Hi ${templateData.name || 'User'},</p>
            <p>${templateData.message || 'You have a new notification.'}</p>
            <p>Best regards,<br>The memeSRC Team</p>
          </body>
        </html>
      `,
      text: `${templateData.title || 'Notification'}\n\nHi ${templateData.name || 'User'},\n\n${templateData.message || 'You have a new notification.'}\n\nBest regards,\nThe memeSRC Team`
    }
  };

  const emailTemplate = templates[template];
  if (!emailTemplate) {
    throw new Error(`Template '${template}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
  }

  return sendEmail({
    toAddresses,
    subject: emailTemplate.subject,
    htmlBody: emailTemplate.html,
    textBody: emailTemplate.text,
    fromAddress
  });
}

module.exports = {
  sendEmail,
  sendTextEmail,
  sendHtmlEmail,
  sendTemplatedEmail,
  isValidEmail
};
