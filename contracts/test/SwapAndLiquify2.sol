// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../SwapAndLiquify.sol";

// Import previous contract and update it
contract SwapAndLiquify2 is SwapAndLiquify {
   
    function getTokenAddress() public view returns(address) {
        return (aldnAddress);
    }
}