import { useAuthorization } from '@/components/providers/AuthorizationProvider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert as AlertNative, KeyboardAvoidingView as KeyboardAvoidingViewNative, Platform as PlatformNative, ScrollView as ScrollViewNative, TextInput as TextInputNative, Text as TextNative, TouchableOpacity as TouchableOpacityNative, View as ViewNative } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PayScreen() {
    const { authorizeSession } = useAuthorization();
    const colorScheme = useColorScheme() ?? 'light';
    const router = useRouter();
    const { address, username } = useLocalSearchParams();

    const theme = Colors[colorScheme];

    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [recipientProfile, setRecipientProfile] = useState<{ name: string, bio: string, avatar: string } | null>(null);
    const [activeGoal, setActiveGoal] = useState<{ title: string, description: string, targetAmount: number } | null>(null);
    const [isFetchingData, setIsFetchingData] = useState(true);

    const recipientAddress = Array.isArray(address) ? address[0] : address;
    const currentUsername = Array.isArray(username) ? username[0] : username;

    useEffect(() => {
        const fetchRecipientData = async () => {
            if (!recipientAddress) {
                setIsFetchingData(false);
                return;
            }

            try {
                // Fetch profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', recipientAddress)
                    .single();

                if (!profileError && profileData) {
                    setRecipientProfile({
                        name: profileData.username || profileData.display_name || currentUsername || 'Unknown Creator',
                        bio: profileData.bio || '',
                        avatar: profileData.avatar_url || 'https://picsum.photos/seed/random1/100/100'
                    });
                } else {
                    setRecipientProfile({
                        name: currentUsername || 'Unknown Creator',
                        bio: '',
                        avatar: 'https://picsum.photos/seed/random1/100/100'
                    });
                }

                // Fetch active goal
                const { data: goalData, error: goalError } = await supabase
                    .from('tip_goals')
                    .select('*')
                    .eq('wallet_address', recipientAddress)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!goalError && goalData) {
                    setActiveGoal({
                        title: goalData.title,
                        description: goalData.description || '',
                        targetAmount: Number(goalData.target_amount)
                    });
                }
            } catch (error) {
                console.error('Error fetching recipient data:', error);
            } finally {
                setIsFetchingData(false);
            }
        };

        fetchRecipientData();
    }, [recipientAddress, currentUsername]);

    const handleSendTip = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            AlertNative.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        if (!recipientAddress) {
            AlertNative.alert('Error', 'Recipient address not found.');
            return;
        }

        setLoading(true);
        try {
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
            const recipientPublicKey = new PublicKey(recipientAddress);
            const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

            await transact(async (wallet: Web3MobileWallet) => {
                const account = await authorizeSession(wallet);
                const senderPublicKey = account.publicKey;

                const balance = await connection.getBalance(senderPublicKey);
                if (balance < lamports) {
                    AlertNative.alert('Insufficient Funds', 'You do not have enough SOL for this transaction.');
                    return;
                }

                const latestBlockhash = await connection.getLatestBlockhash();

                const transaction = new Transaction({
                    ...latestBlockhash,
                    feePayer: senderPublicKey,
                });

                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey: senderPublicKey,
                        toPubkey: recipientPublicKey,
                        lamports: BigInt(Math.floor(lamports)),
                    })
                );

                const signedTransactions = await wallet.signTransactions({
                    transactions: [transaction],
                });

                const signature = await connection.sendRawTransaction(
                    signedTransactions[0].serialize(),
                    {
                        skipPreflight: false,
                        preflightCommitment: 'confirmed',
                    }
                );

                const confirmation = await connection.confirmTransaction(
                    signature,
                    'confirmed'
                );

                if (confirmation.value.err) {
                    throw new Error('Transaction failed to confirm');
                }

                console.log('Signature:', signature);

                // Log to Supabase
                const { error: dbError } = await supabase.from('tips').insert({
                    signature: signature,
                    sender_address: senderPublicKey.toBase58(),
                    receiver_address: recipientAddress,
                    amount: parseFloat(amount),
                    message: message || null
                });

                if (dbError) {
                    console.error('Failed to log tip to database', dbError);
                } else {
                    if (activeGoal) {
                        try {
                            const { data: goal } = await supabase
                                .from('tip_goals')
                                .select('amount_raised')
                                .eq('wallet_address', recipientAddress)
                                .eq('status', 'active')
                                .single();

                            if (goal) {
                                const currentRaised = Number(goal.amount_raised) || 0;
                                await supabase
                                    .from('tip_goals')
                                    .update({ amount_raised: currentRaised + parseFloat(amount) })
                                    .eq('wallet_address', recipientAddress)
                                    .eq('status', 'active');
                            }
                        } catch (e) {
                            console.error('Failed to update target raised amount', e);
                        }
                    }
                }

                setIsSuccess(true);
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 3000);
            });

        } catch (error: any) {
            console.error('Tip failed:', error);

            let errorMessage = 'Unknown error';
            if (error.message?.includes('TimeoutException')) {
                errorMessage = 'Wallet took too long to respond. Please try again.';
            } else if (error.message?.includes('User declined')) {
                errorMessage = 'Transaction was cancelled.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            AlertNative.alert('Payment Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
                <Stack.Screen options={{ title: 'Payment Successful', headerShown: false }} />
                <ViewNative style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.View entering={ZoomIn.duration(500)}>
                        <Ionicons name="checkmark-circle" size={120} color="#4ade80" />
                    </Animated.View>
                    <Animated.Text entering={FadeIn.delay(300).duration(500)} style={{ marginTop: 20, fontSize: 24, fontWeight: 'bold', color: theme.text }}>
                        Payment Successful!
                    </Animated.Text>
                </ViewNative>
            </SafeAreaView>
        );
    }

    if (isFetchingData) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.tint} />
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingViewNative behavior={PlatformNative.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.background }}>
            <SafeAreaView>
                <ScrollViewNative contentContainerStyle={{ flexGrow: 1, padding: 20, alignItems: 'center', backgroundColor: theme.background }}>
                    <ViewNative style={{ alignItems: 'center', marginBottom: 30 }}>
                        <ViewNative style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 }}>
                            <TextNative style={{ fontSize: 72 }}>{recipientProfile?.avatar || '🐠'}</TextNative>
                        </ViewNative>
                        <TextNative style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>{recipientProfile?.name || 'Unknown Creator'}</TextNative>
                        {recipientProfile?.bio ? <TextNative style={{ color: theme.icon, marginTop: 5, textAlign: 'center' }}>{recipientProfile.bio}</TextNative> : null}
                        <ViewNative style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 5, backgroundColor: theme.card, borderRadius: 15 }}>
                            <TextNative style={{ fontSize: 12, color: theme.icon, marginRight: 5 }}>{recipientAddress?.slice(0, 4)}...{recipientAddress?.slice(-4)}</TextNative>
                        </ViewNative>
                    </ViewNative>

                    {activeGoal ? (
                        <LinearGradient
                            colors={['#0a7ea4', '#004f69']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ width: '100%', marginBottom: 20, padding: 25, borderRadius: 25, elevation: 8, shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                        >
                            <TextNative style={{ fontSize: 14, color: '#E0F7FA', fontWeight: '600', letterSpacing: 1, marginBottom: 5 }}>CONTRIBUTE TO GOAL</TextNative>
                            <TextNative style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 5 }}>{activeGoal.title}</TextNative>
                            {activeGoal.description ? <TextNative style={{ color: '#E0F7FA', marginBottom: 15 }}>{activeGoal.description}</TextNative> : null}

                            <ViewNative style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ViewNative>
                                    <TextNative style={{ color: '#E0F7FA', fontSize: 12 }}>Target Goal</TextNative>
                                    <TextNative style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{activeGoal.targetAmount} SOL</TextNative>
                                </ViewNative>
                            </ViewNative>
                        </LinearGradient>
                    ) : null}

                    <ViewNative style={{ width: '100%', marginBottom: 20 }}>
                        <TextNative style={{ marginBottom: 10, fontWeight: 'bold', color: theme.text }}>Enter Amount (SOL)</TextNative>
                        <TextInputNative
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            style={{ borderWidth: 1, borderColor: theme.border, padding: 15, borderRadius: 10, fontSize: 18, color: theme.text, backgroundColor: theme.background }}
                            placeholder="0.1"
                            placeholderTextColor={theme.icon}
                            autoFocus
                        />
                    </ViewNative>

                    <ViewNative style={{ width: '100%', marginBottom: 30 }}>
                        <TextNative style={{ marginBottom: 10, fontWeight: 'bold', color: theme.text }}>Message (Optional)</TextNative>
                        <TextInputNative
                            value={message}
                            onChangeText={setMessage}
                            style={{ borderWidth: 1, borderColor: theme.border, padding: 15, borderRadius: 10, color: theme.text, backgroundColor: theme.background, fontSize: 16, minHeight: 100, textAlignVertical: 'top' }}
                            placeholder="Say something nice..."
                            placeholderTextColor={theme.icon}
                            multiline
                        />
                    </ViewNative>

                    <TouchableOpacityNative
                        onPress={handleSendTip}
                        disabled={loading}
                        style={{
                            backgroundColor: loading ? theme.icon : theme.tint,
                            width: '100%',
                            padding: 18,
                            borderRadius: 15,
                            alignItems: 'center',
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}
                    >
                        <TextNative style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                            {loading ? 'Sending...' : `Send ${amount ? amount : '0'} SOL & Mint Badge`}
                        </TextNative>
                    </TouchableOpacityNative>

                    <TouchableOpacityNative onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <TextNative style={{ color: theme.icon }}>Cancel</TextNative>
                    </TouchableOpacityNative>

                </ScrollViewNative>
            </SafeAreaView>
        </KeyboardAvoidingViewNative>
    );
}
