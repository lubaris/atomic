// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// imports
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// libraries
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPool {
    function withdrawTokensPool(address to, uint amount) external;
}
interface IERC20Decimals is IERC20 {
    function decimals() external view returns (uint8);
}

contract AWCstakingV1 is Initializable,  OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable { 
    using SafeERC20 for IERC20Decimals;

    struct UserInfo {
        uint256 amount; // amount stake Atomic
        uint256 lastRewardTime; // last timestamp  reward
        uint256 freezeAtomic; // amount  freeze Atomic
        uint256 endFreeze; // end time freeze
        uint256 debt;// contract debt to user
        bool isRewardStake;//can user get reward
    }
    // address of rewardPool contract
    IPool public pool; 
    // The AWC Token
    IERC20Decimals public atomicToken; 
    // amount reward per second. (_percentReward(2000 = 20%) * 10**14 / 365 days in seconds) = rewardPerSecond
    uint256 public rewardPerSecond; 
    // min AWC Token for stake
    uint256 public minStakeAmount; 
    // Info of each user that stakes AWC tokens.
    mapping (address => UserInfo) public userInfo;

    event Deposit(address indexed user,  uint256 amount);
    event Withdraw(address indexed user,  uint256 amount);
    event LogPercentReward(uint256 percentReward);

    function  initialize(IERC20Decimals _atomic, uint256 _percentReward, IPool _pool) external initializer {
        atomicToken = _atomic;
        rewardPerSecond = (_percentReward*1e6*10**uint256(atomicToken.decimals()))/365 days;
        pool  = _pool;
        minStakeAmount = 50*10**uint256(atomicToken.decimals());
        __Ownable_init();
        __ReentrancyGuard_init();
    }

    /// @notice Sets the Reward per second to be distributed. Can only be called by the owner.
    /// @param _percentReward The percent of AWC to be distributed. _percentReward(2000 = 20%)
    function setRewardPerSecond(uint256 _percentReward) external onlyOwner {
        require(_percentReward <= 10000, 'setRewardPerSecond: percentReward is too high');
        rewardPerSecond = (_percentReward * 1e6 * 10**uint256(atomicToken.decimals())) / 365 days;
        emit LogPercentReward(_percentReward);
    }
    /// @notice Sets min stake amount. Can only be called by the owner.
    /// @param _minStakeAmount  min AWC Token for stake
    function setMinStakeAmount(uint256 _minStakeAmount) external onlyOwner {
       minStakeAmount = _minStakeAmount;
    }
    

    /// @notice View function to see pending Reward.
    /// @param _user Address of user.
    /// @return pendingReward Atomic reward for a given user.
    function getPendingReward(address _user) external view returns (uint256 pendingReward) {
        UserInfo storage user = userInfo[_user];
        pendingReward = (user.amount  * (block.timestamp - user.lastRewardTime) * rewardPerSecond) / 1e18;
    }

    /// @notice get Reward.
    function claimReward() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        if (user.isRewardStake) {
            uint256 pendingReward = (user.amount  * (block.timestamp - user.lastRewardTime) * rewardPerSecond) / 1e18;
            pool.withdrawTokensPool(msg.sender, pendingReward);
        }
        if(user.amount <= minStakeAmount) {
            user.isRewardStake = false;
        } else {
            user.isRewardStake = true;
        }
        user.lastRewardTime = block.timestamp;    
    }

    /// @notice Deposit AWC tokens  for AWC allocation. Can also get a reward.
    /// @param amount AWC amount to deposit.
    function stake(uint256 amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(minStakeAmount <= amount, "deposit: amount is too low");
        if (user.isRewardStake) {
            uint256 pendingReward = (user.amount  * (block.timestamp - user.lastRewardTime) * rewardPerSecond) / 1e18;
            pool.withdrawTokensPool(msg.sender, pendingReward);
        }
        user.lastRewardTime = block.timestamp;
        user.amount += amount;
        user.isRewardStake = true;
        atomicToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }
    
    /// @notice get a reward and Deposit AWC tokens.
    function restake() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.isRewardStake, "restake: user stake is not reward");
        uint256 pendingReward = (user.amount  * (block.timestamp - user.lastRewardTime) * rewardPerSecond) / 1e18;
        user.amount += pendingReward;
        pool.withdrawTokensPool(address(this), pendingReward);
        user.lastRewardTime = block.timestamp;
        emit Deposit(msg.sender, pendingReward);
    }
 
    /// @notice the all AWC token for withdrawal with a 10 days delay, can also get a reward.
    /// @param amount AWC token amount to withdraw.
    function unstake(uint256 amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "withdraw: amount is too large");
        require(user.endFreeze <= block.timestamp, "withdraw: freeze time not end");
        if (user.isRewardStake) {
            uint256 pendingReward = (user.amount  * (block.timestamp - user.lastRewardTime) * rewardPerSecond) / 1e18;
            if(pendingReward + user.debt  >= atomicToken.balanceOf(address(pool))) {
                user.debt += pendingReward;
            } else {
                pool.withdrawTokensPool(msg.sender, pendingReward + user.debt);
                user.debt = 0;
            }
        }
        user.lastRewardTime = block.timestamp;
        user.amount -= amount;
        user.freezeAtomic += amount;
        user.endFreeze = block.timestamp + 10 days;
        if(user.amount <= minStakeAmount) {
            user.isRewardStake = false;
        }  else {
            user.isRewardStake = true;
        }
        emit Withdraw(msg.sender, amount);
    }

    /// @notice get freezeAtomic after 10 days delay.
    function getFreezeAtomic() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.endFreeze <= block.timestamp, "getFreezeAtomic: freeze time not end");
        uint256 amount = user.freezeAtomic;
        user.freezeAtomic = 0;
        if(user.debt != 0 && user.debt <= atomicToken.balanceOf(address(pool))) {
            pool.withdrawTokensPool(msg.sender, user.debt);
            user.debt = 0;
        }
        atomicToken.safeTransfer(msg.sender, amount);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

}