import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Web Push Next.js',
    short_name: 'PushDemo',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111827',
    icons: [
      // Replace with real 192x192 and 512x512 icons under /public/icons
      { src: '/next.png', sizes: '192x192', type: 'image/png' },
      { src: '/next.png', sizes: '512x512', type: 'image/png' }
    ]
  };
}


