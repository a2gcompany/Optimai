/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@optimai/ai', '@optimai/db', '@optimai/types'],
};

module.exports = nextConfig;
