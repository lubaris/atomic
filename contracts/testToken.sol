// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract TestToken is ERC20, Ownable {

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }
    
    constructor(address _to) ERC20("Atomic Wallet Coin", "AWC") {
        _mint(_to, 10000*10**8);
    }


    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    } 
}