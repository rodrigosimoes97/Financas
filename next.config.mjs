/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        'miniature-bassoon-jjgq7w76wvxc556g-3000.app.github.dev',
        '*.app.github.dev',
        '*.githubpreview.dev',
      ],
    },
  },
}

export default nextConfig