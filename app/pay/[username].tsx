import { useAuthorization } from '@/components/providers/AuthorizationProvider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PayScreen() {
    const { authorizeSession } = useAuthorization();
    const colorScheme = useColorScheme() ?? 'light';
    const router = useRouter();
    const { address, name, bio, avatar, tipTitle, tipDescription, tipTarget } = useLocalSearchParams();

    const theme = Colors[colorScheme];

    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const recipientName = Array.isArray(name) ? name[0] : name;
    const recipientAddress = Array.isArray(address) ? address[0] : address;
    const recipientAvatar = Array.isArray(avatar) ? avatar[0] : avatar;
    const recipientBio = Array.isArray(bio) ? bio[0] : bio;

    const tTitle = Array.isArray(tipTitle) ? tipTitle[0] : tipTitle;
    const tDescription = Array.isArray(tipDescription) ? tipDescription[0] : tipDescription;
    const tTarget = Array.isArray(tipTarget) ? tipTarget[0] : tipTarget;

    console.log(useLocalSearchParams())

    const handleSendTip = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        if (!recipientAddress) {
            Alert.alert('Error', 'Recipient address not found.');
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
                    Alert.alert('Insufficient Funds', 'You do not have enough SOL for this transaction.');
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

            Alert.alert('Payment Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (true) {
        return (
            <SafeAreaView style={{flex: 1, backgroundColor: theme.background}}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                    <Animated.View entering={ZoomIn.duration(500)}>
                        <Ionicons name="checkmark-circle" size={120} color="#4ade80" />
                    </Animated.View>
                    <Animated.Text entering={FadeIn.delay(300).duration(500)} style={{ marginTop: 20, fontSize: 24, fontWeight: 'bold', color: theme.text }}>
                        Payment Successful!
                    </Animated.Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.background }}>
            <SafeAreaView>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, alignItems: 'center', backgroundColor: theme.background}}>
                <View style={{ alignItems: 'center', marginBottom: 30 }}>
                    <Image
                        source={{ uri: recipientAvatar || 'https://picsum.photos/seed/random1/100/100' }}
                        style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 15 }}
                    />
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>{recipientName || 'Unknown Creator'}</Text>
                    {recipientBio ? <Text style={{ color: theme.icon, marginTop: 5, textAlign: 'center' }}>{recipientBio}</Text> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 5, backgroundColor: theme.card, borderRadius: 15 }}>
                        <Text style={{ fontSize: 12, color: theme.icon, marginRight: 5 }}>{recipientAddress?.slice(0, 4)}...{recipientAddress?.slice(-4)}</Text>
                    </View>
                </View>

                {tTitle ? (
                    <LinearGradient
                        colors={['#0a7ea4', '#004f69']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: '100%', marginBottom: 20, padding: 25, borderRadius: 25, elevation: 8, shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                    >
                        <Text style={{ fontSize: 14, color: '#E0F7FA', fontWeight: '600', letterSpacing: 1, marginBottom: 5 }}>CONTRIBUTE TO GOAL</Text>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 5 }}>{tTitle}</Text>
                        {tDescription ? <Text style={{ color: '#E0F7FA', marginBottom: 15 }}>{tDescription}</Text> : null}

                        <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ color: '#E0F7FA', fontSize: 12 }}>Target Goal</Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{tTarget} SOL</Text>
                            </View>
                        </View>
                    </LinearGradient>
                ) : null}

                <View style={{ width: '100%', marginBottom: 20 }}>
                    <Text style={{ marginBottom: 10, fontWeight: 'bold', color: theme.text }}>Enter Amount (SOL)</Text>
                    <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        style={{ borderWidth: 1, borderColor: theme.border, padding: 15, borderRadius: 10, fontSize: 18, color: theme.text, backgroundColor: theme.background }}
                        placeholder="0.1"
                        placeholderTextColor={theme.icon}
                        autoFocus
                    />
                </View>

                <View style={{ width: '100%', marginBottom: 30 }}>
                    <Text style={{ marginBottom: 10, fontWeight: 'bold', color: theme.text }}>Message (Optional)</Text>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        style={{ borderWidth: 1, borderColor: theme.border, padding: 15, borderRadius: 10, color: theme.text, backgroundColor: theme.background }}
                        placeholder="Say something nice..."
                        placeholderTextColor={theme.icon}
                        multiline
                    />
                </View>

                <TouchableOpacity
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
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                        {loading ? 'Sending...' : `Send ${amount ? amount : '0'} SOL & Mint Badge`}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.icon }}>Cancel</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
        </KeyboardAvoidingView>
    );
}
