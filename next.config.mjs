/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for Vercel deployment
  images: {
    unoptimized: true
  },
  experimental: {
    esmExternals: false
  },
  // Configure for Vercel deployment
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Fix Supabase Edge Runtime issues and Leaflet
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  // Transpile Leaflet packages
  transpilePackages: ['leaflet', 'react-leaflet'],
}

export default nextConfig