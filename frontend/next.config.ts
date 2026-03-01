import type { NextConfig } from "next";
import dotenv from "dotenv";

// Load server-only env for API routes during dev/test
dotenv.config({ path: ".env.server.local" });
dotenv.config({ path: ".env.local" });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;