import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';
import App from './App';
import * as serviceWorker from './serviceWorker';
import reportWebVitals from './reportWebVitals';
import './global.css';

// Get user branch from environment
const userBranch = process.env.REACT_APP_USER_BRANCH || '';

// Create a minimal configuration with all required services
try {
  // Configure Amplify with a complete config
  Amplify.configure({
    // General configuration
    region: 'us-east-1',
    
    // API configuration
    API: {
      REST: {
        publicapi: {
          endpoint: `https://api.memesrc.com/${userBranch}/public`,
          region: 'us-east-1'
        },
        AdminQueries: {
          endpoint: `https://api.memesrc.com/${userBranch}/admin`,
          region: 'us-east-1'
        }
      },
      GraphQL: {
        endpoint: awsconfig.aws_appsync_graphqlEndpoint,
        region: awsconfig.aws_appsync_region,
        defaultAuthMode: 'apiKey',
        apiKey: awsconfig.aws_appsync_apiKey
      }
    },
    
    // Basic Auth config - include to prevent errors
    Auth: {
      Cognito: {
        region: 'us-east-1',
        userPoolId: awsconfig.aws_user_pools_id,
        userPoolClientId: awsconfig.aws_user_pools_web_client_id,
        identityPoolId: awsconfig.aws_cognito_identity_pool_id
      }
    },
    
    // Add Storage configuration
    Storage: {
      S3: {
        bucket: awsconfig.aws_user_files_s3_bucket,
        region: awsconfig.aws_user_files_s3_bucket_region
      }
    }
  });
  
  console.log('Amplify configured successfully');
} catch (error) {
  console.error('Error configuring Amplify:', error);
}

// // Use the API Key by default
// Amplify.configure({
//   "aws_appsync_authenticationType": "API_KEY", 
// });

// ----------------------------------------------------------------------

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>
);

// If you want to enable client cache, register instead.
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
