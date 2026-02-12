// import AsyncStorage from '@react-native-async-storage/async-storage';
// import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
// import { useAuthorization } from '../hooks/useAuthorization';

// interface UserProfile {
//     name: string;
//     bio: string;
//     avatarUri: string;
// }

// interface AuthContextType {
//     selectedAccount: any | null;
//     authorizeSession: (wallet: any) => Promise<any>;
//     deauthorizeSession: (wallet: any) => Promise<void>;
//     handleConnect: () => Promise<void>;
//     handleDisconnect: () => Promise<void>;
//     userProfile: UserProfile | null;
//     updateProfile: (profile: UserProfile) => Promise<void>;
//     isLoading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//     const {
//         selectedAccount,
//         authorizeSession,
//         deauthorizeSession,
//         handleConnect: connectWallet,
//         handleDisconnect: disconnectWallet,
//     } = useAuthorization();

//     const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         const loadProfile = async () => {
//             setIsLoading(true);
//             try {
//                 if (selectedAccount) {
//                     const storedProfile = await AsyncStorage.getItem(`profile_${selectedAccount.address}`);
//                     if (storedProfile) {
//                         setUserProfile(JSON.parse(storedProfile));
//                     } else {
//                         setUserProfile(null);
//                     }
//                 } else {
//                     setUserProfile(null);
//                 }
//             } catch (error) {
//                 console.error('Failed to load profile', error);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         loadProfile();
//     }, [selectedAccount]);

//     const updateProfile = async (profile: UserProfile) => {
//         if (!selectedAccount) return;
//         try {
//             await AsyncStorage.setItem(`profile_${selectedAccount.address}`, JSON.stringify(profile));
//             setUserProfile(profile);
//         } catch (error) {
//             console.error('Failed to save profile', error);
//             throw error;
//         }
//     };

//     const handleConnect = async () => {
//         await connectWallet();
//     };

//     const handleDisconnect = async () => {
//         await disconnectWallet();
//         setUserProfile(null);
//     };

//     return (
//         <AuthContext.Provider
//             value={{
//                 selectedAccount,
//                 authorizeSession,
//                 deauthorizeSession,
//                 handleConnect,
//                 handleDisconnect,
//                 userProfile,
//                 updateProfile,
//                 isLoading,
//             }}
//         >
//             {children}
//         </AuthContext.Provider>
//     );
// };

// export const useAuth = () => {
//     const context = useContext(AuthContext);
//     if (context === undefined) {
//         throw new Error('useAuth must be used within an AuthProvider');
//     }
//     return context;
// };


import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface UserProfile {
    name: string;
    bio: string;
    avatarUri: string;
}

interface MockAccount {
    address: string;
    label: string;
}

interface AuthContextType {
    selectedAccount: MockAccount | null;
    authorizeSession: (wallet: any) => Promise<any>;
    deauthorizeSession: (wallet: any) => Promise<void>;
    handleConnect: () => Promise<void>;
    handleDisconnect: () => Promise<void>;
    userProfile: UserProfile | null;
    updateProfile: (profile: UserProfile) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// -------- Mock Data --------
const MOCK_ACCOUNT: MockAccount = {
    address: '0xMOCK123456789',
    label: 'Mock Wallet',
};

const MOCK_PROFILE: UserProfile = {
    name: 'Mock User',
    bio: 'This is a mock profile for testing UI without backend.',
    avatarUri: 'https://picsum.photos/seed/random1/300/300',
};
// ---------------------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [selectedAccount, setSelectedAccount] = useState<MockAccount | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading when account changes
    useEffect(() => {
        const loadMockProfile = async () => {
            setIsLoading(true);
            await new Promise(res => setTimeout(res, 500)); // fake delay

            if (selectedAccount) {
                setUserProfile(MOCK_PROFILE);
            } else {
                setUserProfile(null);
            }

            setIsLoading(false);
        };

        loadMockProfile();
    }, [selectedAccount]);

    const authorizeSession = async () => {
        return Promise.resolve(true);
    };

    const deauthorizeSession = async () => {
        return Promise.resolve();
    };

    const handleConnect = async () => {
        setIsLoading(true);
        await new Promise(res => setTimeout(res, 500)); // fake delay
        setSelectedAccount(MOCK_ACCOUNT);
        setIsLoading(false);
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        await new Promise(res => setTimeout(res, 300));
        setSelectedAccount(null);
        setUserProfile(null);
        setIsLoading(false);
    };

    const updateProfile = async (profile: UserProfile) => {
        await new Promise(res => setTimeout(res, 200)); // simulate API
        setUserProfile(profile);
    };

    return (
        <AuthContext.Provider
            value={{
                selectedAccount,
                authorizeSession,
                deauthorizeSession,
                handleConnect,
                handleDisconnect,
                userProfile,
                updateProfile,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
