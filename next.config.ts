import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Safety net: people reflexively type /signin or /sign-in. Bounce
      // both to the canonical /login route so a typo never 404s.
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/sign-in", destination: "/login", permanent: true },
    ];
  },
};

export default nextConfig;
