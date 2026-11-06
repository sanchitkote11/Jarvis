import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.yourname.jarvis',
  appName: 'Jarvis',
  webDir: 'dist',
  server: { url: 'http://localhost:3000', cleartext: true },
  android: { allowMixedContent: true }
};
export default config;
