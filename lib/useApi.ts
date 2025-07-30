import { useContext } from 'react';
import { AuthContext } from './auth';

/**
 * Custom hook for making authenticated API calls.
 * It automatically injects the correct database query parameter ('testing' or 'production')
 * from the AuthContext and includes cache-busting headers.
 */
export const useApi = () => {
  const auth = useContext(AuthContext);

  /**
   * @param url The API endpoint (e.g., '/api/residents')
   * @param options Standard fetch options (method, headers, body, etc.)
   * @returns The JSON response from the API.
   */
  const apiFetch = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    if (!auth || auth.loading) {
      // This prevents API calls from being made before the auth state is initialized.
      return new Promise(() => {}); // Return a pending promise
    }

    const apiUrl = new URL(url, window.location.origin);
    apiUrl.searchParams.append('db', auth.database);

    // Default headers to prevent caching issues across the app
    const headers = new Headers(options.headers);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    const response = await fetch(apiUrl.toString(), {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error on ${url}:`, errorText);
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  return { apiFetch };
};