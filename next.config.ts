import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its font metric files from disk at runtime; keep it
  // unbundled so those files resolve correctly in the serverless build.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
