import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novx.ai';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/projects', '/settings', '/billing', '/admin'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
