import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const { updateProfile } = useAuth();
    const theme = Colors[colorScheme];

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUri, setAvatarUri] = useState('🌟');

    const EMOJI_PRESETS = ["🦄", "🦊", "🐶", "🐱", "🐼", "🦝", "🫎", "🦓", "🐮", "🐷", "🐭", "🐥", "🐬", "🦖", "🦋", "🦀", "🦞"];

    const handleCompleteProfile = async () => {
        if (!name.trim()) return;
        try {
            await updateProfile({ name, bio, avatarUri });
        } catch (error) {
            console.error('Failed to complete profile', error);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : "height"}>
                <ScrollView
                    style={{ flex: 1, backgroundColor: theme.background }}
                    contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }}
                >
                    <View style={{ alignItems: 'center', marginBottom: 30 }}>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 10 }}>Welcome!</Text>
                        <Text style={{ fontSize: 16, color: theme.icon, textAlign: 'center' }}>
                            Let's get your profile set up so you can start receiving tips.
                        </Text>
                    </View>

                    <View style={{ alignItems: 'center', marginBottom: 30 }}>
                        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 }}>
                            <Text style={{ fontSize: 60 }}>{avatarUri}</Text>
                        </View>
                        <Text style={{ color: theme.text, marginBottom: 10, fontWeight: 'bold' }}>Choose an Avatar</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
                            {EMOJI_PRESETS.map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => setAvatarUri(emoji)}
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 25,
                                        backgroundColor: avatarUri === emoji ? theme.tint : theme.card,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: avatarUri === emoji ? 2 : 0,
                                        borderColor: 'white'
                                    }}
                                >
                                    <Text style={{ fontSize: 28 }}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View>
                        <Text style={{ marginBottom: 5, color: theme.text, fontWeight: 'bold' }}>Name *</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={{ borderWidth: 1, borderColor: theme.border, padding: 15, borderRadius: 10, marginBottom: 15, color: theme.text, backgroundColor: theme.card, fontSize: 16 }}
                            placeholder="Your Name (Required)"
                            placeholderTextColor={theme.icon}
                        />

                        <Text style={{ marginBottom: 5, color: theme.text, fontWeight: 'bold' }}>Bio</Text>
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            style={{ borderWidth: 1, borderColor: theme.border, padding: 15, borderRadius: 10, marginBottom: 25, color: theme.text, backgroundColor: theme.card, fontSize: 16, minHeight: 100, textAlignVertical: 'top' }}
                            placeholder="Tell us about yourself (Optional)"
                            placeholderTextColor={theme.icon}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={handleCompleteProfile}
                            disabled={!name.trim()}
                            style={{
                                backgroundColor: name.trim() ? theme.tint : theme.border,
                                padding: 15,
                                borderRadius: 10,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Complete Profile</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
