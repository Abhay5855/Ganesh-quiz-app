import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // SSR for admin loaders; participant/host live pages hydrate on the client.
  ssr: true,
  presets: process.env.VERCEL === "1" ? [vercelPreset()] : [],
} satisfies Config;
