import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import './App.css';

// Contract ABI (simplified for demo)
const CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
  "event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)"
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState('');

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    const ethereumProvider = await detectEthereumProvider();
    if (ethereumProvider) {
      const web3Provider = new ethers.BrowserProvider(ethereumProvider);
      setProvider(web3Provider);
      
      // Get current network
      try {
        const network = await web3Provider.getNetwork();
        setCurrentNetwork(network.name === 'unknown' ? `Chain ID: ${network.chainId}` : network.name);
      } catch (error) {
        console.error('Error getting network:', error);
      }
      
      // Check if already connected
      const accounts = await ethereumProvider.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        await initializeContract(web3Provider);
      }
      
      // Listen for network changes
      ethereumProvider.on('chainChanged', async () => {
        window.location.reload();
      });
      
      // Listen for account changes
      ethereumProvider.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          // User disconnected all accounts
          disconnectWallet();
        } else {
          // User switched accounts
          setAccount(accounts[0]);
          setIsConnected(true);
          await initializeContract(web3Provider);
          await updateBalance(web3Provider);
        }
      });
    } else {
      setStatus('Please install MetaMask!');
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount('');
    setBalance('0');
    setProvider(null);
    setCurrentNetwork('');
    setStatus('Wallet disconnected');
    
    // Clear any cached data
    localStorage.clear();
    
    // Reload the page to ensure clean state
    window.location.reload();
  };

  const initializeContract = async (web3Provider) => {
    if (CONTRACT_ADDRESS !== "0x...") {
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Provider);
      setContract(contractInstance);
      await updateBalance(web3Provider);
    }
  };

  const connectWallet = async () => {
    if (!provider) {
      setStatus('MetaMask not detected');
      return;
    }

    try {
      setLoading(true);
      
      // Request permissions to allow user to select different account
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      setIsConnected(true);
      await initializeContract(provider);
      setStatus('Wallet connected successfully!');
    } catch (error) {
      setStatus('Failed to connect wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (web3Provider = provider) => {
    if (contract && account) {
      try {
        const balance = await contract.balanceOf(account);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }
  };

  const signAuthorization = async () => {
    if (!provider || !account || !transferAmount || !recipientAddress) {
      setStatus('Please fill all fields and connect wallet');
      return;
    }

    try {
      setLoading(true);
      setStatus('Signing authorization...');

      const signer = await provider.getSigner();
      const amount = ethers.parseEther(transferAmount);
      const nonce = ethers.randomBytes(32);
      const validAfter = Math.floor(Date.now() / 1000);
      const validBefore = validAfter + 3600; // Valid for 1 hour

      // Create the typed data for EIP-712 signature
      const domain = {
        name: "USDC Clone",
        version: "1",
        chainId: await provider.getNetwork().then(n => n.chainId),
        verifyingContract: CONTRACT_ADDRESS
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
        from: account,
        to: recipientAddress,
        value: amount,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: nonce
      };

      // Sign the typed data
      const signature = await signer.signTypedData(domain, types, value);
      const { v, r, s } = ethers.Signature.from(signature);

      // Prepare authorization data for server
      const authorizationData = {
        from: account,
        to: recipientAddress,
        value: amount.toString(),
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: ethers.hexlify(nonce),
        v: v,
        r: r,
        s: s
      };

      setStatus('Authorization signed! Sending to server...');
      
      // Send to server (you'll need to implement this endpoint)
      await sendToServer(authorizationData);
      
    } catch (error) {
      setStatus('Error signing authorization: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendToServer = async (authorizationData) => {
    try {
      // This would be your server endpoint
      const response = await fetch('http://localhost:3001/api/execute-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authorizationData)
      });

      if (response.ok) {
        setStatus('Transfer executed successfully!');
        await updateBalance();
        setTransferAmount('');
        setRecipientAddress('');
      } else {
        const error = await response.text();
        setStatus('Server error: ' + error);
      }
    } catch (error) {
      setStatus('Failed to send to server: ' + error.message);
    }
  };

  const switchToAnvil = async () => {
    if (!provider) {
      setStatus('MetaMask not detected');
      return;
    }

    try {
      setLoading(true);
      setStatus('Switching to Anvil network...');
      
      // Try to switch to Anvil network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 31337 in hex
      });
      
      setStatus('Successfully switched to Anvil network!');
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x7a69',
                chainName: 'Anvil Local',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['http://localhost:8545'],
                blockExplorerUrls: null,
              },
            ],
          });
          setStatus('Anvil network added and switched successfully!');
        } catch (addError) {
          setStatus('Failed to add Anvil network: ' + addError.message);
        }
      } else {
        setStatus('Failed to switch network: ' + switchError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>USDC Clone Demo</h1>
        <p>Demo for receiveWithAuthorization feature</p>
        
        {!isConnected ? (
          <button 
            onClick={connectWallet} 
            disabled={loading}
            className="connect-button"
          >
            {loading ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        ) : (
          <div className="wallet-info">
            <p><strong>Connected Account:</strong> {account}</p>
            <p><strong>Current Network:</strong> {currentNetwork}</p>
            <p><strong>Balance:</strong> {balance} USDCC</p>
            <div className="wallet-buttons">
              <button 
                onClick={switchToAnvil}
                disabled={loading}
                className="network-button"
              >
                {loading ? 'Switching...' : 'Switch to Anvil Network'}
              </button>
              <button 
                onClick={disconnectWallet}
                disabled={loading}
                className="disconnect-button"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {isConnected && CONTRACT_ADDRESS !== "0x..." && (
          <div className="transfer-form">
            <h3>Create Transfer Authorization</h3>
            <div className="form-group">
              <label>Recipient Address:</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Amount (USDCC):</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.0"
                className="form-input"
              />
            </div>
            <button 
              onClick={signAuthorization}
              disabled={loading || !transferAmount || !recipientAddress}
              className="sign-button"
            >
              {loading ? 'Processing...' : 'Sign Authorization'}
            </button>
          </div>
        )}

        {CONTRACT_ADDRESS === "0x..." && (
          <div className="warning">
            <p>⚠️ Please update CONTRACT_ADDRESS in App.js with your deployed contract address</p>
          </div>
        )}

        {status && (
          <div className="status">
            <p>{status}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
