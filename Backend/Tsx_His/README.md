# Transaction History API

Backend API server for fetching blockchain transaction history across multiple networks using Alchemy.

## Features

- ✅ Fetches transactions from multiple networks (Ethereum, Polygon, BNB)
- ✅ Supports both mainnet and testnet
- ✅ Includes all transaction types (external, internal, ERC20, ERC721, ERC1155)
- ✅ CORS enabled for frontend integration
- ✅ RESTful API endpoints

## Setup

### 1. Install Dependencies

```bash
cd Backend/Tsx_His
npm install
```

### 2. Configure Alchemy API Key

Update the `apiKey` in `index.js` with your Alchemy API key:

```javascript
const apiKey = "YOUR_ALCHEMY_API_KEY";
```

### 3. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3001`

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Transaction History API is running"
}
```

### Get Transaction History
```
GET /api/transactions/:address
```

**Parameters:**
- `address` - Ethereum wallet address (0x...)

**Response:**
```json
{
  "success": true,
  "address": "0x...",
  "totalTransactions": 150,
  "transactions": [
    {
      "hash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "value": "1.5",
      "asset": "ETH",
      "category": "external",
      "direction": "sent",
      "network": "Ethereum Mainnet",
      "blockNum": "0x...",
      "metadata": {
        "blockTimestamp": "2024-11-25T10:30:00.000Z"
      }
    }
  ]
}
```

## Networks Supported

### Mainnet
- Ethereum Mainnet
- Polygon Mainnet
- BNB Mainnet

### Testnet
- Ethereum Sepolia
- Polygon Amoy
- BNB Testnet

## Environment Variables

You can optionally use environment variables:

```bash
PORT=3001  # Server port (default: 3001)
```

## Integration with Frontend

The frontend automatically connects to this API. Make sure:
1. Backend is running on port 3001
2. Frontend `blockchainService.ts` has `BACKEND_API_URL` set to `http://localhost:3001`

## Error Handling

All errors are returned with appropriate HTTP status codes:

```json
{
  "success": false,
  "error": "Invalid wallet address format"
}
```

## Notes

- Maximum 1000 transactions per network per direction (sent/received)
- Transactions are deduplicated by hash
- Results include metadata like block timestamp
- Supports contract deployments and token transfers
