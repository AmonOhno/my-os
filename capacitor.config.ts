import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amonohno.myos',
  appName: 'MyOS',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
