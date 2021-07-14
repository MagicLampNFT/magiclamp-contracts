Compile and run test cases
Follow below steps

Step 1. Start node in other Tab. Command => npx hardhat node
Step 2. Run fisrt Command => npx hardhat test test/generateKey.js
 This file generate Hash key which is use for calculates the CREATE2 address for a pair without making any external calls.
 This key put manually in this file "contracts/uniswap/router/libraries/UniswapV2Library.sol" =>Function Name : pairFor() => Line Number : 25.
 Before pasting key, please remove first 2 letter "0x" from key. 
Step 3. Run 2nd Command => npx hardhat test test/sample-test.js


