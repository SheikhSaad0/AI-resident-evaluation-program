// pages/_app.tsx
import '../styles/global.css';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { AuthProvider } from '../lib/auth'; // Import AuthProvider
import { Analytics } from "@vercel/analytics/next";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider> {/* Wrap your application with AuthProvider */}
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
    </AuthProvider>
  );
}