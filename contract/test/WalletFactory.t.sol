// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/WalletFactory.sol";
import "../src/MultisigWallet.sol";
import "../src/GovernanceMultisig.sol";
import "../src/PolicyRegistry.sol";
import "../src/AuditLog.sol";
import "../src/PresetPolicyRegistry.sol";
import "../src/EvaluationGateway.sol";

contract WalletFactoryTest is Test {
    using Clones for address;
    WalletFactory public factory;
    EvaluationGateway public gateway;
    PresetPolicyRegistry public presetReg;

    address evaluatorSigner;
    address alice;
    address bob;
    address carol;

    event WalletCreated(
        address indexed wallet,
        address indexed governance,
        address policyRegistry,
        address auditLog,
        address[] signers
    );

    function setUp() public {
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");
        evaluatorSigner = makeAddr("evaluator");

        presetReg = new PresetPolicyRegistry();

        MultisigWallet singleton = new MultisigWallet();
        GovernanceMultisig govSingleton = new GovernanceMultisig();
        PolicyRegistry policyRegSingleton = new PolicyRegistry();
        AuditLog auditLogSingleton = new AuditLog();

        factory = new WalletFactory(
            address(singleton),
            address(govSingleton),
            address(policyRegSingleton),
            address(auditLogSingleton),
            evaluatorSigner,
            address(presetReg)
        );

        gateway = new EvaluationGateway(address(this), evaluatorSigner);
    }

    function test_CreateWalletNoPresets() public {
        address[] memory signers = _threeSigners();

        WalletFactory.WalletDeployment memory dep = factory.createWalletNoPresets(signers);

        assertTrue(dep.wallet != address(0));
        assertTrue(dep.governance != address(0));
        assertTrue(dep.policyRegistry != address(0));
        assertTrue(dep.auditLog != address(0));

        GovernanceMultisig gov = GovernanceMultisig(dep.governance);
        assertEq(gov.getSignerCount(), 3);

        MultisigWallet wallet = MultisigWallet(payable(dep.wallet));
        assertEq(wallet.governance(), dep.governance);
        assertEq(wallet.evaluatorSigner(), evaluatorSigner);
        assertEq(wallet.txCount(), 0);

        PolicyRegistry polReg = PolicyRegistry(dep.policyRegistry);
        assertEq(polReg.getPolicyCount(), 0);
        assertTrue(polReg.provisioningLocked());
    }

    function test_CreateWalletWithPresets() public {
        address[] memory signers = _threeSigners();
        uint256[] memory presetIds = new uint256[](4);
        presetIds[0] = 0;
        presetIds[1] = 1;
        presetIds[2] = 2;
        presetIds[3] = 3;

        WalletFactory.WalletDeployment memory dep = factory.createWallet(signers, presetIds);

        PolicyRegistry polReg = PolicyRegistry(dep.policyRegistry);
        assertEq(polReg.getPolicyCount(), 4);

        PolicyRegistry.Policy memory p0 = polReg.getPolicy(0);
        assertEq(p0.name, "Low-Value Transfer");
        assertTrue(p0.active);
        assertEq(p0.riskWeight, 2);
        assertEq(p0.limits.maxValuePerTxUsd, 1_000e18);
        assertEq(p0.limits.maxValueDailyUsd, 10_000e18);
        assertEq(p0.signers.length, 3);

        PolicyRegistry.Policy memory p1 = polReg.getPolicy(1);
        assertEq(p1.name, "High-Value Transfer");
        assertEq(p1.riskWeight, 5);
        assertEq(p1.limits.maxValuePerTxUsd, 50_000e18);

        PolicyRegistry.Policy memory p2 = polReg.getPolicy(2);
        assertEq(p2.name, "Treasury Management");
        assertEq(p2.riskWeight, 9);
        assertTrue(p2.conditions.requireVerified);
        assertTrue(p2.conditions.requireErc7730);
        assertEq(p2.limits.maxValuePerTxUsd, type(uint256).max);

        PolicyRegistry.Policy memory p3 = polReg.getPolicy(3);
        assertEq(p3.name, "DeFi Interaction");
        assertEq(p3.riskWeight, 6);
        assertEq(p3.limits.maxValuePerTxUsd, 25_000e18);
        assertEq(p3.limits.maxValueDailyUsd, 250_000e18);

        PolicyRegistry.Policy[] memory active = polReg.getActivePolicies();
        assertEq(active.length, 4);

        assertTrue(polReg.provisioningLocked());
    }

    function test_CreateWalletSubsetPresets() public {
        address[] memory signers = _threeSigners();
        uint256[] memory presetIds = new uint256[](2);
        presetIds[0] = 0;
        presetIds[1] = 3;

        WalletFactory.WalletDeployment memory dep = factory.createWallet(signers, presetIds);

        PolicyRegistry polReg = PolicyRegistry(dep.policyRegistry);
        assertEq(polReg.getPolicyCount(), 2);

        PolicyRegistry.Policy memory p0 = polReg.getPolicy(0);
        assertEq(p0.name, "Low-Value Transfer");

        PolicyRegistry.Policy memory p1 = polReg.getPolicy(1);
        assertEq(p1.name, "DeFi Interaction");
    }

    function test_RevertProvisioningAfterLock() public {
        address[] memory signers = _threeSigners();
        uint256[] memory presetIds = new uint256[](1);
        presetIds[0] = 0;

        WalletFactory.WalletDeployment memory dep = factory.createWallet(signers, presetIds);

        PolicyRegistry polReg = PolicyRegistry(dep.policyRegistry);
        assertTrue(polReg.provisioningLocked());

        PolicyRegistry.Conditions memory conditions = _defaultConditions();
        PolicyRegistry.Limits memory limits = _defaultLimits();

        vm.expectRevert("Only governance or provisioner");
        polReg.addPolicy("Sneaky", conditions, limits, signers, 5);
    }

    function test_GovernanceCanAddAfterLock() public {
        address[] memory signers = _threeSigners();
        uint256[] memory presetIds = new uint256[](1);
        presetIds[0] = 0;

        WalletFactory.WalletDeployment memory dep = factory.createWallet(signers, presetIds);

        PolicyRegistry polReg = PolicyRegistry(dep.policyRegistry);
        assertTrue(polReg.provisioningLocked());

        PolicyRegistry.Conditions memory conditions = _defaultConditions();
        PolicyRegistry.Limits memory limits = _defaultLimits();

        vm.prank(dep.governance);
        polReg.addPolicy("Gov Policy", conditions, limits, signers, 3);
        assertEq(polReg.getPolicyCount(), 2);
    }

    function test_MultipleWalletsFromFactory() public {
        address[] memory signers1 = new address[](2);
        signers1[0] = alice;
        signers1[1] = bob;

        address[] memory signers2 = new address[](1);
        signers2[0] = carol;

        uint256[] memory presets = new uint256[](1);
        presets[0] = 0;

        WalletFactory.WalletDeployment memory dep1 = factory.createWallet(signers1, presets);
        WalletFactory.WalletDeployment memory dep2 = factory.createWalletNoPresets(signers2);

        assertTrue(dep1.wallet != dep2.wallet);
        assertTrue(dep1.governance != dep2.governance);
        assertTrue(dep1.policyRegistry != dep2.policyRegistry);
        assertTrue(dep1.auditLog != dep2.auditLog);

        GovernanceMultisig gov1 = GovernanceMultisig(dep1.governance);
        GovernanceMultisig gov2 = GovernanceMultisig(dep2.governance);
        assertEq(gov1.getSignerCount(), 2);
        assertEq(gov2.getSignerCount(), 1);

        PolicyRegistry polReg1 = PolicyRegistry(dep1.policyRegistry);
        PolicyRegistry polReg2 = PolicyRegistry(dep2.policyRegistry);
        assertEq(polReg1.getPolicyCount(), 1);
        assertEq(polReg2.getPolicyCount(), 0);
    }

    function test_WalletSubmitAndExecute() public {
        address[] memory signers = _threeSigners();
        uint256[] memory presetIds = new uint256[](1);
        presetIds[0] = 0;

        WalletFactory.WalletDeployment memory dep = factory.createWallet(signers, presetIds);

        MultisigWallet wallet = MultisigWallet(payable(dep.wallet));
        uint256 txId = wallet.submitTransaction(address(0x1), "", 0);
        assertEq(txId, 0);

        address[] memory evalSigners = new address[](2);
        evalSigners[0] = alice;
        evalSigners[1] = bob;

        vm.prank(evaluatorSigner);
        wallet.submitEvaluation(txId, 3, 0x00FF, 0, 2, evalSigners, bytes32(0));

        vm.prank(alice);
        wallet.approveTx(txId);
        vm.prank(bob);
        wallet.approveTx(txId);

        wallet.executeTx(txId);

        (, , , , bool executed, , , , , , ) = wallet.getTransaction(txId);
        assertTrue(executed);
    }

    function test_RevertEmptySigners() public {
        address[] memory signers = new address[](0);
        uint256[] memory presets = new uint256[](0);
        vm.expectRevert("Need signers");
        factory.createWallet(signers, presets);
    }

    function test_WalletCannotReinitialize() public {
        address[] memory signers = _threeSigners();

        WalletFactory.WalletDeployment memory dep = factory.createWalletNoPresets(signers);
        MultisigWallet wallet = MultisigWallet(payable(dep.wallet));

        vm.expectRevert("Initializable: contract is already initialized");
        wallet.initialize(address(0), address(0), address(0));
    }

    function test_WalletReceivesEth() public {
        address[] memory signers = _threeSigners();
        WalletFactory.WalletDeployment memory dep = factory.createWalletNoPresets(signers);

        (bool ok,) = dep.wallet.call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(dep.wallet.balance, 1 ether);
    }

    function test_PresetRegistryCount() public view {
        assertEq(presetReg.getPresetCount(), 4);
    }

    function _threeSigners() internal returns (address[] memory) {
        address[] memory s = new address[](3);
        s[0] = alice;
        s[1] = bob;
        s[2] = carol;
        return s;
    }

    function _defaultConditions() internal pure returns (PolicyRegistry.Conditions memory) {
        return PolicyRegistry.Conditions({
            targetAddresses: new address[](0),
            functionSelectors: new bytes4[](0),
            minValue: 0,
            maxValue: type(uint256).max,
            timeWindowStart: 0,
            timeWindowEnd: type(uint256).max,
            requireVerified: false,
            requireErc7730: false
        });
    }

    function _defaultLimits() internal pure returns (PolicyRegistry.Limits memory) {
        return PolicyRegistry.Limits({
            maxValuePerTxUsd: 100_000e18,
            maxValueDailyUsd: 1_000_000e18,
            allowlist: new address[](0),
            denylist: new address[](0)
        });
    }
}
