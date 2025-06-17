import { getApolloClient } from '@faustwp/core';
import { gql } from '@apollo/client';

export default async function handler(req, res) {
  try {
    const apolloClient = getApolloClient();
    let allPages = [];
    let hasNextPage = true;
    let after = null;

    while (hasNextPage) {
      const { data } = await apolloClient.query({
        query: gql`
          query GetPageSitemapData($after: String) {
            pages(first: 100, after: $after) {
              nodes {
                uri
                modifiedGmt
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        variables: { after },
      });

      allPages = allPages.concat(data.pages.nodes);
      hasNextPage = data.pages.pageInfo.hasNextPage;
      after = data.pages.pageInfo.endCursor;
    }

    const pages = allPages.map((page) => ({
      loc: `${process.env.NEXT_PUBLIC_SITE_URL}${page.uri.replace(/\/$/, '')}`,
      lastmod: page.modifiedGmt,
    }));

    const sitemap = createSitemap(pages);

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();
  } catch (error) {
    console.error('Error generating page sitemap:', error);
    res.status(500).json({ error: error.message });
  }
}

function createSitemap(urls) {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const urlsetClose = '</urlset>';

  const urlEntries = urls
    .map((url) => `
      <url>
        <loc>${url.loc}</loc>
        <lastmod>${url.lastmod}</lastmod>
      </url>
    `)
    .join('');

  return xmlHeader + urlsetOpen + urlEntries + urlsetClose;
}