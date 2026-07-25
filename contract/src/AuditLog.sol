// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract AuditLog is Initializable {
    struct AuditEntry {
        bytes32 evaluationId;
        uint256 policyId;
        string policyName;
        uint8 riskScore;
        uint16 checkResults;
        uint8 requiredSigners;
        uint8 totalSigners;
        uint256 timestamp;
        bytes32 storageRoot;
    }

    AuditEntry[] public entries;

    constructor() {}

    function postEntry(AuditEntry calldata _entry) external {
        entries.push(_entry);
    }

    function postEntryMemory(AuditEntry memory _entry) external {
        entries.push(_entry);
    }

    function getEntryCount() external view returns (uint256) {
        return entries.length;
    }

    function getEntry(uint256 _index) external view returns (AuditEntry memory) {
        return entries[_index];
    }

    function getEntriesByPolicy(uint256 _policyId) external view returns (AuditEntry[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].policyId == _policyId) count++;
        }
        AuditEntry[] memory result = new AuditEntry[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].policyId == _policyId) {
                result[j++] = entries[i];
            }
        }
        return result;
    }
}
