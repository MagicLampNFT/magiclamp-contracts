// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SafeMath.sol";
import "./IBEP20.sol";
import "./MagicLampERC721.sol";

/**
 * @title MagicLamps NFT contract
 * @dev Extends MagicLampERC721 Non-Fungible Token Standard basic implementation
 */
contract MagicLamps is MagicLampERC721 {
    using SafeMath for uint256;
    using Address for address;

    // Public variables

    // This is SHA256 hash of the provenance record of all MagicLamp artworks
    // It is derived by hashing every individual NFT's picture, and then concatenating all those hash, deriving yet another SHA256 from that.
    string public constant MAGICLAMPS_PROVENANCE = "";

    // Jun 21, 2021 @ 11:11:01 PM UTC = 1624273861
    uint256 public constant SALE_START_TIMESTAMP = 1623751121;
    // Time after which MagicLamp NFTs are randomized and allotted (after 21 days)
    uint256 public constant REVEAL_TIMESTAMP = SALE_START_TIMESTAMP + (21 days);
    uint256 public constant MAX_MAGICLAMP_SUPPLY = 11451;
    uint256 public constant MAGICLAMP_MINT_COUNT_LIMIT = 50;

    struct Tier {
        uint256 tier;
        uint256 startId;
        uint256 endId;
        uint256 price;
        uint256 aldnReward;
    }

    Tier[] public TIERS;

    uint256 public constant REFERRAL_REWARD_PERCENT = 1000; // 10%
    uint256 public constant PRIZE_FUND_PERCENT = 1000;      // 10%
    uint256 public constant LIQUIDITY_FUND_PERCENT = 1000;  // 10%

    uint256 public startingIndexBlock;
    uint256 public startingIndex;

    // Mapping from token ID to puzzle
    mapping (uint256 => uint256) public puzzles;

    // Referral management
    uint256 public totalReferralRewardAmount;
    uint256 public distributedReferralRewardAmount;
    mapping(address => uint256) public referralRewards;
    mapping(address => mapping(address => bool)) public referralStatus;

    address payable public constant liquidityFundAddress = payable(
        0x917BcA0BB7275F93167425c3e6e61261e6D46D08
    );
    address payable public constant prizeFundAddress = payable(
        0xb81eE7E78acbD8220264D91C067054DD274e5644
    );
    address payable public constant treasuryFundAddress = payable(
        0xBF1aFb3Eaf4895cED2ad492361373433a4C47A2D
    );

    /*
     *     bytes4(keccak256('balanceOf(address)')) == 0x70a08231
     *     bytes4(keccak256('ownerOf(uint256)')) == 0x6352211e
     *     bytes4(keccak256('approve(address,uint256)')) == 0x095ea7b3
     *     bytes4(keccak256('getApproved(uint256)')) == 0x081812fc
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) == 0x23b872dd
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256)')) == 0x42842e0e
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)')) == 0xb88d4fde
     *
     *     => 0x70a08231 ^ 0x6352211e ^ 0x095ea7b3 ^ 0x081812fc ^
     *        0xa22cb465 ^ 0xe985e9c5 ^ 0x23b872dd ^ 0x42842e0e ^ 0xb88d4fde == 0x80ac58cd
     */
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    /*
     *     bytes4(keccak256('name()')) == 0x06fdde03
     *     bytes4(keccak256('symbol()')) == 0x95d89b41
     *     bytes4(keccak256('tokenURI(uint256)')) == 0xc87b56dd
     *
     *     => 0x06fdde03 ^ 0x95d89b41 == 0x93254542
     *     => 0x06fdde03 ^ 0x95d89b41 ^ 0xc87b56dd == 0x5b5e139f
     */
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;

    /*
     *     bytes4(keccak256('totalSupply()')) == 0x18160ddd
     *     bytes4(keccak256('tokenOfOwnerByIndex(address,uint256)')) == 0x2f745c59
     *     bytes4(keccak256('tokenByIndex(uint256)')) == 0x4f6ccce7
     *
     *     => 0x18160ddd ^ 0x2f745c59 ^ 0x4f6ccce7 == 0x780e9d63
     */
    bytes4 private constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;

    // Events
    event DistributeReferralRewards(uint256 indexed magicLampIndex, uint256 amount);
    event EarnReferralReward(address indexed account, uint256 amount);
    event WithdrawFund(uint256 prizeFund, uint256 liquidityFund, uint256 treasuryFund);

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor (string memory name_, string memory symbol_, address aladdin, address genie) MagicLampERC721(name_, symbol_) {
        aladdinToken = aladdin;
        genieToken = genie;

        //////////////  #tier      start id    end id  price(milliether)   ALDN reward amount(ALDN)
        TIERS.push(Tier(1,         0,          1199,      100 * 10**15,    uint256(  564971751412 * 10**9) / 1200));
        TIERS.push(Tier(2,         1200,       3199,      200 * 10**15,    uint256( 1883239171374 * 10**9) / 2000));
        TIERS.push(Tier(3,         3200,       6199,      500 * 10**15,    uint256( 7062146892655 * 10**9) / 3000));
        TIERS.push(Tier(4,         6200,       9199,     1000 * 10**15,    uint256(14124293785310 * 10**9) / 3000));
        TIERS.push(Tier(5,         9200,       11199,    2000 * 10**15,    uint256(18832391713747 * 10**9) / 2000));
        TIERS.push(Tier(6,         11200,      11399,    5000 * 10**15,    uint256( 4708097928436 * 10**9) / 200));
        TIERS.push(Tier(7,         11400,      11449,   10000 * 10**15,    uint256( 2354048964218 * 10**9) / 50));
        TIERS.push(Tier(8,         11450,      11450,  100000 * 10**15,    uint256(  470809792843 * 10**9) / 1));

        // register the supported interfaces to conform to MagiclampsERC721 via ERC165
        _registerInterface(_INTERFACE_ID_ERC721);
        _registerInterface(_INTERFACE_ID_ERC721_METADATA);
        _registerInterface(_INTERFACE_ID_ERC721_ENUMERABLE);
    }

    function _getTier(uint256 magicLampId) internal view returns (uint) {
        for (uint i = 0; i < TIERS.length; i++) {
            if (TIERS[i].startId <= magicLampId && magicLampId <= TIERS[i].endId)
                return i;
        }

        return TIERS.length;
    }

    /**
     * @dev Estimates MagicLamp purchase amount
     */
    function estimateMagicLampPurchaseAmount(uint256 count) public view returns (uint256) {
        require(totalSupply().add(count) <= MAX_MAGICLAMP_SUPPLY, "Exceeds max supply");

        uint256 amount = 0;
        uint256 remainCount = count;

        for (uint256 startId = totalSupply(); remainCount > 0; ) {
            uint tier = _getTier(startId);
            if (tier >= TIERS.length) {
                break;
            }
            uint256 availableCount = TIERS[tier].endId.sub(startId).add(1);
            if (availableCount > remainCount) {
                availableCount = remainCount;
            }
            amount = amount.add(availableCount.mul(TIERS[tier].price));
            remainCount = remainCount.sub(availableCount);
        }

        return amount;
    }

    /**
     * @dev Estimates ALDN(Aladdin) token reward
     */
    function estimateALDNRewardAmount(uint256 count) public view returns (uint256) {
        require(totalSupply().add(count) <= MAX_MAGICLAMP_SUPPLY, "Exceeds max supply");

        uint256 amount = 0;
        uint256 remainCount = count;

        for (uint256 startId = totalSupply(); remainCount > 0; ) {
            uint tier = _getTier(startId);
            if (tier >= TIERS.length) {
                break;
            }
            uint256 availableCount = TIERS[tier].endId.sub(startId).add(1);
            if (availableCount > remainCount) {
                availableCount = remainCount;
            }
            amount = amount.add(availableCount.mul(TIERS[tier].aldnReward));
            remainCount = remainCount.sub(availableCount);
        }

        return amount;
    }

    function mintMagicLamp(uint256 count, address referrer) public payable {
        require(block.timestamp >= SALE_START_TIMESTAMP, "Sale has not started");
        require(totalSupply() < MAX_MAGICLAMP_SUPPLY, "Sale has already ended");
        require(count > 0, "count cannot be 0");
        require(count <= MAGICLAMP_MINT_COUNT_LIMIT, "Exceeds mint count limit");
        require(totalSupply().add(count) <= MAX_MAGICLAMP_SUPPLY, "Exceeds max supply");
        uint256 bnbRefund = estimateMagicLampPurchaseAmount(count);
        require(bnbRefund <= msg.value, "BNB value incorrect");
        bnbRefund = msg.value - bnbRefund;

        IBEP20(aladdinToken).transfer(_msgSender(), estimateALDNRewardAmount(count));

        for (uint256 i = 0; i < count; i++) {
            uint256 mintIndex = totalSupply();
            if (block.timestamp < REVEAL_TIMESTAMP) {
                _mintedBeforeReveal[mintIndex] = true;
            }
            puzzles[mintIndex] = getRandomNumber(type(uint256).min, type(uint256).max.sub(1));
            _safeMint(_msgSender(), mintIndex);
        }

        if (referrer != address(0) && referrer != _msgSender()) {
            _rewardReferral(referrer, _msgSender(), msg.value);
        }

        if (bnbRefund > 0) {
            payable(_msgSender()).transfer(bnbRefund);
        }

        /**
        * Source of randomness. Theoretical miner withhold manipulation possible but should be sufficient in a pragmatic sense
        */
        if (startingIndexBlock == 0 && (totalSupply() == MAX_MAGICLAMP_SUPPLY || block.timestamp >= REVEAL_TIMESTAMP)) {
            startingIndexBlock = block.number;
        }
    }

    /**
     * @dev Finalize starting index
     */
    function finalizeStartingIndex() public virtual {
        require(startingIndex == 0, "Starting index is already set");
        require(startingIndexBlock != 0, "Starting index block must be set");

        startingIndex = uint(blockhash(startingIndexBlock)) % MAX_MAGICLAMP_SUPPLY;
        // Just a sanity case in the worst case if this function is called late (EVM only stores last 256 block hashes)
        if (block.number.sub(startingIndexBlock) > 255) {
            startingIndex = uint(blockhash(block.number-1)) % MAX_MAGICLAMP_SUPPLY;
        }
        // Prevent default sequence
        if (startingIndex == 0) {
            startingIndex = startingIndex.add(1);
        }
    }

    /**
     * @dev Withdraws prize, liquidity and treasury fund.
     */
    function withdrawFund() external {
        uint256 fund = address(this).balance.sub(totalReferralRewardAmount).add(distributedReferralRewardAmount);
        uint256 prizeFund = _percent(fund, PRIZE_FUND_PERCENT);
        prizeFundAddress.transfer(prizeFund);
        uint256 liquidityFund = _percent(fund, LIQUIDITY_FUND_PERCENT);
        liquidityFundAddress.transfer(liquidityFund);
        uint256 treasuryFund = fund.sub(prizeFund).sub(liquidityFund);
        treasuryFundAddress.transfer(treasuryFund);

        emit WithdrawFund(prizeFund, liquidityFund, treasuryFund);
    }

    /**
     * @dev Withdraws free token to treasury, if ALDN after sale ended
     */
    function withdrawFreeToken(address token) public onlyOwner {
        if (token == aladdinToken) {
            require(totalSupply() >= MAX_MAGICLAMP_SUPPLY, "Sale has not ended");
        }
        
        IBEP20(token).transfer(treasuryFundAddress, IBEP20(token).balanceOf(address(this)));
    }

    function _rewardReferral(address referrer, address referee, uint256 referralAmount) internal {
        uint256 referrerBalance = MagicLampERC721.balanceOf(referrer);
        bool status = referralStatus[referrer][referee];
        uint256 rewardAmount = _percent(referralAmount, REFERRAL_REWARD_PERCENT);

        if (referrerBalance != 0 && rewardAmount != 0 && !status) {
            referralRewards[referrer] = referralRewards[referrer].add(rewardAmount);
            totalReferralRewardAmount = totalReferralRewardAmount.add(rewardAmount);
            emit EarnReferralReward(referrer, rewardAmount);
            referralRewards[referee] = referralRewards[referee].add(rewardAmount);
            totalReferralRewardAmount = totalReferralRewardAmount.add(rewardAmount);
            emit EarnReferralReward(referee, rewardAmount);
            referralStatus[referrer][referee] = true;
        }
    }

    function distributeReferralRewards(uint256 startMagicLampId, uint256 endMagicLampId) external onlyOwner {
        require(block.timestamp > SALE_START_TIMESTAMP, "Sale has not started");
        require(startMagicLampId < totalSupply(), "Index is out of range");

        if (endMagicLampId >= totalSupply()) {
            endMagicLampId = totalSupply().sub(1);
        }
        
        for (uint256 i = startMagicLampId; i <= endMagicLampId; i++) {
            address owner = ownerOf(i);
            uint256 amount = referralRewards[owner];
            if (amount > 0) {
                magicLampWallet.depositBNB{ value: amount }(address(this), i, amount);                
                distributedReferralRewardAmount = distributedReferralRewardAmount.add(amount);
                delete referralRewards[owner];
                emit DistributeReferralRewards(i, amount);
            }
        }
    }
}
