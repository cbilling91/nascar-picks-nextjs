/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cf.nascar.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.nascar.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
