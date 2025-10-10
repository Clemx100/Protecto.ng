/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for Vercel deployment
  images: {
    unoptimized: true
  },
  experimental: {
    esmExternals: false
  },
  // Enable dynamic rendering for pages with useSearchParams
  dynamicParams: true,
  // Configure for Vercel deployment
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
}

export default nextConfig