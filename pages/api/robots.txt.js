export default async function handler(req, res) {
  try {
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const forceAllowIndexing = process.env.FORCE_ALLOW_INDEXING === 'true';
    
    // Add cache-busting headers
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    // Add a timestamp comment for debugging
    const timestamp = new Date().toISOString();
    
    if (!wordpressUrl) {
      throw new Error('WordPress URL not configured');
    }

    // Method 1: Check WordPress blog_public setting first
    let isPublic = true;
    try {
      const settingsResponse = await fetch(
        `${wordpressUrl}/wp-json/wp/v2/settings`,
        {
          headers: {
            'User-Agent': 'NextJS-Headless-Site',
            'Cache-Control': 'no-cache',
          },
        }
      );
      
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        isPublic = settings.blog_public !== 0;
      }
    } catch (settingsError) {
      // Ignore settings errors
    }

    // Method 2: Try to get robots.txt directly from WordPress
    try {
      const robotsResponse = await fetch(`${wordpressUrl}/robots.txt?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'NextJS-Headless-Site',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (robotsResponse.ok) {
        let robotsContent = await robotsResponse.text();
        
        const hasDisallowAll = robotsContent.includes('Disallow: /') && 
                               !robotsContent.includes('Disallow: /wp-');
        
        // Check RankMath API for noindex
        let hasNoIndex = false;
        try {
          const headlessResponse = await fetch(
            `${wordpressUrl}/wp-json/rankmath/v1/getHead?url=${wordpressUrl}&t=${Date.now()}`,
            {
              headers: {
                'User-Agent': 'NextJS-Headless-Site',
                'Cache-Control': 'no-cache',
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
          // Ignore API errors
        }
        
        // Decide whether to discourage indexing
        const shouldDiscourageIndexing = !forceAllowIndexing && (!isPublic || hasDisallowAll || hasNoIndex);
        
        if (shouldDiscourageIndexing) {
          const discouragingRobots = `# Generated: ${timestamp}
# Status: DISCOURAGING INDEXING
User-agent: *
Disallow: /

Sitemap: ${siteUrl}/sitemap.xml`;
          
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
        
        // Add timestamp to the robots.txt
        const timestampedRobots = `# Generated: ${timestamp}
# Status: ALLOWING INDEXING (from WordPress)
${robotsContent}`;
        
        return res.status(200).send(timestampedRobots);
      }
    } catch (fetchError) {
      // Continue to fallback
    }

    // Fallback robots.txt
    const shouldDiscourageFallback = !forceAllowIndexing && !isPublic;
    
    if (shouldDiscourageFallback) {
      const discouragingRobots = `# Generated: ${timestamp}
# Status: DISCOURAGING INDEXING (fallback)
User-agent: *
Disallow: /

Sitemap: ${siteUrl}/sitemap.xml`;
      
      return res.status(200).send(discouragingRobots);
    }

    const fallbackRobots = `# Generated: ${timestamp}
# Status: ALLOWING INDEXING (fallback)
User-agent: *
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

    return res.status(200).send(fallbackRobots);
    
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    
    const timestamp = new Date().toISOString();
    const emergencyRobots = `# Generated: ${timestamp}
# Status: EMERGENCY FALLBACK
User-agent: *
Disallow: /

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.status(200).send(emergencyRobots);
  }
}