export default async function handler(req, res) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    const sitemaps = [
      { loc: `${siteUrl}/post-sitemap.xml`, lastmod: new Date().toISOString() },
      { loc: `${siteUrl}/page-sitemap.xml`, lastmod: new Date().toISOString() },
    ];

    const sitemapIndex = createSitemapIndex(sitemaps);

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemapIndex);
    res.end();
  } catch (error) {
    console.error("Error generating sitemap index:", error);
    res.status(500).json({ error: error.message });
  }
}

function createSitemapIndex(sitemaps) {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const sitemapindexOpen = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const sitemapindexClose = '</sitemapindex>';

  const sitemapEntries = sitemaps
    .map((sitemap) => {
      return `
        <sitemap>
          <loc>${sitemap.loc}</loc>
          <lastmod>${sitemap.lastmod}</lastmod>
        </sitemap>
      `;
    })
    .join('');

  return xmlHeader + sitemapindexOpen + sitemapEntries + sitemapindexClose;
}
