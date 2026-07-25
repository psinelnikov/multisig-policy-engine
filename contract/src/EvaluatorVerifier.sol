// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title EvaluatorVerifier
/// @notice Verifies ECDSA signatures from the evaluator service.
///         Replaces TeeVerifier (Flare TEE attestation). The primary access
///         control on MultisigWallet.submitEvaluation is msg.sender == evaluatorSigner,
///         but this library provides signature verification for cases where a
///         relayer submits on the evaluator's behalf.
library EvaluatorVerifier {
    using ECDSA for bytes32;

    /// @notice Verify the evaluator signed the evaluation data.
    function verifySignedEvaluation(
        bytes32 dataHash,
        bytes memory signature,
        address evaluatorSigner
    ) internal pure returns (address recovered) {
        recovered = dataHash.toEthSignedMessageHash().recover(signature);
        require(recovered == evaluatorSigner, "Invalid evaluator signature");
    }
}
