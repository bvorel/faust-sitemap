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
            value: 'text/plain',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600', // Cache for 1 hour
          },
        ],
      },
      // Optional: Add headers for your sitemaps too
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
    ];
  },
});