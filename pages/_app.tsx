import '../src/styles/globals.css';
import type { AppProps } from 'next/app';
import { BrowserRouter } from 'react-router-dom';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <BrowserRouter>
      <Component {...pageProps} />
    </BrowserRouter>
  );
}

export default MyApp;
