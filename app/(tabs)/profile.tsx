import { Stack } from 'expo-router';
import { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { selectedAccount, handleConnect, handleDisconnect, userProfile, updateProfile, isLoading } = useAuth();
    const [name, setName] = useState(userProfile?.name || '');
    const [bio, setBio] = useState(userProfile?.bio || '');
    const [avatarUri, setAvatarUri] = useState(userProfile?.avatarUri || 'https://picsum.photos/seed/random1/100/100');
    const [isEditing, setIsEditing] = useState(!userProfile);

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
                    style={{ backgroundColor: theme.tint, padding: 15, borderRadius: 10 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Connect Wallet</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, padding: 20, paddingTop: 60, backgroundColor: theme.background }}>
            <Stack.Screen options={{ title: 'Profile', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text }} />
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

                    <View style={{ backgroundColor: theme.card, padding: 15, borderRadius: 10, marginBottom: 20 }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5, color: theme.text }}>Your Tip Link:</Text>
                        <Text selectable style={{ color: theme.text }}>soltip.app/{userProfile?.name.replace(/\s+/g, '').toLowerCase()}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setIsEditing(true)}
                        style={{ backgroundColor: theme.border, padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}
                    >
                        <Text style={{ fontWeight: 'bold', color: theme.text }}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleDisconnect}
                        style={{ padding: 15, alignItems: 'center' }}
                    >
                        <Text style={{ color: 'red' }}>Disconnect Wallet</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
