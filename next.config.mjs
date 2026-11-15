/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Builds a fully static site into the "out" folder (for Azure Static Web Apps).
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
