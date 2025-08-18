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
import 'simplebar-react/dist/simplebar.min.css';

const replaceEndpoints = (arr, dict) => arr.map((obj) => {
  if (obj.name in dict) {
    return { ...obj, endpoint: dict[obj.name] };
  }
  return obj;
});

const mappings = {
  publicapi: `https://api.memesrc.com/${process.env.REACT_APP_USER_BRANCH}/public`,
  AdminQueries: `https://api.memesrc.com/${process.env.REACT_APP_USER_BRANCH}/admin`,
};

awsExports.aws_cloud_logic_custom = replaceEndpoints(
  awsExports.aws_cloud_logic_custom,
  mappings,
);

Amplify.configure(awsExports);

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>,
);

serviceWorker.unregister();

reportWebVitals();

