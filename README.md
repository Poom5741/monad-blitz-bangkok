# USDC Clone with receiveWithAuthorization

โปรเจคนี้เป็นการสาธิตการใช้งาน `receiveWithAuthorization` feature ของ USDC บน Ethereum โดยใช้ Foundry สำหรับ smart contract และ React สำหรับ frontend

## โครงสร้างโปรเจค

```
usdc-clone/
├── contracts/          # Foundry project สำหรับ smart contracts
│   ├── src/
│   │   └── USDCClone.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
├── server.js           # Node.js server สำหรับจัดการ private key
├── package.json        # Server dependencies
├── .env.example        # ตัวอย่าง environment variables
└── README.md
```

## Features

- ✅ ERC20 token พร้อม `receiveWithAuthorization` (EIP-3009)
- ✅ Frontend React app สำหรับเชื่อมต่อ MetaMask
- ✅ การ sign authorization ด้วย EIP-712
- ✅ Server component สำหรับจัดการ private key
- ✅ การป้องกัน front-running attacks
- ✅ Meta-transaction support

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
# ติดตั้ง server dependencies
npm install

# ติดตั้ง frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Deploy Smart Contract

```bash
cd contracts

# Compile contracts
forge build

# Deploy to local network (ต้องรัน anvil ก่อน)
anvil # ใน terminal อื่น
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

cd ..
```

### 3. ตั้งค่า Environment Variables

```bash
# Copy และแก้ไข .env file
cp .env.example .env

# แก้ไขค่าใน .env file:
# - CONTRACT_ADDRESS: ที่อยู่ contract ที่ deploy แล้ว
# - PRIVATE_KEY: private key ของ server wallet
# - RPC_URL: RPC endpoint
```

### 4. อัพเดท Contract Address ใน Frontend

แก้ไขไฟล์ `frontend/src/App.js`:
```javascript
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

### 5. รัน Application

```bash
# รัน server (terminal 1)
npm start

# รัน frontend (terminal 2)
cd frontend
npm start
```

## การใช้งาน

1. **เชื่อมต่อ MetaMask**: คลิกปุ่ม "Connect MetaMask"
2. **ใส่ข้อมูลการโอน**: ระบุที่อยู่ผู้รับและจำนวนเงิน
3. **Sign Authorization**: คลิก "Sign Authorization" เพื่อ sign ด้วย MetaMask
4. **การโอนอัตโนมัติ**: Server จะใช้ private key ในการส่งธุรกรรมไปยัง blockchain

## ข้อดีของ receiveWithAuthorization

- **ป้องกัน Front-running**: ไม่สามารถถูก front-run ได้เหมือน `approve` + `transferFrom`
- **ไม่ต้อง approve ล่วงหน้า**: ไม่จำเป็นต้องทำ approve transaction แยก
- **Meta-transactions**: สามารถให้คนอื่นจ่าย gas fee แทนได้
- **Random nonce**: ใช้ random nonce แทน sequential nonce

## การทดสอบ

### ทดสอบ Smart Contract
```bash
cd contracts
forge test
```

### ทดสอบ Server API
```bash
# Health check
curl http://localhost:3001/health

# Contract info
curl http://localhost:3001/api/contract-info
```

## Security Notes

⚠️ **คำเตือนด้านความปลอดภัย**:
- ไม่เผย private key ใน code หรือ commit ลง git
- ใช้ environment variables สำหรับข้อมูลสำคัญ
- ตรวจสอบ signature และ authorization ให้ถูกต้อง
- ใช้ HTTPS ใน production

## เครือข่ายที่รองรับ

- Local (Anvil): Chain ID 31337
- Sepolia Testnet: Chain ID 11155111
- Ethereum Mainnet: Chain ID 1

## การแก้ไขปัญหา

### Contract Address ไม่ถูกต้อง
- ตรวจสอบว่า deploy contract สำเร็จแล้ว
- อัพเดท CONTRACT_ADDRESS ใน .env และ App.js

### MetaMask ไม่เชื่อมต่อ
- ตรวจสอบว่าติดตั้ง MetaMask แล้ว
- เปลี่ยน network ใน MetaMask ให้ตรงกับ RPC_URL

### Server Error
- ตรวจสอบ .env file
- ตรวจสอบว่า RPC endpoint ทำงานปกติ
- ตรวจสอบ private key และ contract address

## License

MIT