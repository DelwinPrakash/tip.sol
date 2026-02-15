import '../global.css';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConnectionProvider } from '@/components/providers/ConnectionProvider';
import { AuthorizationProvider } from '@/components/providers/AuthorizationProvider';
import { RPC_ENDPOINT } from '@/components/providers/ConnectionProvider';
import {clusterApiUrl} from '@solana/web3.js';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ConnectionProvider config={{commitment: 'processed'}} endpoint={clusterApiUrl(RPC_ENDPOINT)}>
        <AuthorizationProvider>
          <AuthProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="pay/[username]" options={{ presentation: 'card', title: 'Pay' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </AuthProvider>
        </AuthorizationProvider>
      </ConnectionProvider>
    </SafeAreaProvider>
  );
}
