// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./MagicLampWalletBase.sol";
import "./MagicLampWalletEvents.sol";

import "./IERC721Receiver.sol";
import "./IERC1155Receiver.sol";
import "./ERC165.sol";
import "./IBEP20.sol";
import "./IERC721.sol";
import "./IERC1155.sol";

contract MagicLampWallet is MagicLampWalletBase, MagicLampWalletEvents, ERC165, IERC1155Receiver, IERC721Receiver {
    using SafeMath for uint256;

    function tokenTypeBEP20() external pure returns (uint8) {
        return _TOKEN_TYPE_BEP20;
    }

    function tokenTypeERC721() external pure returns (uint8) {
        return _TOKEN_TYPE_ERC721;
    }

    function tokenTypeERC1155() external pure returns (uint8) {
        return _TOKEN_TYPE_ERC1155;
    }

    /**
     * @dev Checks if magicLamp has been locked.
     */
    function isLocked(address host, uint256 id) external view returns (bool locked, uint256 endTime) {
        if (_lockedTimestamps[host][id] <= block.timestamp) {
            locked = false;
        } else {
            locked = true;
            endTime = _lockedTimestamps[host][id] - 1;
        }
    }

    /**
     * @dev Gets token counts inside wallet, including BNB
     */
    function getTokensCount(address host, uint256 id)
    public view returns (uint256 bnbCount, uint256 bep20Count, uint256 erc721Count, uint256 erc1155Count) {
        if (_bnbBalances[host][id] > 0) {
            bnbCount = 1;
        }

        Token[] memory tokens = _tokens[host][id];

        for (uint256 i = 0; i < tokens.length; i++) {
            Token memory token = tokens[i];
            if (token.tokenType == _TOKEN_TYPE_BEP20) {
                bep20Count++;
            } else if (token.tokenType == _TOKEN_TYPE_ERC721) {
                erc721Count++;
            } else if (token.tokenType == _TOKEN_TYPE_ERC1155) {
                erc1155Count++;
            }
        }
    }

    /**
     * @dev Gets tokens for wallet
     */
    function getTokens(address host, uint256 id) 
    external view returns (uint8[] memory tokenTypes, address[] memory tokenAddresses) {
        Token[] memory tokens = _tokens[host][id];

        tokenTypes = new uint8[](tokens.length);
        tokenAddresses = new address[](tokens.length);

        for (uint256 i; i < tokens.length; i++) {
            tokenTypes[i] = tokens[i].tokenType;
            tokenAddresses[i] = tokens[i].tokenAddress;
        }
    }

    /**
     * @dev Supports host(ERC721 token address) for wallet features
     */
    function support(address host) external onlyOwner {
        require(!walletFeatureHosted[host], "MagicLampWallet::support: already supported");

        walletFeatureHosts.push(host);
        walletFeatureHosted[host] = true;

        emit MagicLampWalletSupported(host);
    }

    /**
     * @dev Unsupports host(ERC721 token address) for wallet features
     */
    function unsupport(address host) external onlyOwner {
        require(walletFeatureHosted[host], "MagicLampWallet::unsupport: not found");

        for (uint256 i = 0; i < walletFeatureHosts.length; i++) {
            if (walletFeatureHosts[i] == host) {
                walletFeatureHosts[i] = walletFeatureHosts[walletFeatureHosts.length - 1];
                walletFeatureHosts.pop();
                delete walletFeatureHosted[host];
                emit MagicLampWalletUnsupported(host);
                break;
            }
        }
    }

    /**
     * @dev Gets 
     */
    function isSupported(address host) external view returns(bool) {
        return walletFeatureHosted[host];
    }

    /**
     * @dev Locks wallet
     */
    function lock(address host, uint256 id, uint256 timeInSeconds) external  {
        _onlyWalletOwner(host, id);
        _lockedTimestamps[host][id] = block.timestamp.add(timeInSeconds);

        emit MagicLampWalletLocked(_msgSender(), host, id, block.timestamp, _lockedTimestamps[host][id]);
    }

    /**
     * @dev Checks if token exists inside wallet
     */
    function existsERC721ERC1155(address host, uint256 id, address token, uint256 tokenId) public view returns (bool) {
        uint256[] memory ids = _erc721ERC1155TokenIds[host][id][token];

        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == tokenId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Gets BNB balance
     */
    function getBNB(address host, uint256 id) 
    public view  returns (uint256 balance) {
        balance = _bnbBalances[host][id];
    }

    /**
     * @dev Deposits BNB tokens into wallet
     */
    function depositBNB(address host, uint256 id, uint256 amount) external payable {
        _exists(host, id);
        require(amount > 0 && amount == msg.value, "MagicLampWallet::depositBNB: invalid amount");
        
        _bnbBalances[host][id] = _bnbBalances[host][id].add(msg.value);

        emit MagicLampWalletBNBDeposited(_msgSender(), host, id, msg.value);
    }

    /**
     * @dev Withdraws BNB tokens from wallet
     */
    function withdrawBNB(address host, uint256 id, uint256 amount) public {
        _onlyWalletOwnerOrHost(host, id);
        _unlocked(host, id);

        address to = IERC721(host).ownerOf(id);
        payable(to).transfer(amount);
        _bnbBalances[host][id] = _bnbBalances[host][id].sub(amount);

        emit MagicLampWalletBNBWithdrawn(_msgSender(), host, id, amount, to);
    }

    /**
     * @dev Transfers BNB tokens from wallet into another wallet
     */
    function transferBNB(address fromHost, uint256 fromId, uint256 amount, address toHost, uint256 toId) public  {
        _onlyWalletOwner(fromHost, fromId);
        _unlocked(fromHost, fromId);
        _exists(toHost, toId);
        require(fromHost != toHost || fromId != toId, "MagicLampWallet::transferBNB: same wallet");

        _bnbBalances[fromHost][fromId] = _bnbBalances[fromHost][fromId].sub(amount);
        _bnbBalances[toHost][toId] = _bnbBalances[toHost][toId].add(amount);

        emit MagicLampWalletBNBTransferred(_msgSender(), fromHost, fromId, amount, toHost, toId);
    }

    /**
     * @dev Gets BEP20 token info
     */
    function getBEP20Tokens(address host, uint256 id) 
    public view  returns (address[] memory addresses, uint256[] memory tokenBalances) {
        Token[] memory tokens = _tokens[host][id];
        (, uint256 bep20Count, , ) = getTokensCount(host, id);
        addresses = new address[](bep20Count);
        tokenBalances = new uint256[](bep20Count);
        uint256 j = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            Token memory token = tokens[i];
            if (token.tokenType == _TOKEN_TYPE_BEP20) {
                addresses[j] = token.tokenAddress;
                tokenBalances[j] = _bep20TokenBalances[host][id][token.tokenAddress];
                j++;
            }
        }
    }

    /**
     * @dev Gets ERC721 token info
     */
    function getERC721Tokens(address host, uint256 id) 
    public view  returns (address[] memory addresses, uint256[] memory tokenBalances) {
        Token[] memory tokens = _tokens[host][id];
        (,, uint256 erc721Count, ) = getTokensCount(host, id);
        addresses = new address[](erc721Count);
        tokenBalances = new uint256[](erc721Count);
        uint256 j = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            Token memory token = tokens[i];
            if (token.tokenType == _TOKEN_TYPE_ERC721) {
                addresses[j] = token.tokenAddress;
                tokenBalances[j] = _erc721ERC1155TokenIds[host][id][token.tokenAddress].length;
                j++;
            }
        }
    }

    /**
     * @dev Gets ERC721 or ERC1155 IDs
     */
    function getERC721ERC1155IDs(address host, uint256 id, address token) public view  returns (uint256[] memory) {
        return _erc721ERC1155TokenIds[host][id][token];
    }

    /**
     * @dev Gets ERC1155 token addresses info
     */
    function getERC1155Tokens(address host, uint256 id) public view returns (address[] memory addresses) {
        Token[] memory tokens = _tokens[host][id];
        (,,, uint256 erc1155Count) = getTokensCount(host, id);

        addresses = new address[](erc1155Count);
        uint256 j = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            Token memory token = tokens[i];
            if (token.tokenType == _TOKEN_TYPE_ERC1155) {
                addresses[j] = token.tokenAddress;
                j++;
            }
        }
    }

    /**
     * @dev Gets ERC1155 token balances by IDs
     */
    function getERC1155TokenBalances(address host, uint256 id, address token, uint256[] memory tokenIds)
    public view returns (uint256[] memory tokenBalances) {
        tokenBalances = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenBalances[i] = _erc1155TokenBalances[host][id][token][tokenIds[i]];
        }
    }

    /**
     * @dev Deposits BEP20 tokens into wallet.
     */
    function depositBEP20(address host, uint256 id, address[] memory tokens, uint256[] memory amounts) external {
        _exists(host, id);
        require(tokens.length > 0 && tokens.length == amounts.length, "MagicLampWallet::depositBEP20: invalid parameters");

        for (uint256 i = 0; i < tokens.length; i++) {
            IBEP20 token = IBEP20(tokens[i]);
            uint256 prevBalance = token.balanceOf(address(this));
            token.transferFrom(_msgSender(), address(this), amounts[i]);
            uint256 receivedAmount = token.balanceOf(address(this)).sub(prevBalance);
            _addBEP20TokenBalance(host, id, tokens[i], receivedAmount);

            emit MagicLampWalletBEP20Deposited(_msgSender(), host, id, tokens[i], receivedAmount);
        }
    }

    /**
     * @dev Withdraws BEP20 tokens from wallet.
     */
    function withdrawBEP20(address host, uint256 id, address[] memory tokens, uint256[] memory amounts)
    public  {
        _onlyWalletOwnerOrHost(host, id);
        _unlocked(host, id);
        require(tokens.length > 0 && tokens.length == amounts.length, "MagicLampWallet::withdrawBEP20: invalid parameters");

        address to = IERC721(host).ownerOf(id);

        for (uint256 i = 0; i < tokens.length; i++) {
            IBEP20 token = IBEP20(tokens[i]);
            token.transfer(to, amounts[i]);
            _subBEP20TokenBalance(host, id, tokens[i], amounts[i]);

            emit MagicLampWalletBEP20Withdrawn(_msgSender(), host, id, tokens[i], amounts[i], to);
        }
    }

    /**
     * @dev Transfers BEP20 tokens from wallet into another wallet.
     */
    function transferBEP20(address fromHost, uint256 fromId, address token, uint256 amount, address toHost, uint256 toId)
    public  {
        _onlyWalletOwner(fromHost, fromId);
        _unlocked(fromHost, fromId);
        _exists(toHost, toId);
        require(fromHost != toHost || fromId != toId, "MagicLampWallet::transferBEP20: same wallet");
        
        _subBEP20TokenBalance(fromHost, fromId, token, amount);
        _addBEP20TokenBalance(toHost, toId, token, amount);

        emit MagicLampWalletBEP20Transferred(_msgSender(), fromHost, fromId, token, amount, toHost, toId);
    }

    /**
     * @dev Deposits ERC721 tokens into wallet.
     */
    function depositERC721(address host, uint256 id, address token, uint256[] memory tokenIds) external  {
        _exists(host, id);

        IERC721 iToken = IERC721(token);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(token != host || tokenIds[i] != id, "MagicLampWallet::depositERC721: self deposit");

            iToken.safeTransferFrom(_msgSender(), address(this), tokenIds[i]);
            _putTokenId(host, id, _TOKEN_TYPE_ERC721, token, tokenIds[i]);

            emit MagicLampWalletERC721Deposited(_msgSender(), host, id, token, tokenIds[i]);
        }
    }

    /**
     * @dev Withdraws ERC721 token from wallet.
     */
    function withdrawERC721(address host, uint256 id, address token, uint256[] memory tokenIds)
    public {
        _onlyWalletOwnerOrHost(host, id);
        _unlocked(host, id);
        
        IERC721 iToken = IERC721(token);
        address to = IERC721(host).ownerOf(id);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            iToken.safeTransferFrom(address(this), to, tokenIds[i]);
            _popTokenId(host, id, _TOKEN_TYPE_ERC721, token, tokenIds[i]);

            emit MagicLampWalletERC721Withdrawn(_msgSender(), host, id, token, tokenIds[i], to);
        }
    }

    /**
     * @dev Transfers ERC721 tokens from wallet to another wallet.
     */
    function transferERC721(address fromHost, uint256 fromId, address token, uint256[] memory tokenIds, address toHost, uint256 toId) 
    public {
        _onlyWalletOwner(fromHost, fromId);
        _unlocked(fromHost, fromId);
        _exists(toHost, toId);
        require(fromHost != toHost || fromId != toId, "MagicLampWallet::transferERC721: same wallet");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _popTokenId(fromHost, fromId, _TOKEN_TYPE_ERC721, token, tokenIds[i]);
            _putTokenId(toHost, toId, _TOKEN_TYPE_ERC721, token, tokenIds[i]);

            emit MagicLampWalletERC721Transferred(_msgSender(), fromHost, fromId, token, tokenIds[i], toHost, toId);
        }
    }

    /**
     * @dev Deposits ERC1155 token into wallet.
     */
    function depositERC1155(address host, uint256 id, address token, uint256[] memory tokenIds, uint256[] memory amounts) 
    external {
        _exists(host, id);
        IERC1155 iToken = IERC1155(token);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            iToken.safeTransferFrom(_msgSender(), address(this), tokenIds[i], amounts[i], bytes(""));
            _addERC1155TokenBalance(host, id, token, tokenIds[i], amounts[i]);

            emit MagicLampWalletERC1155Deposited(_msgSender(), host, id, token, tokenIds[i], amounts[i]);
        }
    }

    /**
     * @dev Withdraws ERC1155 token from wallet.
     */
    function withdrawERC1155(address host, uint256 id, address token, uint256[] memory tokenIds, uint256[] memory amounts)
    public {
        _onlyWalletOwnerOrHost(host, id);
        _unlocked(host, id);
        IERC1155 iToken = IERC1155(token);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];
            address to = IERC721(host).ownerOf(id);
            iToken.safeTransferFrom(address(this), to, tokenId, amount, bytes(""));            
            _subERC1155TokenBalance(host, id, token, tokenId, amount);

            emit MagicLampWalletERC1155Withdrawn(_msgSender(), host, id, token, tokenId, amount, to);
        }
    }

    /**
     * @dev Transfers ERC1155 token from wallet to another wallet.
     */
    function transferERC1155(address fromHost, uint256 fromId, address token, uint256[] memory tokenIds, uint256[] memory amounts, address toHost, uint256 toId)
    public {
        _onlyWalletOwner(fromHost, fromId);
        _unlocked(fromHost, fromId); 
        require(fromHost != toHost || fromId != toId, "MagicLampWallet::transferERC1155: same wallet");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];
            _subERC1155TokenBalance(fromHost, fromId, token, tokenId, amount);
            _addERC1155TokenBalance(toHost, toId, token, tokenId, amount);

            emit MagicLampWalletERC1155Transferred(_msgSender(), fromHost, fromId, token, tokenId, amount, toHost, toId);
        }
    }

    /**
     * @dev Withdraws all of tokens from wallet.
     */
    function withdrawAll(address host, uint256 id) external {
        uint256 bnb = getBNB(host, id);
        if (bnb > 0) {
            withdrawBNB(host, id, bnb);
        }

        (address[] memory bep20Addresses, uint256[] memory bep20Balances) = getBEP20Tokens(host, id);
        if (bep20Addresses.length > 0) {
            withdrawBEP20(host, id, bep20Addresses, bep20Balances);
        }

        (address[] memory erc721Addresses, ) = getERC721Tokens(host, id);
        for (uint256 a = 0; a < erc721Addresses.length; a++) {
            uint256[] memory ids = _erc721ERC1155TokenIds[host][id][erc721Addresses[a]];
            withdrawERC721(host, id, erc721Addresses[a], ids);
        }

        address[] memory erc1155Addresses = getERC1155Tokens(host, id);
        for (uint256 a = 0; a < erc1155Addresses.length; a++) {
            uint256[] memory ids = _erc721ERC1155TokenIds[host][id][erc1155Addresses[a]];
            uint256[] memory tokenBalances = getERC1155TokenBalances(host, id, erc1155Addresses[a], ids);
            withdrawERC1155(host, id, erc1155Addresses[a], ids, tokenBalances);
        }
    }

    /**
     * @dev Transfers all of tokens to another wallet.
     */
    function transferAll(address fromHost, uint256 fromId, address toHost, uint256 toId) external {
        uint256 bnb = getBNB(fromHost, fromId);
        if (bnb > 0) {
            transferBNB(fromHost, fromId, bnb, toHost, toId);
        }

        (address[] memory bep20Addresses, uint256[] memory bep20Balances ) = getBEP20Tokens(fromHost, fromId);
        for(uint256 i = 0; i < bep20Addresses.length; i++){
            transferBEP20(fromHost, fromId, bep20Addresses[i], bep20Balances[i], toHost, toId);
        }

        (address[] memory erc721Addresses, ) = getERC721Tokens(fromHost, fromId);
        for (uint256 a = 0; a < erc721Addresses.length; a++) {
            uint256[] memory ids = getERC721ERC1155IDs(fromHost, fromId, erc721Addresses[a]);
            transferERC721(fromHost, fromId, erc721Addresses[a], ids, toHost, toId);
        }

        address[] memory erc1155Addresses = getERC1155Tokens(fromHost, fromId);
        for (uint256 a = 0; a < erc1155Addresses.length; a++) {
            uint256[] memory ids = getERC721ERC1155IDs(fromHost, fromId, erc1155Addresses[a]);
            uint256[] memory tokenBalances = getERC1155TokenBalances(fromHost, fromId, erc1155Addresses[a], ids);
            transferERC1155(fromHost, fromId, erc1155Addresses[a], ids, tokenBalances, toHost, toId);
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure override returns (bytes4) {
        return 0xf23a6e61;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure override returns (bytes4) {
        return 0xbc197c81;
    }
}
