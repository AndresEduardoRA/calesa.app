import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  distDir: process.env['NEXT_DIST_DIR'] ?? '.next',
  // Con Cache Components, los proyectos nuevos activan también Partial Prefetching (lo pide Next 16.4).
  partialPrefetching: true,
  experimental: { typedEnv: true },
  // Tailwind 4 con Turbopack: sin esta regla nadie procesa `@import 'tailwindcss'` (no hay PostCSS).
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  images: {
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  headers() {
    return Promise.resolve([
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ])
  },
}

export default nextConfig
