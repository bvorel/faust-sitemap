// pages/api/cache-bust.js - Utility to test cache busting
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com';
    
    if (!wordpressUrl) {
      return res.status(400).json({ error: 'WordPress URL not configured' });
    }

    const timestamp = Date.now();
    const results = {};

    // Test 1: Check WordPress settings
    try {
      const settingsResponse = await fetch(
        `${wordpressUrl}/wp-json/wp/v2/settings?t=${timestamp}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
      
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        results.wordpressSettings = {
          blog_public: settings.blog_public,
          url: settings.url,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      results.wordpressSettings = { error: error.message };
    }

    // Test 2: Check WordPress robots.txt
    try {
      const robotsResponse = await fetch(
        `${wordpressUrl}/robots.txt?t=${timestamp}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
      
      if (robotsResponse.ok) {
        const robotsContent = await robotsResponse.text();
        results.wordpressRobots = {
          content: robotsContent,
          hasDisallowAll: robotsContent.includes('Disallow: /') && !robotsContent.includes('Disallow: /wp-'),
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      results.wordpressRobots = { error: error.message };
    }

    // Test 3: Check our frontend robots.txt
    try {
      const frontendRobotsResponse = await fetch(
        `${frontendUrl}/robots.txt?t=${timestamp}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
      
      if (frontendRobotsResponse.ok) {
        const frontendRobotsContent = await frontendRobotsResponse.text();
        results.frontendRobots = {
          content: frontendRobotsContent,
          hasDisallowAll: frontendRobotsContent.includes('Disallow: /\n'),
          headers: Object.fromEntries(frontendRobotsResponse.headers.entries()),
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      results.frontendRobots = { error: error.message };
    }

    // Analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      cacheBusterUsed: timestamp,
      isConsistent: false,
      recommendations: [],
    };

    if (results.wordpressSettings && results.frontendRobots) {
      const wpIsPublic = results.wordpressSettings.blog_public !== 0;
      const frontendAllowsAll = !results.frontendRobots.hasDisallowAll;
      
      analysis.isConsistent = wpIsPublic === frontendAllowsAll;
      analysis.wordpressIsPublic = wpIsPublic;
      analysis.frontendAllowsAll = frontendAllowsAll;
      
      if (!analysis.isConsistent) {
        if (wpIsPublic && !frontendAllowsAll) {
          analysis.recommendations.push('WordPress allows indexing but frontend blocks it - check cache');
        } else if (!wpIsPublic && frontendAllowsAll) {
          analysis.recommendations.push('WordPress blocks indexing but frontend allows it - check cache');
        }
      }
    }

    // Set no-cache headers for this diagnostic endpoint
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({
      results,
      analysis,
      instructions: {
        step1: 'Go to WordPress Admin → Settings → Reading',
        step2: 'Toggle "Discourage search engines from indexing this site"',
        step3: 'Save changes in WordPress',
        step4: 'Wait 60-120 seconds for WP Engine cache to clear',
        step5: 'Call this endpoint again to verify changes',
      },
    });

  } catch (error) {
    console.error('Cache bust test error:', error);
    res.status(500).json({ error: error.message });
  }
}

// pages/test-cache-bust.js - Test page for the cache busting utility
import { useState } from 'react';

export default function TestCacheBust() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache-bust', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1>WP Engine Cache Busting Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTest} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : 'Run Cache Bust Test'}
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Run the test to see current state</li>
          <li>Go to WordPress Admin → Settings → Reading</li>
          <li>Toggle "Discourage search engines from indexing this site"</li>
          <li>Save changes in WordPress</li>
          <li><strong>Wait 60-120 seconds</strong> (WP Engine cache clearing time)</li>
          <li>Run the test again to verify changes</li>
        </ol>
      </div>

      {results && (
        <div>
          <h2>Test Results</h2>
          
          {results.analysis && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              backgroundColor: results.analysis.isConsistent ? '#f0fff0' : '#fff0f0',
              border: `2px solid ${results.analysis.isConsistent ? 'green' : 'red'}`
            }}>
              <h3>{results.analysis.isConsistent ? '✅ Consistent' : '❌ Inconsistent'}</h3>
              <p><strong>WordPress is public:</strong> {results.analysis.wordpressIsPublic ? 'Yes' : 'No'}</p>
              <p><strong>Frontend allows all:</strong> {results.analysis.frontendAllowsAll ? 'Yes' : 'No'}</p>
              {results.analysis.recommendations.length > 0 && (
                <div>
                  <strong>Recommendations:</strong>
                  <ul>
                    {results.analysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <details>
            <summary style={{ cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
              Raw Test Results
            </summary>
            <pre style={{ background: '#f5f5f5', padding: '15px', overflow: 'auto', marginTop: '10px' }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff8dc', border: '1px solid #ddd' }}>
        <h3>🚨 WP Engine Specific Notes:</h3>
        <ul>
          <li><strong>Cache Layers:</strong> WP Engine has multiple cache layers (Varnish, object cache, page cache)</li>
          <li><strong>Cache Time:</strong> Changes can take 60-120 seconds to propagate</li>
          <li><strong>Purge Cache:</strong> You can manually purge cache in WP Engine dashboard</li>
          <li><strong>Bypass Cache:</strong> Add ?t=timestamp to URLs to bypass cache during testing</li>
        </ul>
      </div>
    </div>
  );
}