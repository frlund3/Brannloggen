import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.brannloggen.app',
  appName: 'Brannloggen',
  webDir: 'public',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#EF4444',
    },
  },
  server: {
    // Capacitor loads the deployed web app URL
    url: 'https://brannloggen-nha2.vercel.app',
    cleartext: false,
  },
};

export default config;
