# Tip.sol 🪙

### *The decentralized, zero-friction tipping platform for creators on Solana.*

**Tip.sol** is a mobile-first, decentralized tipping application built exclusively on the Solana blockchain. It empowers anyone to receive global, instant, and borderless tips with **zero middleman fees**. By leveraging the speed and incredibly low transaction costs of Solana, Tip.sol provides a seamless Web3 alternative to traditional creator-support platforms.

---

## ✨ Features

- **Seamless Wallet Integration:** Connect existing crypto wallets (like Phantom or Solflare) instantly using the Solana Mobile Wallet Adapter. No usernames, passwords, or KYC.
- **Tip Targets (Goals):** Creators can set specific Tip Goals (e.g., "Save for a New Mic") with a defined SOL target and progress bar.
- **Frictionless QR Code Payments:** Every profile generates a unique QR code. Supporters can easily scan it in-app to send SOL in seconds.
- **Personalized Web3 Profiles:** Customize your profile with an Emoji Avatar, display name, and bio, all securely synced via Supabase.
- **Transparent Transaction History:** Keep track of all tips sent and received, view timestamps and messages, and verify transactions on the blockchain.
- **Delightful UX/UI:** Enjoy a premium feel with fluid Expo animations, Nativewind styling, haptic feedback, and celebratory audio chimes upon successful payments.

---

## 🛠 Tech Stack

- **Frontend Mobile App:** React Native & Expo
- **Styling:** Nativewind (TailwindCSS for React Native)
- **Blockchain Integration:** `@solana/web3.js` for on-chain interactions
- **Wallet Connection:** `@solana-mobile/mobile-wallet-adapter-protocol` for native mobile wallet deep-linking and transaction signing
- **Backend & Database:** Supabase (PostgreSQL) for profile metadata, goal tracking, and off-chain transaction logging

---

## 🚀 Get Started

Follow these steps to run the application locally.

### 1. Prerequisites

- Node.js (v18 or newer recommended)
- A Solana Wallet app installed on your mobile device or emulator (e.g., Phantom, Solflare, or standard "faked" wallet for Android emulator)

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and configure your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 4. Create a Development Build

To interact with native mobile wallets via the Mobile Wallet Adapter, you **must use a development build** or a standalone app, rather than Expo Go. 

First, install the `expo-dev-client`:
```bash
npx expo install expo-dev-client
```

Then, run one of the following commands to create and start a development build:

**For Android:**
```bash
npx expo run:android
```

**For iOS (requires macOS):**
```bash
npx expo run:ios
```

*Note: For mobile wallet adapter features, testing on a physical device or a properly configured emulator with a wallet app (like Phantom) installed is recommended.*

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
