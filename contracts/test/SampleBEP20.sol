pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT

import "../BEP20.sol";

contract SampleBEP20 is BEP20 {

    constructor(uint _totalSupply) BEP20("SampleToken", "ST1") {
        _mint(msg.sender, _totalSupply);  // decimals = 18, so multiply _totalSupply by 10e18
    }
}