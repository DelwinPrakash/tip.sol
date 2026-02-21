import { useAuthorization } from '@/components/providers/AuthorizationProvider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function PayScreen() {
    const { authorizeSession } = useAuthorization();
    const colorScheme = useColorScheme() ?? 'light';
    const router = useRouter();
    
    const theme = Colors[colorScheme];
    const { username, address, name, bio, avatar } = useLocalSearchParams();

    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const recipientName = Array.isArray(name) ? name[0] : name;
    const recipientAddress = Array.isArray(address) ? address[0] : address;
    const recipientAvatar = Array.isArray(avatar) ? avatar[0] : avatar;
    const recipientBio = Array.isArray(bio) ? bio[0] : bio;

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
                Alert.alert('Success', `Tip sent! Signature: ${signature.slice(0, 8)}...`);
                router.replace('/(tabs)');
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

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60, alignItems: 'center', backgroundColor: theme.background }}>
                <View style={{ alignItems: 'center', marginBottom: 30 }}>
                    <Image
                        source={{ uri: recipientAvatar || 'https://via.placeholder.com/150' }}
                        style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 15 }}
                    />
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>{recipientName || 'Unknown Creator'}</Text>
                    {recipientBio ? <Text style={{ color: theme.icon, marginTop: 5, textAlign: 'center' }}>{recipientBio}</Text> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 5, backgroundColor: theme.card, borderRadius: 15 }}>
                        <Text style={{ fontSize: 12, color: theme.icon, marginRight: 5 }}>{recipientAddress?.slice(0, 4)}...{recipientAddress?.slice(-4)}</Text>
                    </View>
                </View>

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
        </KeyboardAvoidingView>
    );
}
