const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Contract ABI (same as frontend)
const CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
  "event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)"
];

// Configuration - Replace with your values
const CONFIG = {
  RPC_URL: process.env.RPC_URL || 'http://localhost:8545', // Your RPC endpoint
  PRIVATE_KEY: process.env.PRIVATE_KEY, // Server's private key
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS, // Deployed contract address
  CHAIN_ID: parseInt(process.env.CHAIN_ID) || 31337 // Chain ID
};

// Initialize provider and wallet
let provider, wallet, contract;

try {
  provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  
  if (!CONFIG.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is required');
    process.exit(1);
  }
  
  wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
  
  if (!CONFIG.CONTRACT_ADDRESS) {
    console.error('❌ CONTRACT_ADDRESS environment variable is required');
    process.exit(1);
  }
  
  contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
  
  console.log('✅ Server initialized successfully');
  console.log('📍 Server wallet address:', wallet.address);
  console.log('📄 Contract address:', CONFIG.CONTRACT_ADDRESS);
  
} catch (error) {
  console.error('❌ Failed to initialize server:', error.message);
  process.exit(1);
}

// Utility function to verify EIP-712 signature
function verifySignature(authData) {
  try {
    const domain = {
      name: "USDC Clone",
      version: "1",
      chainId: CONFIG.CHAIN_ID,
      verifyingContract: CONFIG.CONTRACT_ADDRESS
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    const value = {
      from: authData.from,
      to: authData.to,
      value: authData.value,
      validAfter: authData.validAfter,
      validBefore: authData.validBefore,
      nonce: authData.nonce
    };

    // Reconstruct signature
    const signature = ethers.Signature.from({
      v: authData.v,
      r: authData.r,
      s: authData.s
    });

    // Verify signature
    const digest = ethers.TypedDataEncoder.hash(domain, types, value);
    const recoveredAddress = ethers.recoverAddress(digest, signature);
    
    return recoveredAddress.toLowerCase() === authData.from.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    serverAddress: wallet.address,
    contractAddress: CONFIG.CONTRACT_ADDRESS
  });
});

// Get server wallet address
app.get('/api/server-address', (req, res) => {
  res.json({ address: wallet.address });
});

// Execute transfer with authorization
app.post('/api/execute-transfer', async (req, res) => {
  try {
    const authData = req.body;
    
    // Validate required fields
    const requiredFields = ['from', 'to', 'value', 'validAfter', 'validBefore', 'nonce', 'v', 'r', 's'];
    for (const field of requiredFields) {
      if (!authData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    console.log('📝 Processing transfer authorization:', {
      from: authData.from,
      to: authData.to,
      value: ethers.formatEther(authData.value),
      nonce: authData.nonce
    });

    // Verify signature
    if (!verifySignature(authData)) {
      console.error('❌ Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Check if authorization is still valid
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < authData.validAfter) {
      return res.status(400).json({ error: 'Authorization not yet valid' });
    }
    if (currentTime > authData.validBefore) {
      return res.status(400).json({ error: 'Authorization expired' });
    }

    // Check if authorization has already been used
    const isUsed = await contract.authorizationState(authData.from, authData.nonce);
    if (isUsed) {
      return res.status(400).json({ error: 'Authorization already used' });
    }

    // Execute the transfer
    console.log('🚀 Executing transferWithAuthorization...');
    const tx = await contract.transferWithAuthorization(
      authData.from,
      authData.to,
      authData.value,
      authData.validAfter,
      authData.validBefore,
      authData.nonce,
      authData.v,
      authData.r,
      authData.s
    );

    console.log('⏳ Transaction submitted:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed:', {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    res.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

  } catch (error) {
    console.error('❌ Transfer execution error:', error);
    
    // Handle specific error types
    if (error.code === 'CALL_EXCEPTION') {
      return res.status(400).json({ 
        error: 'Contract call failed', 
        details: error.reason || error.message 
      });
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ 
        error: 'Insufficient funds for gas' 
      });
    }

    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Get contract info
app.get('/api/contract-info', async (req, res) => {
  try {
    const [name, symbol] = await Promise.all([
      contract.name(),
      contract.symbol()
    ]);
    
    res.json({
      address: CONFIG.CONTRACT_ADDRESS,
      name,
      symbol,
      chainId: CONFIG.CHAIN_ID
    });
  } catch (error) {
    console.error('Error fetching contract info:', error);
    res.status(500).json({ error: 'Failed to fetch contract info' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 Contract info: http://localhost:${PORT}/api/contract-info`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  process.exit(0);
});