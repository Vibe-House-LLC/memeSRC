import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Amplify } from 'aws-amplify';
// eslint-disable-next-line import/no-unresolved, import/extensions
import awsExports from './aws-exports';
import App from './App';
import * as serviceWorker from './serviceWorker';
import reportWebVitals from './reportWebVitals';
import './global.css';

// Define a function to replace default exports with custom api domains
const replaceEndpoints = (arr, dict) => arr.map(obj => {
    if (obj.name in dict) {
      return {...obj, endpoint: dict[obj.name]};
    }
    return obj;
  });

// Define the custom domain mappings for apis
const mappings = {
  'publicapi': `https://api.memesrc.com/${process.env.REACT_APP_USER_BRANCH}/public`,
  'AdminQueries': `https://api.memesrc.com/${process.env.REACT_APP_USER_BRANCH}/admin`
}

// Replace the default domains with custom ones
awsExports.aws_cloud_logic_custom = replaceEndpoints(
  awsExports.aws_cloud_logic_custom,
  mappings
)

Amplify.configure(awsExports);

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
