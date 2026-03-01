import { Account } from '@/components/providers/AuthorizationProvider';
import { useConnection } from '@/components/providers/ConnectionProvider';
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecentSupporters } from '@/hooks/useRecentSupporters';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import QRCode from 'react-native-qrcode-svg';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { selectedAccount, userProfile, tipTarget, updateTipTarget } = useAuth();
  const { connection } = useConnection();

  const theme = Colors[colorScheme];

  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { supporters, loadingSupporters, fetchSupporters } = useRecentSupporters(selectedAccount);
  const [showQr, setShowQr] = useState(false);
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetDescription, setNewTargetDescription] = useState('');
  const [newTargetAmount, setNewTargetAmount] = useState('');

  const handleCreateTarget = async () => {
    if (!newTargetTitle || !newTargetAmount || isNaN(parseFloat(newTargetAmount))) {
      return;
    }
    await updateTipTarget({
      title: newTargetTitle,
      description: newTargetDescription,
      targetAmount: parseFloat(newTargetAmount),
      startBalance: balance || 0,
    });
    setIsCreatingTarget(false);
    setNewTargetTitle('');
    setNewTargetDescription('');
    setNewTargetAmount('');
  };
  const fetchBalance = useCallback(async (account: Account) => {
    try {
      const fetchedBalance = await connection.getBalance(account.publicKey);
      setBalance(fetchedBalance / LAMPORTS_PER_SOL);
    } catch (e) {
      console.error('Failed to fetch balance', e);
    }
  }, [connection],
  );


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedAccount) {
      await fetchBalance(selectedAccount);
      await fetchSupporters();
    }
    setRefreshing(false);
  }, [selectedAccount, fetchBalance, fetchSupporters]);

  useEffect(() => {
    if (selectedAccount) {
      fetchBalance(selectedAccount);
    }
  }, [selectedAccount, fetchBalance]);

  const tipLink = userProfile && selectedAccount
    ? `https://soltip.app/pay/${userProfile.name.replace(/\s+/g, '').toLowerCase()}?address=${selectedAccount.publicKey}&name=${encodeURIComponent(userProfile.name)}&bio=${encodeURIComponent(userProfile.bio)}&avatar=${encodeURIComponent(userProfile.avatarUri)}${tipTarget ? `&tipTitle=${encodeURIComponent(tipTarget.title)}&tipDescription=${encodeURIComponent(tipTarget.description)}&tipTarget=${encodeURIComponent(tipTarget.targetAmount.toString())}` : ''}`
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
        <Text style={{ fontSize: 32, fontWeight: '800', color: theme.text }}>Hello, {userProfile?.name || 'Creator'} 👋</Text>
        <Text style={{ color: theme.icon, fontSize: 16 }}>Welcome back to your dashboard.</Text>
      </View> */}

      {/* Balance Card with Gradient */}
      {/* <LinearGradient
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
      </LinearGradient> */}

      {/* Tip Target Section */}
      {tipTarget ? (
        <LinearGradient
          colors={['#0a7ea4', '#004f69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 25, borderRadius: 25, marginBottom: 30, elevation: 8, shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>🎯 {tipTarget.title}</Text>
            <TouchableOpacity onPress={() => updateTipTarget(null)}>
              <IconSymbol size={20} name="trash" color="#c8192bff" />
            </TouchableOpacity>
          </View>

          {Math.max(0, (balance || 0) - tipTarget.startBalance) >= tipTarget.targetAmount ? (
            <View style={{ alignItems: 'center', paddingVertical: 15 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4dd0e1', marginBottom: 5 }}>Target Reached! 🎉</Text>
              <Text style={{ color: '#E0F7FA', textAlign: 'center' }}>You've successfully raised {tipTarget.targetAmount} SOL for this goal.</Text>
              <TouchableOpacity onPress={() => updateTipTarget(null)} style={{ marginTop: 15, backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Start New Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* {tipTarget.description ? <Text style={{ color: '#E0F7FA', marginBottom: 15 }}>{tipTarget.description}</Text> : null} */}

              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#E0F7FA', fontSize: 12 }}>Raised</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4dd0e1' }}>{Math.max(0, (balance || 0) - tipTarget.startBalance).toFixed(4)} SOL</Text>
                </View>
                <Text style={{ fontSize: 18, color: '#E0F7FA' }}>/</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#E0F7FA', fontSize: 12 }}>Target</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{tipTarget.targetAmount} SOL</Text>
                </View>
              </View>

              {/* Simple Progress Bar */}
              <View style={{ height: 8, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, marginTop: 15, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: '#4dd0e1', width: `${Math.min(100, (Math.max(0, (balance || 0) - tipTarget.startBalance) / tipTarget.targetAmount) * 100)}%` }} />
              </View>
            </>
          )}
        </LinearGradient>
      ) : (
        <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 20, marginBottom: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}>
          {isCreatingTarget ? (
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15 }}>Create Tip Target</Text>
              <TextInput
                placeholder="Target Title (e.g., New Mic)"
                placeholderTextColor={theme.icon}
                value={newTargetTitle}
                onChangeText={setNewTargetTitle}
                style={{ borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 10, color: theme.text, marginBottom: 10 }}
              />
              <TextInput
                placeholder="Description (Optional)"
                placeholderTextColor={theme.icon}
                value={newTargetDescription}
                onChangeText={setNewTargetDescription}
                style={{ borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 10, color: theme.text, marginBottom: 10 }}
              />
              <TextInput
                placeholder="Target Amount (SOL)"
                placeholderTextColor={theme.icon}
                value={newTargetAmount}
                onChangeText={setNewTargetAmount}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 10, color: theme.text, marginBottom: 15 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => setIsCreatingTarget(false)} style={{ padding: 10, marginRight: 10 }}>
                  <Text style={{ color: theme.icon, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateTarget} style={{ backgroundColor: '#0a7ea4', padding: 10, borderRadius: 10, paddingHorizontal: 20 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 10 }}>Set a Goal</Text>
              <Text style={{ color: theme.icon, textAlign: 'center', marginBottom: 15 }}>Give your supporters a specific target to contribute towards!</Text>
              <TouchableOpacity onPress={() => setIsCreatingTarget(true)} style={{ backgroundColor: '#0a7ea4', padding: 12, borderRadius: 10, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Create Tip Target</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

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

      {/* Recent Tips */}
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 15, color: theme.text }}>Recent Supporters</Text>
      <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
        {loadingSupporters ? (
          <Text style={{ padding: 15, color: theme.icon, textAlign: 'center' }}>Loading supporters...</Text>
        ) : supporters.length === 0 ? (
          <Text style={{ padding: 15, color: theme.icon, textAlign: 'center' }}>No supporters yet. Share your link!</Text>
        ) : (
          supporters.map((supporter, idx) => {
            const timeStr = supporter.timestamp
              ? new Date(supporter.timestamp * 1000).toLocaleDateString()
              : 'Unknown time';
            return (
              <View key={supporter.signature} style={[styles.transactionRow, idx === supporters.length - 1 ? { borderBottomWidth: 0 } : { borderBottomColor: theme.border }]}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#FFD700' }]}>
                  <Text style={{ fontSize: 18 }}>🎩</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>
                    {supporter.senderAddress.slice(0, 4)}...{supporter.senderAddress.slice(-4)}
                  </Text>
                  <Text style={{ color: theme.icon, fontSize: 13 }}>Sent {supporter.amount.toFixed(4)} SOL</Text>
                </View>
                <Text style={{ color: theme.icon, fontSize: 12 }}>{timeStr}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
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
