// Example of how to use the new comprehensive meta and static file features
import WebliskFramework, { WebliskRoute } from '../lib/weblisk.ts';
import { css, html, js } from '../lib/routes.ts';

/**
 * Enhanced Global App Configuration with comprehensive meta support
 */
WebliskRoute.setAppConfig({
  // Global defaults
  defaultMeta: {
    title: 'Weblisk Framework',
    description: 'Real-time web applications made simple',
    keywords: ['weblisk', 'real-time', 'web-framework', 'typescript', 'deno'],
    author: 'Avaropoint',

    // Social media integration
    og: {
      title: 'Weblisk Framework',
      description: 'Build lightning-fast real-time web applications',
      image: 'https://weblisk.dev/og-image.png',
      siteName: 'Weblisk',
      type: 'website',
      locale: 'en_US'
    },

    twitter: {
      card: 'summary_large_image',
      site: '@weblisk',
      creator: '@avaropoint',
      title: 'Weblisk Framework',
      description: 'Build lightning-fast real-time web applications',
      image: 'https://weblisk.dev/twitter-image.png'
    },

    // PWA support
    themeColor: '#4F46E5',
    manifest: '/manifest.json',
    // appleTouchIcon: '/apple-touch-icon.png',  // Commented out for now
    // favicon: '/favicon.ico',  // Commented out for now

    // Custom meta tags
    custom: [
      { name: 'application-name', content: 'Weblisk' },
      { name: 'msapplication-TileColor', content: '#4F46E5' },
      { property: 'fb:app_id', content: '123456789' }
    ]
  },

  // HTML configuration
  defaultHtml: {
    lang: 'en', // This could be dynamically set based on user preference
    appContainerId: 'weblisk-app',
    appContainerClass: 'min-h-screen bg-gray-50'
  },

  // Global styles with modern CSS
  globalStyles: (data) => css`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .weblisk-app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  `,

  // Global client code
  globalClientCode: (data) => js`
    console.log('Enhanced Weblisk app initialized for environment:', window.WebliskApp.data.environment);

    // Enhanced global utilities
    window.WebliskApp = {
      ...window.WebliskApp,

      // Language/locale support
      setLanguage(lang) {
        document.documentElement.lang = lang;
      },

      // Meta tag updates (for SPA-like behavior)
      updateMeta(meta) {
        if (meta.title) document.title = meta.title;
        if (meta.description) {
          const desc = document.querySelector('meta[name="description"]');
          if (desc) desc.content = meta.description;
        }
      }
    };
  `,

  // Global data with enhanced context
  globalData: async (context) => ({
    appName: 'Weblisk Framework',
    appDescription: 'Real-time web applications made simple',
    sessionId: context.sessionId || 'unknown',
    timestamp: new Date().toLocaleString(),
    environment: context.framework.getEnvironment(),
    version: '2.0.0',

    // Add user language detection
    userLanguage: 'en', // Could be detected from Accept-Language header

    // Add theme support
    theme: 'light' // Could be user preference
  })
});

/**
 * Enhanced Home Route with comprehensive meta
 */
class Home extends WebliskRoute {
  constructor() {
    super({
      // Route-specific meta overrides
      meta: {
        title: 'Home - Weblisk Framework',
        description: 'Welcome to Weblisk - the fastest way to build real-time web applications',
        canonical: 'https://weblisk.dev/',

        // Route-specific social media
        og: {
          title: 'Welcome to Weblisk',
          description: 'Build amazing real-time web apps with ease',
          url: 'https://weblisk.dev/'
        },

        // Additional meta for this route
        custom: [
          { name: 'page-type', content: 'homepage' }
        ]
      },

      // Route-specific HTML config
      html: {
        bodyClass: 'homepage'
      },

      template: (data) => html`
        <header class="hero">
          <h1>Welcome to ${data.appName}</h1>
          <p>${data.appDescription}</p>
          <p>Environment: <strong>${data.environment}</strong></p>
          <p>Session: <code>${data.sessionId}</code></p>
          <p>Language: ${data.userLanguage}</p>
        </header>

        <main class="content">
          <section>
            <h2>Real-time Features</h2>
            <button onclick="WebliskApp.sendEvent('hello', { name: 'World' })">
              Test WebSocket Connection
            </button>

            <button onclick="WebliskApp.setLanguage('es')">
              Switch to Spanish
            </button>
          </section>

          <div id="message-output" style="display: none;">
            <!-- WebSocket responses will appear here -->
          </div>
        </main>
      `,

      styles: (data) => css`
        .hero {
          text-align: center;
          padding: 4rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .content {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        button {
          background: #4F46E5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          margin: 0.5rem;
          font-size: 1rem;
        }

        button:hover {
          background: #4338CA;
        }
      `,

      clientCode: (data) => js`
        console.log('Home route loaded with enhanced features!');

        // Enhanced WebSocket event handling
        if (window.weblisk) {
          window.weblisk.on('hello-response', (response) => {
            const output = document.getElementById('message-output');
            output.style.display = 'block';
            output.innerHTML = \`
              <div style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                <h3>✅ WebSocket Response</h3>
                <p><strong>Message:</strong> \${response.message}</p>
                <p><strong>Time:</strong> \${new Date(response.timestamp).toLocaleString()}</p>
                <p><strong>Session:</strong> \${response.sessionId}</p>
              </div>
            \`;
          });
        }
      `,

      data: async (context) => ({
        title: 'Home',
        pageType: 'homepage'
      }),

      events: {
        'hello': async (data, context) => {
          return {
            message: `Hello ${data.name}! Enhanced response from Weblisk server.`,
            timestamp: Date.now(),
            sessionId: context.sessionId || 'unknown',
            serverInfo: {
              environment: context.framework.getEnvironment(),
              version: '2.0.0'
            }
          };
        }
      }
    });
  }
}

// Initialize the enhanced Weblisk application
const app = new WebliskFramework();

// Add static files for SEO and web standards
app.addStaticFile('/robots.txt', `User-agent: *
Allow: /

Sitemap: https://weblisk.dev/sitemap.xml`);

app.addStaticFile('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://weblisk.dev/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);

app.addStaticFile('/manifest.json', JSON.stringify({
  name: 'Weblisk Framework',
  short_name: 'Weblisk',
  description: 'Real-time web applications made simple',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#4F46E5'
}, null, 2));

// Add minimal favicon and icons to prevent 404 errors
// For production, replace these with actual icon files
// app.addStaticFile('/favicon.ico', '', 'image/x-icon');
// app.addStaticFile('/icon-192.png', '', 'image/png');
// app.addStaticFile('/icon-512.png', '', 'image/png');

// Register routes
app.route('/', new Home());

// Start the application
await app.start();

console.log(`Enhanced Weblisk app running on ${app.getServerUrl()} [${app.getEnvironment()}]`);
