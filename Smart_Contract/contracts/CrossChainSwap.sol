// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CrossChainSwap
 * @dev Smart contract for managing cross-chain swap data and transactions
 */
contract CrossChainSwap {
    // Enum for swap status
    enum SwapStatus {
        Initiated,
        Completed,
        Failed,
        Refunded
    }

    // Struct to store swap data
    struct Swap {
        uint256 swapId;
        uint16 fromChain;
        uint16 toChain;
        address userWallet;
        uint96 tokenAmount;
        SwapStatus status;
        uint256 timestamp;
    }

    // State variables
    uint256 private swapCounter;
    mapping(uint256 => Swap) public swaps;
    mapping(address => uint256[]) public userSwaps;

    // Events
    event SwapInitiated(
        address indexed user,
        uint96 amount,
        uint16 fromChain,
        uint16 toChain,
        uint256 timestamp,
        uint256 swapId
    );

    event SwapCompleted(
        address indexed user,
        uint256 indexed swapId,
        uint256 timestamp
    );

    event SwapFailed(
        address indexed user,
        uint256 indexed swapId,
        string reason,
        uint256 timestamp
    );

    event SwapRefunded(
        address indexed user,
        uint256 indexed swapId,
        uint96 amount,
        uint256 timestamp
    );

    // Modifiers
    modifier swapExists(uint256 _swapId) {
        require(_swapId < swapCounter, "Swap does not exist");
        _;
    }

    modifier onlySwapOwner(uint256 _swapId) {
        require(
            swaps[_swapId].userWallet == msg.sender,
            "Not the swap owner"
        );
        _;
    }

    /**
     * @dev Initialize a new cross-chain swap
     * @param _fromChain Source chain ID
     * @param _toChain Destination chain ID
     * @param _tokenAmount Amount of tokens to swap
     * @return swapId The ID of the newly created swap
     */
    function initiateSwap(
        uint16 _fromChain,
        uint16 _toChain,
        uint96 _tokenAmount
    ) external returns (uint256) {
        require(_tokenAmount > 0, "Amount must be greater than 0");
        require(_fromChain != _toChain, "Cannot swap to same chain");

        uint256 newSwapId = swapCounter;
        swapCounter++;

        Swap memory newSwap = Swap({
            swapId: newSwapId,
            fromChain: _fromChain,
            toChain: _toChain,
            userWallet: msg.sender,
            tokenAmount: _tokenAmount,
            status: SwapStatus.Initiated,
            timestamp: block.timestamp
        });

        swaps[newSwapId] = newSwap;
        userSwaps[msg.sender].push(newSwapId);

        emit SwapInitiated(
            msg.sender,
            _tokenAmount,
            _fromChain,
            _toChain,
            block.timestamp,
            newSwapId
        );

        return newSwapId;
    }

    /**
     * @dev Mark a swap as completed
     * @param _swapId ID of the swap to complete
     */
    function completeSwap(uint256 _swapId)
        external
        swapExists(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(
            swap.status == SwapStatus.Initiated,
            "Swap is not in Initiated status"
        );

        swap.status = SwapStatus.Completed;

        emit SwapCompleted(swap.userWallet, _swapId, block.timestamp);
    }

    /**
     * @dev Mark a swap as failed
     * @param _swapId ID of the swap that failed
     * @param _reason Reason for the failure
     */
    function failSwap(uint256 _swapId, string memory _reason)
        external
        swapExists(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(
            swap.status == SwapStatus.Initiated,
            "Swap is not in Initiated status"
        );

        swap.status = SwapStatus.Failed;

        emit SwapFailed(swap.userWallet, _swapId, _reason, block.timestamp);
    }

    /**
     * @dev Refund a failed swap
     * @param _swapId ID of the swap to refund
     */
    function refundSwap(uint256 _swapId)
        external
        swapExists(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(
            swap.status == SwapStatus.Failed,
            "Swap must be in Failed status to refund"
        );

        swap.status = SwapStatus.Refunded;

        emit SwapRefunded(
            swap.userWallet,
            _swapId,
            swap.tokenAmount,
            block.timestamp
        );
    }

    /**
     * @dev Get swap details by ID
     * @param _swapId ID of the swap
     * @return Swap struct containing all swap details
     */
    function getSwap(uint256 _swapId)
        external
        view
        swapExists(_swapId)
        returns (Swap memory)
    {
        return swaps[_swapId];
    }

    /**
     * @dev Get all swap IDs for a specific user
     * @param _user Address of the user
     * @return Array of swap IDs
     */
    function getUserSwaps(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userSwaps[_user];
    }

    /**
     * @dev Get the current swap counter (total number of swaps)
     * @return Current swap counter value
     */
    function getSwapCounter() external view returns (uint256) {
        return swapCounter;
    }

    /**
     * @dev Get swap status as a string
     * @param _swapId ID of the swap
     * @return Status as a string
     */
    function getSwapStatus(uint256 _swapId)
        external
        view
        swapExists(_swapId)
        returns (string memory)
    {
        SwapStatus status = swaps[_swapId].status;

        if (status == SwapStatus.Initiated) return "Initiated";
        if (status == SwapStatus.Completed) return "Completed";
        if (status == SwapStatus.Failed) return "Failed";
        if (status == SwapStatus.Refunded) return "Refunded";

        return "Unknown";
    }

    /**
     * @dev Get swaps by status
     * @param _user Address of the user
     * @param _status Status to filter by
     * @return Array of swap IDs matching the status
     */
    function getUserSwapsByStatus(address _user, SwapStatus _status)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory userSwapIds = userSwaps[_user];
        uint256 count = 0;

        // Count matching swaps
        for (uint256 i = 0; i < userSwapIds.length; i++) {
            if (swaps[userSwapIds[i]].status == _status) {
                count++;
            }
        }

        // Create result array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < userSwapIds.length; i++) {
            if (swaps[userSwapIds[i]].status == _status) {
                result[index] = userSwapIds[i];
                index++;
            }
        }

        return result;
    }
}
