/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained build for the home server: .next/standalone/server.js + node_modules it needs.
  // scripts/deploy.ps1 copies it to C:\websites\travel-blog.
  output: "standalone",
  // Native modules stay external so the traced node_modules copy is used at runtime.
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // Keep the dev database, docs and scripts out of the traced server bundle.
  outputFileTracingExcludes: {
    "*": ["./data/**", "./docs/**", "./scripts/**", "./.claude/**", "./drizzle.config.ts"],
  },
};

module.exports = nextConfig;
