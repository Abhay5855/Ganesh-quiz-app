import type { Config } from "@react-router/dev/config";

export default {
  // SSR for admin loaders; participant/host live pages hydrate on the client.
  ssr: true,
} satisfies Config;
