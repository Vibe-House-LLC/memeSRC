/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['v2-beta.memesrc.com', 'artworks.thetvdb.com', 'v1.memesrc.com'],
    },
    async redirects() {
      return [
        {
          source: '/_universal',
          destination: '/',
          permanent: true,
        },
      ]
    },
  }
  
  export default nextConfig;