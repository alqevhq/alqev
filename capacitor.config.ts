import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.alqev.app",
  appName: "ALQEV",
  webDir: "mobile-shell",
  server: {
    url: "https://www.alqev.com",
    cleartext: false,
    allowNavigation: [
      "alqev.com",
      "www.alqev.com",
    ],
  },
};

export default config;