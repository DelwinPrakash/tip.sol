import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Connection, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { selectedAccount, userProfile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  const fetchBalance = async () => {
    if (!selectedAccount) return;
    try {
      const publicKey = new PublicKey(selectedAccount.address);
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  }, [selectedAccount]);

  useEffect(() => {
    fetchBalance();
  }, [selectedAccount]);

  const tipLink = userProfile && selectedAccount
    ? `https://soltip.app/pay/${userProfile.name.replace(/\s+/g, '').toLowerCase()}?address=${selectedAccount.address}&name=${encodeURIComponent(userProfile.name)}&bio=${encodeURIComponent(userProfile.bio)}&avatar=${encodeURIComponent(userProfile.avatarUri)}`
    : '';


  if (!selectedAccount) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.background }}>
        <Stack.Screen options={{ title: 'Dashboard', headerShown: false }} />
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20, color: theme.text }}>Please connect your wallet in the Profile tab to view your dashboard.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
    >
      {/* <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: theme.text }}>Hellos, {userProfile?.name || 'Creator'} 👋</Text>
        <Text style={{ color: theme.icon, fontSize: 16 }}>Welcome back to your dashboard.</Text>
      </View> */}

      {/* Balance Card with Gradient */}
      <LinearGradient
        colors={['#0a7ea4', '#004f69']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 25, borderRadius: 25, marginBottom: 30, elevation: 8, shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
      >
        <Text style={{ color: '#E0F7FA', marginBottom: 5, fontSize: 14, fontWeight: '600', letterSpacing: 1 }}>TOTAL BALANCE</Text>
        <Text style={{ color: 'white', fontSize: 42, fontWeight: 'bold' }}>
          {balance !== null ? `${balance.toFixed(4)} SOL` : '...'}
        </Text>
        <Text style={{ color: '#B2EBF2', fontSize: 14, marginTop: 5 }}>≈ $0.00 USD</Text>
      </LinearGradient>

      {/* Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={() => setShowQr(!showQr)}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#0a7ea4' }]}>
            <IconSymbol size={24} name="qrcode" color="#fff" />
          </View>
          <Text style={[styles.actionText, { color: theme.text }]}>{showQr ? 'Hide QR' : 'Show QR'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={() => {
            if (tipLink) Clipboard.setStringAsync(tipLink);
          }}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#0a7ea4' }]}>
            <IconSymbol size={24} name="doc.on.doc" color="#fff" />
          </View>
          <Text style={[styles.actionText, { color: theme.text }]}>Copy Link</Text>
        </TouchableOpacity>
      </View>

      {/* QR Code Section */}
      {showQr && tipLink ? (
        <View style={{ alignItems: 'center', marginBottom: 30, padding: 30, backgroundColor: 'white', borderRadius: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }}>
          <Text style={{ marginBottom: 20, fontWeight: 'bold', fontSize: 18, color: '#333' }}>Your Tip QR</Text>
          <QRCode value={tipLink} size={220} />
          <Text style={{ marginTop: 20, color: '#888', textAlign: 'center', fontSize: 12 }}>{tipLink}</Text>
        </View>
      ) : null}

      {/* Recent Tips (Mock) */}
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 15, color: theme.text }}>Recent Supporters</Text>
      <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
        <View style={[styles.transactionRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#FFD700' }]}>
            <Text style={{ fontSize: 18 }}>🎩</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>Anonymous Fan</Text>
            <Text style={{ color: theme.icon, fontSize: 13 }}>Sent 0.1 SOL</Text>
          </View>
          <Text style={{ color: theme.icon, fontSize: 12 }}>2m ago</Text>
        </View>
        <View style={[styles.transactionRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#FF69B4' }]}>
            <Text style={{ fontSize: 18 }}>💖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>Super Fan</Text>
            <Text style={{ color: theme.icon, fontSize: 13 }}>Sent 0.5 SOL • "Great content!"</Text>
          </View>
          <Text style={{ color: theme.icon, fontSize: 12 }}>1h ago</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    // backgroundColor removed here, applied inline or via theme
    padding: 15,
    borderRadius: 20,
    marginHorizontal: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconContainer: {
    // backgroundColor: '#6200ea', // Removed
    padding: 8,
    borderRadius: 12,
    marginRight: 10,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#333',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
