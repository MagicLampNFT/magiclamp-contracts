// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IALDN {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}