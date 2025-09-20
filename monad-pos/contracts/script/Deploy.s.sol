// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/USDCClone.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy USDCClone with initial supply of 1,000,000 tokens
        USDCClone token = new USDCClone(
            "USDC Clone",
            "USDCC",
            1000000 // 1M tokens
        );

        console.log("USDCClone deployed at:", address(token));
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Total supply:", token.totalSupply());

        vm.stopBroadcast();
    }
}