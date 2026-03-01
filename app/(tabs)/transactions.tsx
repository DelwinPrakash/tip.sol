import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TransactionsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const { selectedAccount, handleConnect, isLoading } = useAuth();
    const { transactions, loadingTransactions, fetchTransactions } = useUserTransactions(selectedAccount);

    const theme = Colors[colorScheme];

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (selectedAccount) {
            await fetchTransactions();
        }
        setRefreshing(false);
    }, [selectedAccount, fetchTransactions]);


    if (!selectedAccount) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.background }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>Transactions</Text>
                <Text style={{ textAlign: 'center', marginBottom: 30, color: theme.text }}>Connect your Solana wallet to view your transaction history.</Text>
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
            contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: theme.background }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        >

            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: theme.text }}>Your Transactions</Text>
                <Text style={{ color: theme.icon, fontSize: 16 }}>History of tips you've sent.</Text>
            </View>


            <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                {loadingTransactions ? (
                    <Text style={{ padding: 15, color: theme.icon, textAlign: 'center' }}>Loading transactions...</Text>
                ) : transactions.length === 0 ? (
                    <Text style={{ padding: 15, color: theme.icon, textAlign: 'center' }}>You haven't sent any tips yet.</Text>
                ) : (
                    transactions.map((transaction, idx) => {
                        const timeStr = transaction.timestamp
                            ? new Date(transaction.timestamp * 1000).toLocaleDateString()
                            : 'Unknown time';
                        return (
                            <View key={transaction.signature} style={[styles.transactionRow, idx === transactions.length - 1 ? { borderBottomWidth: 0 } : { borderBottomColor: theme.border }]}>
                                <View style={[styles.avatarPlaceholder, { backgroundColor: '#FFD700' }]}>
                                    {transaction.avatarUri && transaction.avatarUri !== '🎩' ? (
                                        <Text style={{ fontSize: 24 }}>{transaction.avatarUri}</Text>
                                    ) : (
                                        <IconSymbol size={22} name="arrow.up.right" color="#fff" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text }}>
                                            To: {transaction.name ? transaction.name : `${transaction.receiverAddress.slice(0, 4)}...${transaction.receiverAddress.slice(-4)}`}
                                        </Text>
                                        <TouchableOpacity
                                            style={{ marginLeft: 8 }}
                                            onPress={() => Clipboard.setStringAsync(transaction.receiverAddress)}
                                        >
                                            <IconSymbol size={14} name="doc.on.doc" color={theme.icon} />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={{ color: theme.icon, fontSize: 13 }}>Sent {transaction.amount.toFixed(4)} SOL{transaction.message ? ` • "${transaction.message}"` : ''}</Text>
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
