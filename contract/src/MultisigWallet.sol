// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./AuditLog.sol";

/// @title MultisigWallet
/// @notice Policy-gated multisig wallet. Evaluation results are submitted by
///         the registered evaluator signer (off-chain 0G Compute-backed service)
///         instead of Flare TEE attestation.
contract MultisigWallet is Initializable {
    AuditLog public auditLog;
    address public governance;
    address public evaluatorSigner;

    struct Transaction {
        address target;
        bytes data;
        uint256 value;
        uint256 nonce;
        bool executed;
        uint8 requiredSigners;
        address[] requiredSignerSet;
        uint8 riskScore;
        uint16 checkResults;
        uint256 matchedPolicyId;
        bool evaluated;
        bytes32 storageRoot;
    }

    uint256 public txCount;
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    mapping(uint256 => uint256) public approvalCount;

    event TransactionSubmitted(uint256 indexed txId, address indexed target, uint256 nonce);
    event EvaluationSubmitted(
        uint256 indexed txId,
        uint256 matchedPolicyId,
        uint8 riskScore,
        uint16 checkResults,
        bytes32 storageRoot
    );
    event TxApproved(uint256 indexed txId, address indexed signer);
    event TxExecuted(uint256 indexed txId);
    event EvaluatorSignerUpdated(address oldSigner, address newSigner);

    constructor() {}

    function initialize(
        address _auditLog,
        address _governance,
        address _evaluatorSigner
    ) external initializer {
        auditLog = AuditLog(_auditLog);
        governance = _governance;
        evaluatorSigner = _evaluatorSigner;
    }

    function submitTransaction(
        address _target,
        bytes calldata _data,
        uint256 _nonce
    ) external payable returns (uint256) {
        uint256 id = txCount++;
        Transaction storage t = transactions[id];
        t.target = _target;
        t.data = _data;
        t.value = msg.value;
        t.nonce = _nonce;
        emit TransactionSubmitted(id, _target, _nonce);
        return id;
    }

    /// @notice Submit an evaluation result. Only the registered evaluator signer may call this.
    function submitEvaluation(
        uint256 _txId,
        uint8 _riskScore,
        uint16 _checkResults,
        uint256 _matchedPolicyId,
        uint8 _requiredSigners,
        address[] calldata _signers,
        bytes32 _storageRoot
    ) external {
        require(msg.sender == evaluatorSigner, "Not evaluator signer");
        Transaction storage t = transactions[_txId];
        require(!t.evaluated, "Already evaluated");
        require(!t.executed, "Already executed");

        t.evaluated = true;
        t.riskScore = _riskScore;
        t.checkResults = _checkResults;
        t.matchedPolicyId = _matchedPolicyId;
        t.requiredSigners = _requiredSigners;
        t.requiredSignerSet = _signers;
        t.storageRoot = _storageRoot;

        auditLog.postEntryMemory(
            AuditLog.AuditEntry({
                evaluationId: keccak256(abi.encode(t.nonce, _matchedPolicyId, block.timestamp)),
                policyId: _matchedPolicyId,
                policyName: "",
                riskScore: _riskScore,
                checkResults: _checkResults,
                requiredSigners: _requiredSigners,
                totalSigners: uint8(_signers.length),
                timestamp: block.timestamp,
                storageRoot: _storageRoot
            })
        );

        emit EvaluationSubmitted(_txId, _matchedPolicyId, _riskScore, _checkResults, _storageRoot);
    }

    function approveTx(uint256 _txId) external {
        Transaction storage t = transactions[_txId];
        require(t.evaluated, "Not yet evaluated");
        require(!t.executed, "Already executed");
        require(!hasApproved[_txId][msg.sender], "Already approved");

        bool isSigner = false;
        for (uint256 i = 0; i < t.requiredSignerSet.length; i++) {
            if (t.requiredSignerSet[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        require(isSigner, "Not in required signer set");

        hasApproved[_txId][msg.sender] = true;
        approvalCount[_txId]++;
        emit TxApproved(_txId, msg.sender);
    }

    function executeTx(uint256 _txId) external {
        Transaction storage t = transactions[_txId];
        require(t.evaluated, "Not yet evaluated");
        require(!t.executed, "Already executed");
        require(approvalCount[_txId] >= t.requiredSigners, "Insufficient approvals");

        t.executed = true;
        (bool success, ) = t.target.call{value: t.value}(t.data);
        require(success, "Execution failed");
        emit TxExecuted(_txId);
    }

    function setEvaluatorSigner(address _signer) external {
        require(msg.sender == governance, "Only governance");
        emit EvaluatorSignerUpdated(evaluatorSigner, _signer);
        evaluatorSigner = _signer;
    }

    function getTransaction(uint256 _txId)
        external
        view
        returns (
            address target,
            bytes memory data,
            uint256 value,
            uint256 nonce,
            bool executed,
            bool evaluated,
            uint8 requiredSigners,
            uint8 riskScore,
            uint16 checkResults,
            uint256 matchedPolicyId,
            bytes32 storageRoot
        )
    {
        Transaction storage t = transactions[_txId];
        return (
            t.target,
            t.data,
            t.value,
            t.nonce,
            t.executed,
            t.evaluated,
            t.requiredSigners,
            t.riskScore,
            t.checkResults,
            t.matchedPolicyId,
            t.storageRoot
        );
    }

    receive() external payable {}
}
