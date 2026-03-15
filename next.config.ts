import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      {
        source: "/user_login",
        destination: "http://localhost:5000/user_login",
      },
      {
        source: "/user_signup",
        destination: "http://localhost:5000/user_signup",
      },
      {
        source: "/doc_login",
        destination: "http://localhost:5000/doc_login",
      },
      {
        source: "/doc_signup",
        destination: "http://localhost:5000/doc_signup",
      },
      {
        source: "/logout",
        destination: "http://localhost:5000/logout",
      }
    ];
  },
};

export default nextConfig;
