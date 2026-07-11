// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title PayUSD
/// @notice Minimal test stablecoin used as the payroll currency for the demo.
///         Openly mintable on Sepolia so anyone can try the Sablier funding flow.
contract PayUSD is ERC20 {
    constructor() ERC20("Pay USD", "PayUSD") {
        _mint(msg.sender, 1_000_000e18);
    }

    /// @notice Faucet-style mint for the testnet demo.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
