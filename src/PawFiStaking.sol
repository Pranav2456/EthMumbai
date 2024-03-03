// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @notice PawFi Staking Contract
/// @author 0xhohenheim <contact@0xhohenheim.com>
contract PawFiStaking is ReentrancyGuard, Pausable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    /// @dev Reward Token
    IERC20 public rToken;
    /// @dev Staking Token
    IERC20 public sToken;
    uint256 public endTime;
    uint256 public rewardRate;
    uint256 public duration;
    uint256 public prevUpdateTimestamp;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;
    uint256 public cap;
    mapping(address => uint256) public userRewardPerToken;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) private _userBalances;

    event RewardInitiated(uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event WithdrawStaked(address indexed user, uint256 amount);
    event WithdrawReward(address indexed user, uint256 amount);
    event DurationUpdated(uint256 duration);
    event CapUpdated(uint256 cap);

    /// @param _rToken address of reward token
    /// @param _sToken address of staking token
    /// @param _rewardsDuration duration of reward distribution (in days)
    /// @param _cap limit of total tokens that can be staked
    constructor(
        IERC20 _rToken,
        IERC20 _sToken,
        uint256 _rewardsDuration,
        uint256 _cap
    ) {
        require(
            _rewardsDuration > 0,
            "PawFiStaking: Duration must be greater 0"
        );
        rToken = _rToken;
        sToken = _sToken;
        duration = _rewardsDuration.mul(1 days);
        cap = _cap;
    }

    /// @notice Stake Tokens
    /// @dev requires token amount approval
    /// @param amount amount of tokens to stake
    function stake(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0, "PawFiStaking: Cannot stake 0");
        require((totalStaked + amount) <= cap, "PawFiStaking: Cap reached");
        totalStaked = totalStaked.add(amount);
        _userBalances[msg.sender] = _userBalances[msg.sender].add(amount);
        sToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraw Staked Tokens
    /// @param amount amount of staked tokens to withdraw
    function withdraw(uint256 amount)
        public
        virtual
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        require(
            block.timestamp >= endTime,
            "PawFiStaking: Staking period hasn't ended"
        );
        require(amount > 0, "Cannot withdraw 0");
        totalStaked = totalStaked.sub(amount);
        _userBalances[msg.sender] = _userBalances[msg.sender].sub(amount);
        sToken.safeTransfer(msg.sender, amount);
        emit WithdrawStaked(msg.sender, amount);
    }

    /// @notice Withdraw Rewards
    function getReward()
        public
        virtual
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        require(
            block.timestamp >= endTime,
            "PawFiStaking: Staking period hasn't ended"
        );
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rToken.safeTransfer(msg.sender, reward);
            emit WithdrawReward(msg.sender, reward);
        }
    }

    /// @notice Withdraw Staked + Reward Tokens
    function exit() public virtual whenNotPaused {
        withdraw(_userBalances[msg.sender]);
        getReward();
    }

    /// @notice Initiate Staking
    /// @dev requires reward token approval
    /// @dev Ensure the provided reward amount is not more than the balance in the contract.
    /// @dev This keeps the reward rate in the right range, preventing overflows due to
    /// @dev very high values of rewardRate in the earned and rewardsPerToken functions;
    /// @dev Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
    /// @param reward total amount of tokens to reward
    function initiateStaking(uint256 reward)
        external
        onlyOwner
        updateReward(address(0))
    {
        rToken.transferFrom(msg.sender, address(this), reward);
        if (block.timestamp >= endTime) {
            rewardRate = reward.div(duration);
        } else {
            uint256 remaining = endTime.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(duration);
        }
        uint256 balance = rToken.balanceOf(address(this));
        require(
            rewardRate <= balance.div(duration),
            "PawFiStaking: Reward too high"
        );

        prevUpdateTimestamp = block.timestamp;
        endTime = block.timestamp.add(duration);
        emit RewardInitiated(reward);
    }

    /// @notice Withdraw any ERC20 from contract
    /// @dev callable by owner
    /// @param tokenAddress address of ERC20 to wthdraw
    /// @param tokenAmount amount of ERC20 to withdraw
    function withdrawERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    /// @notice Reset the Rewards Duration after previous period has ended
    /// @dev HIGHLY RISKY
    /// @dev please read dev notes of initiateStaking to understand the risks
    /// @param _rewardsDuration duration of reward distribution (in days)
    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            endTime == 0 || block.timestamp > endTime,
            "PawFiStaking: Previous staking period hasn't ended yet"
        );
        duration = _rewardsDuration.mul(1 days);
        emit DurationUpdated(duration);
    }

    /// @notice Update the total staking cap
    /// @dev HIGHLY RISKY - will affect rewards distributed 
    /// @dev callable by owner
    /// @param _cap limit of total tokens that can be staked
    function setCap(uint256 _cap) external onlyOwner {
        cap = _cap;
        emit CapUpdated(_cap);
    }

    /// @notice Disable all public functions
    /// @dev callable by owner
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Enable all public functions
    /// @dev callable by owner
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Amount staked by user
    /// @param account address of user
    function balanceOf(address account) external view returns (uint256) {
        return _userBalances[account];
    }

    /// @notice End timestamp
    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, endTime);
    }

    /// @notice Reward to be received per token staked
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable()
                    .sub(prevUpdateTimestamp)
                    .mul(rewardRate)
                    .mul(1e18)
                    .div(totalStaked)
            );
    }

    /// @notice Rewards earned by user
    /// @param account address of user
    function earned(address account) public view returns (uint256) {
        return
            _userBalances[account]
                .mul(rewardPerToken().sub(userRewardPerToken[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    /// @notice Rewards for the current set duration
    function getRewardForDuration() external view returns (uint256) {
        return rewardRate.mul(duration);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        prevUpdateTimestamp = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerToken[account] = rewardPerTokenStored;
        }
        _;
    }
}
