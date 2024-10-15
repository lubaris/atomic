// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract RewardPoolV2 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    IERC20 public rewardToken;

    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");

    function  initialize(address _rewardToken) external initializer {
        rewardToken = IERC20(_rewardToken);
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function withdrawTokensPool(address to, uint amount) external onlyRole(WITHDRAW_ROLE) {
        rewardToken.transfer(to, amount);
    }

    function setRewardToken(address _rewardToken) external  onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardToken = IERC20(_rewardToken);
    }

    function getRewardToken() external view  returns(IERC20) {
        return  rewardToken;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

}