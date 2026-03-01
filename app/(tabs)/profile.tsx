import { useConnection } from '@/components/providers/ConnectionProvider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTipHistory } from '@/hooks/useTipHistory';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const { connection } = useConnection();
    const { selectedAccount, handleConnect, handleDisconnect, userProfile, updateProfile, tipTarget, updateTipTarget, isLoading, refreshProfile } = useAuth();

    const theme = Colors[colorScheme];
    const [name, setName] = useState(userProfile?.name || '');
    const [bio, setBio] = useState(userProfile?.bio || '');
    const [avatarUri, setAvatarUri] = useState(userProfile?.avatarUri || 'https://picsum.photos/seed/random1/100/100');
    const [isEditing, setIsEditing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { history, loadHistory } = useTipHistory(selectedAccount?.publicKey.toString());

    // Sync state when userProfile loads
    useEffect(() => {
        if (userProfile) {
            setName(userProfile.name);
            setBio(userProfile.bio);
            setAvatarUri(userProfile.avatarUri);
            setIsEditing(false);
        } else if (selectedAccount && !isLoading) {
            setIsEditing(true);
        }
    }, [userProfile, selectedAccount, isLoading]);

    const fetchBalance = useCallback(async () => {
        if (selectedAccount) {
            try {
                const fetchedBalance = await connection.getBalance(selectedAccount.publicKey);
                setBalance(fetchedBalance / LAMPORTS_PER_SOL);
            } catch (e) {
                console.error('Failed to fetch balance', e);
            }
        }
    }, [selectedAccount, connection]);

    useEffect(() => {
        fetchBalance();
        loadHistory();
    }, [fetchBalance, loadHistory]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchBalance();
        await loadHistory();
        if (refreshProfile) await refreshProfile();
        setRefreshing(false);
    }, [fetchBalance, loadHistory, refreshProfile]);

    const handleSaveProfile = async () => {
        if (!name.trim()) return;
        await updateProfile({ name, bio, avatarUri });
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!selectedAccount) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.background }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>Welcome to SolTip</Text>
                <Text style={{ textAlign: 'center', marginBottom: 30, color: theme.text }}>Connect your Solana wallet to start receiving tips.</Text>
                <TouchableOpacity
                    onPress={handleConnect}
                    disabled={isLoading}
                    style={{ backgroundColor: theme.tint, padding: 15, borderRadius: 10 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Connect Wallet</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.background }}
            contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        >
            <Stack.Screen options={{ title: 'Profile', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text }} />

            <View style={{ position: 'relative', zIndex: 10 }}>
                {/* 3-Dot Menu Button */}
                {!isEditing && userProfile && (
                    <View style={{ alignItems: 'flex-end', marginBottom: -20, zIndex: 20 }}>
                        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{ padding: 10 }}>
                            <IconSymbol size={28} name="ellipsis" color={theme.text} />
                        </TouchableOpacity>

                        {showMenu && (
                            <View style={{ position: 'absolute', top: 40, right: 10, backgroundColor: theme.card, borderRadius: 10, padding: 10, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, minWidth: 150 }}>
                                <TouchableOpacity
                                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}
                                    onPress={() => {
                                        setIsEditing(true);
                                        setShowMenu(false);
                                    }}
                                >
                                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>Edit Profile</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ paddingVertical: 10 }}
                                    onPress={() => {
                                        handleDisconnect();
                                        setShowMenu(false);
                                    }}
                                >
                                    <Text style={{ color: 'red', fontWeight: 'bold' }}>Disconnect Wallet</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ alignItems: 'center', marginBottom: 30 }}>
                    <Image source={{ uri: avatarUri }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 10 }} />
                    {isEditing ? (
                        <TouchableOpacity onPress={() => {/* Image picker implementation needed */ }}>
                            <Text style={{ color: theme.tint }}>Change Photo</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {isEditing ? (
                    <View>
                        <Text style={{ marginBottom: 5, color: theme.text }}>Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={{ borderWidth: 1, borderColor: theme.border, padding: 10, borderRadius: 5, marginBottom: 15, color: theme.text, backgroundColor: theme.background }}
                            placeholder="Your Name"
                            placeholderTextColor={theme.icon}
                        />
                        <Text style={{ marginBottom: 5, color: theme.text }}>Bio</Text>
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            style={{ borderWidth: 1, borderColor: theme.border, padding: 10, borderRadius: 5, marginBottom: 15, color: theme.text, backgroundColor: theme.background }}
                            placeholder="Tell us about yourself"
                            placeholderTextColor={theme.icon}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={handleSaveProfile}
                            style={{ backgroundColor: theme.tint, padding: 15, borderRadius: 10, alignItems: 'center' }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Save Profile</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View accessible={true}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: theme.text }}>{userProfile?.name}</Text>
                        <Text style={{ textAlign: 'center', color: theme.icon, marginBottom: 20 }}>{userProfile?.bio}</Text>

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

                        {/* Current Tip Target */}
                        {tipTarget ? (
                            <View style={{ backgroundColor: theme.card, borderRadius: 15, padding: 20, marginBottom: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Current Goal</Text>
                                    <TouchableOpacity onPress={() => {
                                        Alert.alert(
                                            "Delete Goal",
                                            "Are you sure you want to delete your current goal?",
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Delete", style: "destructive", onPress: () => updateTipTarget(null) }
                                            ]
                                        );
                                    }}>
                                        <IconSymbol size={20} name="trash" color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.tint, marginBottom: 5 }}>{tipTarget.title}</Text>
                                {tipTarget.description ? <Text style={{ color: theme.icon, marginBottom: 15 }}>{tipTarget.description}</Text> : null}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontWeight: 'bold', color: theme.text }}>{(tipTarget.amountRaised || 0).toFixed(4)} SOL Raised</Text>
                                    <Text style={{ fontWeight: 'bold', color: theme.text }}>{tipTarget.targetAmount} SOL Target</Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Tip History */}
                        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 15, color: theme.text }}>Recent Goals</Text>
                        <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                            {history.length === 0 ? (
                                <Text style={{ padding: 15, color: theme.icon, textAlign: 'center' }}>No recent goals yet.</Text>
                            ) : (
                                history.map((item, idx) => {
                                    const timeStr = new Date(item.createdAt).toLocaleDateString();
                                    return (
                                        <View key={item.id} style={[{ flexDirection: 'row', alignItems: 'center', padding: 15 }, idx === history.length - 1 ? {} : { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                                            <View style={[{ width: 45, height: 45, borderRadius: 22.5, marginRight: 15, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: '#0a7ea4' }]}>
                                                <Text style={{ fontSize: 18 }}>🎯</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>
                                                    {item.title}
                                                </Text>
                                                <Text style={{ color: theme.icon, fontSize: 13 }}>Target: {item.targetAmount} SOL</Text>
                                            </View>
                                            <Text style={{ color: theme.icon, fontSize: 12 }}>{timeStr}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>

                    </View>
                )}
            </View>
        </ScrollView>
    );
}
