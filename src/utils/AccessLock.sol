// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

error Unauthorized();
error UserBlacklisted();

/// @title Access Lock
/// @notice Provides Admin Access Control
contract AccessLock is Ownable, Pausable {
    mapping(address => bool) public isAdmin; // user => isAdmin? mapping

    /// @notice emitted when admin role is granted or revoked
    event AdminSet(address indexed user, bool isEnabled);

    /// @notice Grant or Revoke Admin Access
    /// @param user - Address of User
    /// @param isEnabled - Grant or Revoke?
    function setAdmin(address user, bool isEnabled) external onlyOwner {
        isAdmin[user] = isEnabled;
        emit AdminSet(user, isEnabled);
    }

    /// @notice Pause contract functions
    /// @dev Callable by Admin/Owner
    function pause() external onlyAdmin {
        _pause();
    }

    /// @notice Unpause/Resume contract functions
    /// @dev Callable by Admin/Owner
    function unpause() external onlyAdmin {
        _unpause();
    }

    /// @notice reverts if caller is not admin or owner
    modifier onlyAdmin() {
        if (!isAdmin[msg.sender] && msg.sender != owner())
            revert Unauthorized();
        _;
    }
}
