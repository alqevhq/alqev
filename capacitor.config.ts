import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.alqev.app",
  appName: "ALQEV",
  webDir: "mobile-shell",
  server: {
    url: "https://alqev.com",
    cleartext: false,
  },
};

export default config;