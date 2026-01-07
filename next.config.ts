/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: [
      'https://hygrp.vercel.app',
      '*.cloudworkstations.dev',
    ],
  },
}

module.exports = nextConfig
