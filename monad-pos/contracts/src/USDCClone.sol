// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title USDCClone
 * @dev ERC20 token with receiveWithAuthorization feature (EIP-3009)
 */
contract USDCClone is ERC20, Ownable, EIP712 {
    using ECDSA for bytes32;

    // EIP-3009 constants
    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH = 
        keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");
    
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = 
        keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");

    // Mapping to track used nonces
    mapping(address => mapping(bytes32 => bool)) private _authorizationState;

    // Events
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) EIP712(name, "1") {
        _mint(msg.sender, initialSupply * 10**decimals());
    }

    /// @notice USDC-style 6 decimals
    function decimals() public view override returns (uint8) {
        return 6;
    }

    /**
     * @notice Returns the state of an authorization
     * @param authorizer Authorizer's address
     * @param nonce Nonce of the authorization
     * @return True if the nonce is used
     */
    function authorizationState(address authorizer, bytes32 nonce) 
        external 
        view 
        returns (bool) 
    {
        return _authorizationState[authorizer][nonce];
    }

    /**
     * @notice Receive a transfer with a signed authorization from the payer
     * @dev This has an additional check to ensure that the payee's address matches
     * the caller of this function to prevent front-running attacks
     * @param from Payer's address (Authorizer)
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param validAfter The time after which this is valid (unix time)
     * @param validBefore The time before which this is valid (unix time)
     * @param nonce Unique nonce
     * @param v v of the signature
     * @param r r of the signature
     * @param s s of the signature
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(to == msg.sender, "USDCClone: caller must be the payee");
        require(block.timestamp > validAfter, "USDCClone: authorization is not yet valid");
        require(block.timestamp < validBefore, "USDCClone: authorization is expired");
        require(!_authorizationState[from][nonce], "USDCClone: authorization is used");

        bytes32 structHash = keccak256(
            abi.encode(
                RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == from, "USDCClone: invalid signature");

        _authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Execute a transfer with a signed authorization
     * @param from Payer's address (Authorizer)
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param validAfter The time after which this is valid (unix time)
     * @param validBefore The time before which this is valid (unix time)
     * @param nonce Unique nonce
     * @param v v of the signature
     * @param r r of the signature
     * @param s s of the signature
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp > validAfter, "USDCClone: authorization is not yet valid");
        require(block.timestamp < validBefore, "USDCClone: authorization is expired");
        require(!_authorizationState[from][nonce], "USDCClone: authorization is used");

        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == from, "USDCClone: invalid signature");

        _authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
