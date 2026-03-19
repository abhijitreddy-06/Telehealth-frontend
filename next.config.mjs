import path from "node:path";
import { fileURLToPath } from "node:url";

const isProduction = process.env.NODE_ENV === "production";
const configuredBackend = process.env.NEXT_SERVER_API_URL;

if (isProduction && !configuredBackend) {
  throw new Error(
    "Missing NEXT_SERVER_API_URL in production. Refusing to fall back to localhost."
  );
}

if (isProduction && configuredBackend && configuredBackend.startsWith("http://")) {
  throw new Error("NEXT_SERVER_API_URL must use HTTPS in production.");
}

const BACKEND = (configuredBackend || "http://localhost:10000").replace(/\/$/, "");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      // Dedicated backend proxy prefix to avoid collisions with App Router pages.
      { source: "/backend/:path*", destination: `${BACKEND}/:path*` },

      // Catch-all for /api/* routes.
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
    ];
  },
};

export default nextConfig;
