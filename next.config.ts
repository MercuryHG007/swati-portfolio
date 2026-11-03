import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async redirects() {
    // The exhibitions list now lives on the About page; detail pages stay at /exhibitions/[slug].
    return [{ source: "/exhibitions", destination: "/about", permanent: true }];
  },
};

export default nextConfig;
