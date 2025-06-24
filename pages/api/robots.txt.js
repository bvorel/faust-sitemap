export default async function handler(req, res) {
  try {
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    
    // Environment variable to force indexing regardless of WordPress settings
    const forceAllowIndexing = process.env.FORCE_ALLOW_INDEXING === 'true';
    
    if (!wordpressUrl) {
      throw new Error('WordPress URL not configured');
    }

    // Method 1: Check WordPress blog_public setting first with cache-busting
    let isPublic = true;
    try {
      // Add cache-busting parameters and headers
      const cacheBuster = `?t=${Date.now()}&r=${Math.random()}`;
      const settingsResponse = await fetch(
        `${wordpressUrl}/wp-json/wp/v2/settings${cacheBuster}`,
        {
          headers: {
            'User-Agent': 'NextJS-Headless-Site',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
      
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        isPublic = settings.blog_public !== 0;
        
        // Log for debugging (remove in production)
        console.log(`[${new Date().toISOString()}] WordPress blog_public setting:`, settings.blog_public);
        console.log(`[${new Date().toISOString()}] Site is public:`, isPublic);
      }
    } catch (settingsError) {
      console.error('Settings fetch error:', settingsError);
      // Ignore settings errors but log them
    }

    // Method 2: Try to get robots.txt directly from WordPress with cache-busting
    try {
      const cacheBuster = `?t=${Date.now()}&r=${Math.random()}`;
      const robotsResponse = await fetch(`${wordpressUrl}/robots.txt${cacheBuster}`, {
        headers: {
          'User-Agent': 'NextJS-Headless-Site',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (robotsResponse.ok) {
        let robotsContent = await robotsResponse.text();
        
        const hasDisallowAll = robotsContent.includes('Disallow: /') && 
                               !robotsContent.includes('Disallow: /wp-');
        
        // Check RankMath API for noindex with cache-busting
        let hasNoIndex = false;
        try {
          const headlessResponse = await fetch(
            `${wordpressUrl}/wp-json/rankmath/v1/getHead?url=${wordpressUrl}&t=${Date.now()}`,
            {
              headers: {
                'User-Agent': 'NextJS-Headless-Site',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              },
            }
          );
          
          if (headlessResponse.ok) {
            const headData = await headlessResponse.json();
            const robotsMeta = headData.head?.match(/<meta name="robots" content="([^"]*)"[^>]*>/);
            const robotsDirective = robotsMeta ? robotsMeta[1] : '';
            hasNoIndex = robotsDirective.includes('noindex');
          }
        } catch (apiError) {
          console.error('RankMath API error:', apiError);
          // Ignore API errors
        }
        
        // Decide whether to discourage indexing
        const shouldDiscourageIndexing = !forceAllowIndexing && (!isPublic || hasDisallowAll || hasNoIndex);
        
        console.log(`[${new Date().toISOString()}] Should discourage indexing:`, shouldDiscourageIndexing);
        console.log(`[${new Date().toISOString()}] Reason - isPublic:`, isPublic, 'hasDisallowAll:', hasDisallowAll, 'hasNoIndex:', hasNoIndex);
        
        if (shouldDiscourageIndexing) {
          // Remove sitemap when discouraging indexing
          const discouragingRobots = `User-agent: *
Disallow: /`;
          
          // Set aggressive no-cache headers
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Last-Modified', new Date().toUTCString());
          res.setHeader('ETag', `"blocked-${Date.now()}"`);
          res.setHeader('Vary', 'User-Agent, Accept-Encoding');
          
          console.log(`[${new Date().toISOString()}] Serving BLOCKED robots.txt (no sitemap)`);
          return res.status(200).send(discouragingRobots);
        }
        
        // Allow indexing - use WordPress robots.txt but replace URLs
        robotsContent = robotsContent.replace(
          new RegExp(`${wordpressUrl}/sitemap\\.xml`, 'g'),
          `${siteUrl}/sitemap.xml`
        );
        
        robotsContent = robotsContent.replace(
          new RegExp(wordpressUrl, 'g'),
          siteUrl
        );
        
        // Set moderate caching for allowed content, but still allow quick updates
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=60'); // 5 min browser, 1 min CDN
        res.setHeader('Last-Modified', new Date().toUTCString());
        res.setHeader('ETag', `"allowed-${Date.now()}"`);
        res.setHeader('Vary', 'User-Agent, Accept-Encoding');
        
        console.log(`[${new Date().toISOString()}] Serving ALLOWED robots.txt from WordPress`);
        return res.status(200).send(robotsContent);
      }
    } catch (fetchError) {
      console.error('WordPress robots.txt fetch error:', fetchError);
      // Continue to fallback
    }

    // Fallback robots.txt
    const shouldDiscourageFallback = !forceAllowIndexing && !isPublic;
    
    if (shouldDiscourageFallback) {
      // Remove sitemap when discouraging indexing in fallback too
      const discouragingRobots = `User-agent: *
Disallow: /`;
      
      // Aggressive no-cache for blocked content
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"fallback-blocked-${Date.now()}"`);
      
      console.log(`[${new Date().toISOString()}] Serving FALLBACK BLOCKED robots.txt (no sitemap)`);
      return res.status(200).send(discouragingRobots);
    }

    const fallbackRobots = `User-agent: *
Allow: /

# Block WordPress backend paths  
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /wp-includes/
Disallow: /wp-content/plugins/
Disallow: /wp-content/themes/
Disallow: /wp-login.php
Disallow: /xmlrpc.php

# Block search and feed URLs
Disallow: /search/
Disallow: /?s=
Disallow: */feed/
Disallow: */trackback/
Disallow: /?replytocom=

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml`;

    // Moderate caching for fallback allowed content
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=60'); // 5 min browser, 1 min CDN
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"fallback-allowed-${Date.now()}"`);
    
    console.log(`[${new Date().toISOString()}] Serving FALLBACK ALLOWED robots.txt`);
    res.status(200).send(fallbackRobots);
    
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    
    // Remove sitemap from emergency robots.txt too
    const emergencyRobots = `User-agent: *
Disallow: /`;

    // No cache for emergency content
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"emergency-${Date.now()}"`);
    
    console.log(`[${new Date().toISOString()}] Serving EMERGENCY robots.txt (no sitemap)`);
    res.status(200).send(emergencyRobots);
  }
}