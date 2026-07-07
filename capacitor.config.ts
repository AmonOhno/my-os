import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amonohno.myos',
  appName: 'MyOS',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    // iOS の WebView オリジン（capacitor://localhost）は Finance API の CORS 許可
    // リストに含まれないため、fetch をネイティブHTTPに差し替えて CORS を回避する（#1）
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
