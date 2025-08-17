// pages/_app.tsx
import '../styles/global.css';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { AuthProvider } from '../lib/auth';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}