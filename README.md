# Blok_Explorer

Blok_Explorer is a comprehensive blockchain utility platform designed to provide users with tools for token swapping, cross-chain bridging, gas estimation, and real-time transaction tracking across multiple EVM-compatible networks.

## 🚀 Features

- **Multi-Chain Swap & Bridge**: Seamlessly swap tokens on the same chain or bridge them across different blockchains using Rubic and Uniswap protocols.
- **Gas Price Estimator**: Real-time gas price tracking for Ethereum, Polygon, BSC, and more to help you optimize transaction costs.
- **Transaction Dashboard**: View your wallet balance and detailed transaction history across multiple networks (Mainnet & Testnet).
- **Real-Time Notifications**: Subscribe to price alerts and transaction status updates via browser notifications, webhooks, or Discord.
- **Modern UI/UX**: A premium, responsive design built with React, Shadcn UI, and Framer Motion.

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** + **Shadcn UI** + **Radix UI**
- **Wagmi** + **Reown AppKit** (WalletConnect)
- **TanStack Query** (React Query)
- **Framer Motion** (Animations)
- **Socket.io-client** (Real-time data)

### Backend
- **Node.js** + **Express**
- **Socket.io** (Bidirectional communication)
- **Ethers.js** (Blockchain interaction)
- **Uniswap SDK** & **Rubic SDK/API** (DeFi integrations)

## 📋 Project Structure

```text
Blok_Explorer/
├── Backend/            # Express server and DeFi logic
│   ├── contracts/      # Solidity smart contracts
│   ├── services/       # Integration services (Notifications, Webhooks)
│   ├── index.js        # Main entry point
│   └── swap.js         # Swap and Bridge orchestration
└── Frontend/           # React application
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── pages/      # Application pages (Swap, GasEstimator, etc.)
    │   ├── services/   # Frontend API and Socket services
    │   └── App.tsx     # Main application component
    └── vite.config.ts  # Vite configuration
```

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn
- An Alchemy API Key (or other RPC provider)

### 1. Clone the repository
```bash
git clone <repository-url>
cd Blok_Explorer
```

### 2. Backend Setup
```bash
cd Backend
npm install
```
Create a `.env` file in the `Backend` directory:
```env
ALCHEMY_API_KEY=your_alchemy_api_key
XSWAPINK_CONTRACT_ADDRESS=0x...
```
Start the backend server:
```bash
node index.js
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
```
Create a `.env` file in the `Frontend` directory:
```env
VITE_USE_TESTNET=false
VITE_REOWN_PROJECT_ID=your_reown_project_id
VITE_EXPLORER_API_KEY=your_explorer_api_key
VITE_BACKEND_API_URL=http://localhost:3001
```
Start the frontend development server:
```bash
npm run dev
```

## 📄 License
This project is licensed under the MIT License.
