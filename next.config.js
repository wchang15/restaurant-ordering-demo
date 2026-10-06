/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.155', '192.168.2.49', '127.0.0.1', 'localhost'],
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
