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
      { source: '/sitemap.xml', destination: '/api/sitemap_index' },
      { source: '/sitemap_index.xml', destination: '/api/sitemap_index' },
      { source: '/page-sitemap.xml', destination: '/api/page-sitemap' },
      { source: '/post-sitemap.xml', destination: '/api/post-sitemap' },
    ];
  },
});