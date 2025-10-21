/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimizaciones para producción
  poweredByHeader: false,
  compress: true,
  // Webpack config para Font Awesome y otras dependencias
  webpack: (config, { isServer }) => {
    // Evitar problemas con módulos de node en el cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Manejo de imágenes y assets
  images: {
    domains: [],
    unoptimized: false,
  },
};

module.exports = nextConfig;
