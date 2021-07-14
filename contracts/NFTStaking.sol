// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC721.sol";
import "./SafeMath.sol";
import "./Ownable.sol";
import "./Address.sol";
import "./ReentrancyGuard.sol";
import "./IALDN.sol";

contract NFTStaking is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using SafeMath for uint128;
    using Address for address;

    uint256 private _startedStakeTime;
    uint256 private _stakedPeriod = 2 * 365 days;
    uint256 private _totalStakedAmount;

    uint16[100] _multipliers;

    uint128 private constant MIN_LOCK_DURATION = uint128(4);
    uint128 private constant MAX_LOCK_DURATION = uint128(104);

    address public _aldnToken;
    address public _magicLamp;

    struct StakeInfo {
        uint256 id;
        uint256 stakedTime;
        uint128 lockWeek;
    }

    mapping(address => StakeInfo[]) public _stakers;

    event Staked(address indexed user, uint256 tokenId);
    event Withdraw(address indexed user, uint256 tokenId, uint256 amount);

    constructor() {}

    function setMultipliers(uint16[] memory multipliers) public onlyOwner {
        require(multipliers.length == 100);
        for (uint16 i; i < multipliers.length; i++) {
            _multipliers[i] = multipliers[i];
        }
        _startedStakeTime = block.timestamp;
    }

    function setMagicLampAddress(address magicLampAddress) public onlyOwner {
        _magicLamp = magicLampAddress;
    }

    function setTokenAddress(address tokenAddress) public onlyOwner {
        _aldnToken = tokenAddress;
    }

    function getPeriod(uint256 from, uint256 to) public pure returns (uint256) {
        return to.sub(from);
    }

    function calcMultiplier(uint256 numOfWeeks) public view returns (uint256) {
        if (numOfWeeks < 4) {
            return 0;
        } else if (numOfWeeks >= 104) {
            return 300;
        } else {
            return uint256(_multipliers[numOfWeeks - 4]);
        }
    }

    function getALDNPerBlockForReward() public view returns (uint256) {
        if (_totalStakedAmount == 0) {
            return 0;
        } else {
            return
                IALDN(_aldnToken)
                    .balanceOf(address(this))
                    .mul(1 ether)
                    .div(_totalStakedAmount)
                    .div(_stakedPeriod);
        }
    }

    function getStakedAmount(address account, uint256 index)
        private
        view
        returns (uint256)
    {
        StakeInfo[] memory staker = _stakers[account];
        return calcMultiplier(staker[index].lockWeek);
    }

    function getReward(address account, uint256 index)
        public
        view
        returns (uint256, uint256)
    {
        StakeInfo[] memory staker = _stakers[account];
        uint256 stakedPeriod =
            getPeriod(staker[index].stakedTime, block.timestamp);

        if (block.timestamp >= _startedStakeTime.add(_stakedPeriod)) {
            stakedPeriod = getPeriod(
                staker[index].stakedTime,
                _startedStakeTime.add(_stakedPeriod)
            );
        }

        if (getStakedAmount(account, index) <= 0 || stakedPeriod <= 0) {
            return (0, 0);
        }

        uint256 rewardPerblock = getALDNPerBlockForReward();

        uint256 reward =
            rewardPerblock
                .mul(getStakedAmount(account, index))
                .mul(stakedPeriod)
                .div(1 ether);

        if (
            stakedPeriod > uint256(staker[index].lockWeek).mul(1 weeks) ||
            block.timestamp >= _startedStakeTime.add(_stakedPeriod)
        ) {
            return (reward, 0);
        } else {
            return (0, reward);
        }
    }

    function getReward(address account)
        external
        view
        returns (uint256 available, uint256 pending)
    {
        StakeInfo[] memory staker = _stakers[account];
        for (uint256 i; i < staker.length; i++) {
            (uint256 available1, uint256 pending1) = getReward(account, i);
            available = available.add(available1);
            pending = pending.add(pending1);
        }
    }

    function stake(uint256 tokenId, uint128 lockWeek) public nonReentrant {
        require(!_msgSender().isContract(), "Stake: Could not be contract.");
        require(
            lockWeek >= MIN_LOCK_DURATION && lockWeek <= MAX_LOCK_DURATION,
            "Stake: Invalid lock duration"
        );
        address allowanceAddress = IERC721(_magicLamp).getApproved(tokenId);
        require(
            allowanceAddress == address(this),
            "Stake: Token is not approved."
        );
        StakeInfo[] storage staker = _stakers[_msgSender()];
        IERC721(_magicLamp).transferFrom(_msgSender(), address(this), tokenId);
        staker.push(
            StakeInfo({
                id: tokenId,
                stakedTime: block.timestamp,
                lockWeek: lockWeek
            })
        );
        _totalStakedAmount = _totalStakedAmount.add(calcMultiplier(lockWeek));
        emit Staked(_msgSender(), tokenId);
    }

    function withdraw(uint256 index) public nonReentrant {
        require(!_msgSender().isContract(), "Stake: Could not be contract.");

        StakeInfo[] storage staker = _stakers[_msgSender()];
        require(staker.length > index && index >= 0, "Stake: Invalid index.");

        uint256 tokenId = staker[index].id;
        IERC721(_magicLamp).approve(_msgSender(), tokenId);
        IERC721(_magicLamp).transferFrom(address(this), _msgSender(), tokenId);

        uint256 stakedAmount = getStakedAmount(_msgSender(), index);
        _totalStakedAmount = _totalStakedAmount.sub(stakedAmount);

        (uint256 available, uint256 pending) = getReward(_msgSender(), index);

        uint256 multiplier = calcMultiplier(staker[index].lockWeek);

        delete staker[index];

        if (multiplier != 0) {
            available = available.add(pending.div(multiplier));
            pending = pending.sub(pending.div(multiplier));
        }

        //IALDN(_aldnToken).burn(pending);
        IALDN(_aldnToken).transfer(_msgSender(), available);

        emit Withdraw(_msgSender(), tokenId, available);
    }
}