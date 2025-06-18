export default async function handler(req, res) {
  try {
    const wordpressUrl = process.env.WORDPRESS_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
    
    // Add this environment variable to force indexing regardless of WordPress settings
    const forceAllowIndexing = process.env.FORCE_ALLOW_INDEXING === 'true';
    
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
      const robotsResponse = await fetch(`${wordpressUrl}/robots.txt`, {
        headers: {
          'User-Agent': 'NextJS-Headless-Site',
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
            `${wordpressUrl}/wp-json/rankmath/v1/getHead?url=${wordpressUrl}`,
            {
              headers: {
                'User-Agent': 'NextJS-Headless-Site',
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
          const discouragingRobots = `User-agent: *
Disallow: /

Sitemap: ${siteUrl}/sitemap.xml`;
          
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Cache-Control', 'public, max-age=3600');
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
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(robotsContent);
      }
    } catch (fetchError) {
      // Continue to fallback
    }

    // Fallback robots.txt
    const shouldDiscourageFallback = !forceAllowIndexing && !isPublic;
    
    if (shouldDiscourageFallback) {
      const discouragingRobots = `User-agent: *
Disallow: /

Sitemap: ${siteUrl}/sitemap.xml`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=3600');
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

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(fallbackRobots);
    
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    
    const emergencyRobots = `User-agent: *
Disallow: /

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/sitemap.xml`;

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(emergencyRobots);
  }
}