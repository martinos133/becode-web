/** @type {import('next').NextConfig} */
const path = require('path');

// Načítaj env hneď (pred nextConfig)
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Ak nie je nastavené, prázdne = používaj Next.js /api routes (Vercel). Pre lokálne Nest API: http://localhost:3001
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const authTokenStorageKey = process.env.NEXT_PUBLIC_AUTH_TOKEN_STORAGE_KEY ?? 'auth_token';

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_AUTH_TOKEN_STORAGE_KEY: authTokenStorageKey,
  },
};

module.exports = nextConfig;
