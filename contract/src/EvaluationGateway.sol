// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EvaluationGateway
/// @notice Event-driven entry point for encrypted evaluation requests.
///         Replaces Flare's InstructionSender. The off-chain evaluator service
///         watches EvaluateRequested events, decrypts the payload, runs the
///         risk pipeline, and submits the result via MultisigWallet.submitEvaluation.
contract EvaluationGateway {
    address public evaluatorSigner;
    address public governance;

    uint256 public txCount;

    event EvaluateRequested(
        uint256 indexed txId,
        address indexed sender,
        bytes encryptedPayload,
        uint256 nonce
    );

    event EvaluatorSignerUpdated(address oldSigner, address newSigner);

    constructor(address _governance, address _evaluatorSigner) {
        governance = _governance;
        evaluatorSigner = _evaluatorSigner;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    /// @notice Submit an encrypted evaluation request. Emits an event the evaluator watches.
    function sendEvaluate(bytes calldata _encryptedMessage) external payable returns (uint256 txId) {
        txId = txCount++;
        emit EvaluateRequested(txId, msg.sender, _encryptedMessage, txId);
    }

    function setEvaluatorSigner(address _signer) external onlyGovernance {
        emit EvaluatorSignerUpdated(evaluatorSigner, _signer);
        evaluatorSigner = _signer;
    }
}
