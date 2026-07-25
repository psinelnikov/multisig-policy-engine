// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MultisigWallet.sol";
import "../src/GovernanceMultisig.sol";
import "../src/PolicyRegistry.sol";
import "../src/AuditLog.sol";
import "../src/PresetPolicyRegistry.sol";
import "../src/WalletFactory.sol";
import "../src/EvaluationGateway.sol";

contract DeployScript is Script {
    function run() external {
        string memory pkString = vm.envString("PRIVATE_KEY");
        bytes memory pkBytes = bytes(pkString);
        if (pkBytes.length >= 2 && pkBytes[0] == "0" && (pkBytes[1] == "x" || pkBytes[1] == "X")) {
        } else {
            pkString = string.concat("0x", pkString);
        }
        uint256 deployerPrivateKey = vm.parseUint(pkString);

        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Starting 0G Galileo Deployment ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        PresetPolicyRegistry presetRegistry = new PresetPolicyRegistry();
        console.log("PresetPolicyRegistry deployed at:", address(presetRegistry));

        MultisigWallet walletSingleton = new MultisigWallet();
        console.log("MultisigWallet singleton deployed at:", address(walletSingleton));

        GovernanceMultisig govSingleton = new GovernanceMultisig();
        console.log("GovernanceMultisig singleton deployed at:", address(govSingleton));

        PolicyRegistry policyRegSingleton = new PolicyRegistry();
        console.log("PolicyRegistry singleton deployed at:", address(policyRegSingleton));

        AuditLog auditLogSingleton = new AuditLog();
        console.log("AuditLog singleton deployed at:", address(auditLogSingleton));

        address evaluatorSigner = vm.envOr("EVALUATOR_SIGNER", vm.addr(deployerPrivateKey));

        WalletFactory factory = new WalletFactory(
            address(walletSingleton),
            address(govSingleton),
            address(policyRegSingleton),
            address(auditLogSingleton),
            evaluatorSigner,
            address(presetRegistry)
        );
        console.log("WalletFactory deployed at:", address(factory));

        EvaluationGateway gateway = new EvaluationGateway(address(factory), evaluatorSigner);
        console.log("EvaluationGateway deployed at:", address(gateway));

        console.log("=== Deployment Complete ===");
        console.log("");
        console.log("=== Contract Addresses (add these to .env) ===");
        console.log("PRESET_POLICY_REGISTRY_ADDR=", address(presetRegistry));
        console.log("MULTISIG_WALLET_SINGLETON_ADDR=", address(walletSingleton));
        console.log("GOVERNANCE_MULTISIG_SINGLETON_ADDR=", address(govSingleton));
        console.log("POLICY_REGISTRY_SINGLETON_ADDR=", address(policyRegSingleton));
        console.log("AUDIT_LOG_SINGLETON_ADDR=", address(auditLogSingleton));
        console.log("WALLET_FACTORY_ADDR=", address(factory));
        console.log("EVALUATION_GATEWAY_ADDR=", address(gateway));

        vm.stopBroadcast();
    }
}
