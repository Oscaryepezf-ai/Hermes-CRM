import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El Constructor de Flujos sube imágenes/videos/documentos vía Server
    // Action (FormData) — el límite de 1MB por defecto no alcanza para video.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
