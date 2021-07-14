// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ERC721.sol";
import "./IERC721Receiver.sol";
import "./IBEP20.sol";
import "./SafeBEP20.sol";
import "./SafeMath.sol";

contract mGift is IERC721Receiver, ERC721("Magiclamp Gift NFT", "mGift") {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint256;
    uint256 public totalSupply;
    struct Gift {
        address tokenAddress;
        uint256 amount;
        uint256[] NFTIds;
        uint256 tip;
        uint256 start;
        uint256 duration;
        string name;
        string message;
        string url;
        bool isNFT;
    }
    mapping(uint256 => Gift) public gifts;
    event GiftMinted(address indexed from, address indexed to, uint256 indexed tokenId, uint256 unlocksAt, bool isNFTToken);
    event Tip(address indexed tipper, uint256 indexed tokenId, address token, uint256 amount,  string message);
    event TipNFT(address indexed tipper, uint256 indexed tokenId, address token, uint256 amoun, uint256[] NFTIds,  string message);
    event Collected(address indexed collector, uint256 indexed tokenId, address token, uint256 amount);
    event CollectedNFT(address indexed collector, uint256 indexed tokenId, address token, uint256 amount, uint256 NFTId);
    // for BEP20 as Gift 
    function mint(address _to,
                  address _tokenAddress,
                  uint256 _amount,
                  uint256 _start,
                  uint256 _duration,
                  string calldata _name,
                  string calldata _msg,
                  string calldata _url) external {
        gifts[totalSupply].tokenAddress = _tokenAddress;
        gifts[totalSupply].amount = _amount;
        gifts[totalSupply].tip = 0;
        gifts[totalSupply].start = _start;
        gifts[totalSupply].duration = _duration;
        gifts[totalSupply].name = _name;
        gifts[totalSupply].message = _msg;
        gifts[totalSupply].url = _url;
        gifts[totalSupply].isNFT = false;
        _safeMint(_to, totalSupply);
        totalSupply = totalSupply.add(1);
        IBEP20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        emit GiftMinted(msg.sender, _to, totalSupply, _start, false);
        emit Tip(msg.sender, totalSupply, _tokenAddress, _amount, _msg);
    }
    
    // for ERC721 as Gift
    function mint(address _to,
                  address _tokenAddress,
                  uint256 _amount,
                  uint256[] memory _NFTIds,
                  uint256 _start,
                  uint256 _duration,
                  string calldata _name,
                  string calldata _msg,
                  string calldata _url) external {
        require(_NFTIds.length == _amount, "Wrong Amount");
        gifts[totalSupply].tokenAddress = _tokenAddress;
        gifts[totalSupply].amount = _amount;
        gifts[totalSupply].NFTIds = _NFTIds;
        gifts[totalSupply].tip = 0;
        gifts[totalSupply].start = _start;
        gifts[totalSupply].duration = _duration;
        gifts[totalSupply].name = _name;
        gifts[totalSupply].message = _msg;
        gifts[totalSupply].url = _url;
        gifts[totalSupply].isNFT = true;
        _safeMint(_to, totalSupply);
        totalSupply = totalSupply.add(1);
        for(uint256 i=0; i < _NFTIds.length; i++) {
            IERC721(_tokenAddress).safeTransferFrom(msg.sender, address(this), _NFTIds[i]);
        }
        emit GiftMinted(msg.sender, _to, totalSupply, _start, true);
        emit TipNFT(msg.sender, totalSupply, _tokenAddress, 0, _NFTIds, _msg);
    }
    function tip(uint256 _tokenId, uint256 _amount, string calldata _msg) external {
        require(_tokenId < totalSupply, "mGift: Token ID does not exist.");
        Gift storage gift = gifts[_tokenId];
        require(gift.isNFT == false, "is NFT Token");
        gift.tip = gift.tip.add(_amount);
        IBEP20(gift.tokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        emit Tip(msg.sender, _tokenId, gift.tokenAddress, _amount, _msg);
    }
    function tip(uint256 _tokenId, uint256[] memory _NFTIds, uint256 _amount, string calldata _msg) external {
        require(_tokenId < totalSupply, "mGift: Token ID does not exist.");
        require(_NFTIds.length == _amount, "Wrong Amount");
        Gift storage gift = gifts[_tokenId];
        require(gift.isNFT == true, "is BEP20 Token");
        gift.tip = _NFTIds.length;
        for(uint256 i=0; i < _NFTIds.length; i++) {
            gift.NFTIds.push(_NFTIds[i]);
            IERC721(gift.tokenAddress).safeTransferFrom(msg.sender, address(this), _NFTIds[i]);
        }
        emit TipNFT(msg.sender, _tokenId, gift.tokenAddress, gift.tip, _NFTIds, _msg);
    }
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    function available(uint256 _amount, uint256 _start, uint256 _duration) public view returns (uint256) {
        if (_start > block.timestamp) return 0;
        if (_duration == 0) return _amount;
        return (_amount.mul(min(block.timestamp - _start, _duration))).div(_duration);
    }
    function collectible(uint256 _tokenId) public view returns (uint256) {
        Gift memory gift = gifts[_tokenId];
        return available(gift.amount, gift.start, gift.duration).add(gift.tip);
    }
    function collect(uint256 _tokenId, uint256 _amount) public {
		require(_isApprovedOrOwner(msg.sender, _tokenId), "yGift: You are not the NFT owner");
		Gift storage gift = gifts[_tokenId];
		require(block.timestamp >= gift.start, "yGift: Rewards still vesting");
		uint256 _available = collectible(_tokenId);
        if (_available == 0) return;
		uint256 _collectAmount = min(_amount, _available);
        uint256 _tips = min(_collectAmount, gift.tip);
        gift.tip = gift.tip.sub(_tips);
        gift.amount = gift.amount.add(_tips).sub(_collectAmount);
        if (gift.isNFT) {
            for (uint256 i=0; i < _collectAmount; i++) {
                uint256 _id = gift.NFTIds.length.sub(1);
                IERC721(gift.tokenAddress).safeTransferFrom(msg.sender, address(this), _id);
                emit CollectedNFT(msg.sender, _tokenId, gift.tokenAddress, _collectAmount, _id);
                gift.NFTIds.pop();
            }
        } else {
            IBEP20(gift.tokenAddress).safeTransfer(msg.sender, _collectAmount);
            emit Collected(msg.sender, _tokenId, gift.tokenAddress, _collectAmount);
        }
	}
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}