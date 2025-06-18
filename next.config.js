const { withFaust, getWpHostname } = require('@faustwp/core');

module.exports = withFaust({
  reactStrictMode: true,
  sassOptions: {
    includePaths: ['node_modules'],
  },
  images: {
    domains: [getWpHostname()],
  },
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  async rewrites() {
    return [
      // robots.txt rewrite - add this at the top for priority
      { source: '/robots.txt', destination: '/api/robots.txt' },
      // Your existing sitemap rewrites
      { source: '/sitemap.xml', destination: '/api/sitemap_index' },
      { source: '/sitemap_index.xml', destination: '/api/sitemap_index' },
      { source: '/page-sitemap.xml', destination: '/api/page-sitemap' },
      { source: '/post-sitemap.xml', destination: '/api/post-sitemap' },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            // Different caching strategy: short cache for dynamic behavior
            value: 'public, max-age=60, s-maxage=30, stale-while-revalidate=300',
          },
          {
            key: 'Vary',
            value: 'User-Agent, Accept-Encoding',
          },
          // Add headers to help with WP Engine cache-busting
          {
            key: 'X-Robots-Dynamic',
            value: 'true',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=30, stale-while-revalidate=300',
          },
          {
            key: 'Vary',
            value: 'User-Agent, Accept-Encoding',
          },
          {
            key: 'X-Robots-Dynamic',
            value: 'true',
          },
        ],
      },
      // Your existing sitemap headers
      {
        source: '/api/(sitemap_index|page-sitemap|post-sitemap)',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      // Add headers to help with WP Engine caching issues
      {
        source: '/((?!api/).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  // Add experimental features for better cache control
  experimental: {
    // Enable if you're using Next.js 13+
    // appDir: true,
  },
  
  // Configure for production optimization
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
  }),
});