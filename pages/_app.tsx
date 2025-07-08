// pages/_app.tsx
import '../styles/global.css';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { Analytics } from "@vercel/analytics/next"

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
      <Analytics />
    </Layout>
  );
}