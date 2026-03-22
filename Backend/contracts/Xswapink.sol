// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Xswapink
 * @dev Custom DEX/Bridge contract that wraps Rubic aggregator functionality.
 */
contract Xswapink is Ownable {
    
    event SwapExecuted(address indexed user, address srcToken, address dstToken, uint256 amount);
    event BridgeExecuted(address indexed user, address srcToken, uint256 amount, uint256 dstChainId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Simple swap function that routes through Rubic Proxy/Router.
     * In a full implementation, this would interact with Rubic's MultiProxy.
     */
    function swap(
        address _router,
        address _srcToken,
        uint256 _amount,
        bytes calldata _data
    ) external payable {
        if (_srcToken != address(0)) {
            IERC20(_srcToken).transferFrom(msg.sender, address(this), _amount);
            IERC20(_srcToken).approve(_router, _amount);
        }

        (bool success, ) = _router.call{value: msg.value}(_data);
        require(success, "Xswapink: Swap failed");

        emit SwapExecuted(msg.sender, _srcToken, address(0), _amount); // dstToken info from data
    }

    /**
     * @dev Bridge function for cross-chain transactions.
     */
    function bridge(
        address _bridgeContract,
        address _srcToken,
        uint256 _amount,
        uint256 _dstChainId,
        bytes calldata _data
    ) external payable {
        if (_srcToken != address(0)) {
            IERC20(_srcToken).transferFrom(msg.sender, address(this), _amount);
            IERC20(_srcToken).approve(_bridgeContract, _amount);
        }

        (bool success, ) = _bridgeContract.call{value: msg.value}(_data);
        require(success, "Xswapink: Bridge failed");

        emit BridgeExecuted(msg.sender, _srcToken, _amount, _dstChainId);
    }

    /**
     * @dev Recover any stuck tokens or fees.
     */
    function withdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            IERC20(_token).transfer(owner(), _amount);
        }
    }

    receive() external payable {}
}
