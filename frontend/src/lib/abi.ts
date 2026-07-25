export const GOVERNANCE_MULTISIG_ABI = [
  {
    type: "function",
    name: "getSigners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getSignerCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "target", type: "address" },
          { name: "data", type: "bytes" },
          { name: "description", type: "string" },
          { name: "approvalCount", type: "uint256" },
          { name: "executed", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "propose",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_target", type: "address" },
      { name: "_data", type: "bytes" },
      { name: "_description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "hasApproved",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const POLICY_REGISTRY_ABI = [
  {
    type: "function",
    name: "getPolicyCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getPolicy",
    stateMutability: "view",
    inputs: [{ name: "_index", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "active", type: "bool" },
          {
            name: "conditions",
            type: "tuple",
            components: [
              { name: "targetAddresses", type: "address[]" },
              { name: "functionSelectors", type: "bytes4[]" },
              { name: "minValue", type: "uint256" },
              { name: "maxValue", type: "uint256" },
              { name: "timeWindowStart", type: "uint256" },
              { name: "timeWindowEnd", type: "uint256" },
              { name: "requireVerified", type: "bool" },
              { name: "requireErc7730", type: "bool" },
            ],
          },
          {
            name: "limits",
            type: "tuple",
            components: [
              { name: "maxValuePerTxUsd", type: "uint256" },
              { name: "maxValueDailyUsd", type: "uint256" },
              { name: "allowlist", type: "address[]" },
              { name: "denylist", type: "address[]" },
            ],
          },
          { name: "signers", type: "address[]" },
          { name: "riskWeight", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getActivePolicies",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "active", type: "bool" },
          {
            name: "conditions",
            type: "tuple",
            components: [
              { name: "targetAddresses", type: "address[]" },
              { name: "functionSelectors", type: "bytes4[]" },
              { name: "minValue", type: "uint256" },
              { name: "maxValue", type: "uint256" },
              { name: "timeWindowStart", type: "uint256" },
              { name: "timeWindowEnd", type: "uint256" },
              { name: "requireVerified", type: "bool" },
              { name: "requireErc7730", type: "bool" },
            ],
          },
          {
            name: "limits",
            type: "tuple",
            components: [
              { name: "maxValuePerTxUsd", type: "uint256" },
              { name: "maxValueDailyUsd", type: "uint256" },
              { name: "allowlist", type: "address[]" },
              { name: "denylist", type: "address[]" },
            ],
          },
          { name: "signers", type: "address[]" },
          { name: "riskWeight", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "addPolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_name", type: "string" },
      {
        name: "_conditions",
        type: "tuple",
        components: [
          { name: "targetAddresses", type: "address[]" },
          { name: "functionSelectors", type: "bytes4[]" },
          { name: "minValue", type: "uint256" },
          { name: "maxValue", type: "uint256" },
          { name: "timeWindowStart", type: "uint256" },
          { name: "timeWindowEnd", type: "uint256" },
          { name: "requireVerified", type: "bool" },
          { name: "requireErc7730", type: "bool" },
        ],
      },
      {
        name: "_limits",
        type: "tuple",
        components: [
          { name: "maxValuePerTxUsd", type: "uint256" },
          { name: "maxValueDailyUsd", type: "uint256" },
          { name: "allowlist", type: "address[]" },
          { name: "denylist", type: "address[]" },
        ],
      },
      { name: "_signers", type: "address[]" },
      { name: "_riskWeight", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const WALLET_FACTORY_ABI = [
  {
    type: "function",
    name: "createWallet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_signers", type: "address[]" },
      { name: "_presetPolicyIds", type: "uint256[]" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "governance", type: "address" },
          { name: "policyRegistry", type: "address" },
          { name: "auditLog", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createWalletNoPresets",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_signers", type: "address[]" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "governance", type: "address" },
          { name: "policyRegistry", type: "address" },
          { name: "auditLog", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getWalletsForCreator",
    stateMutability: "view",
    inputs: [{ name: "_creator", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "wallet", type: "address" },
          { name: "governance", type: "address" },
          { name: "policyRegistry", type: "address" },
          { name: "auditLog", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "creatorWalletCount",
    stateMutability: "view",
    inputs: [{ name: "_creator", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "walletSingleton",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "evaluatorSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "presetPolicyRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "WalletCreated",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "governance", type: "address", indexed: true },
      { name: "policyRegistry", type: "address", indexed: false },
      { name: "auditLog", type: "address", indexed: false },
      { name: "signers", type: "address[]", indexed: false },
    ],
  },
] as const;

export const PRESET_POLICY_REGISTRY_ABI = [
  {
    type: "function",
    name: "presetName",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "presetRiskWeight",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "presetMaxValuePerTxUsd",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "presetMaxValueDailyUsd",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "presetRequireVerified",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "presetRequireErc7730",
    stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getPresetCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const AUDIT_LOG_ABI = [
  {
    type: "function",
    name: "getEntryCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEntry",
    stateMutability: "view",
    inputs: [{ name: "_index", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "evaluationId", type: "bytes32" },
          { name: "policyId", type: "uint256" },
          { name: "policyName", type: "string" },
          { name: "riskScore", type: "uint8" },
          { name: "checkResults", type: "uint16" },
          { name: "requiredSigners", type: "uint8" },
          { name: "totalSigners", type: "uint8" },
          { name: "timestamp", type: "uint256" },
          { name: "storageRoot", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getEntriesByPolicy",
    stateMutability: "view",
    inputs: [{ name: "_policyId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "evaluationId", type: "bytes32" },
          { name: "policyId", type: "uint256" },
          { name: "policyName", type: "string" },
          { name: "riskScore", type: "uint8" },
          { name: "checkResults", type: "uint16" },
          { name: "requiredSigners", type: "uint8" },
          { name: "totalSigners", type: "uint8" },
          { name: "timestamp", type: "uint256" },
          { name: "storageRoot", type: "bytes32" },
        ],
      },
    ],
  },
] as const;

export const MULTISIG_WALLET_ABI = [
  {
    type: "function",
    name: "submitTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "_target", type: "address" },
      { name: "_data", type: "bytes" },
      { name: "_nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "submitEvaluation",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_txId", type: "uint256" },
      { name: "_riskScore", type: "uint8" },
      { name: "_checkResults", type: "uint16" },
      { name: "_matchedPolicyId", type: "uint256" },
      { name: "_requiredSigners", type: "uint8" },
      { name: "_signers", type: "address[]" },
      { name: "_storageRoot", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approveTx",
    stateMutability: "nonpayable",
    inputs: [{ name: "_txId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "executeTx",
    stateMutability: "nonpayable",
    inputs: [{ name: "_txId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getTransaction",
    stateMutability: "view",
    inputs: [{ name: "_txId", type: "uint256" }],
    outputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "executed", type: "bool" },
      { name: "evaluated", type: "bool" },
      { name: "requiredSigners", type: "uint8" },
      { name: "riskScore", type: "uint8" },
      { name: "checkResults", type: "uint16" },
      { name: "matchedPolicyId", type: "uint256" },
      { name: "storageRoot", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "txCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "evaluatorSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "governance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "hasApproved",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "approvalCount",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "TransactionSubmitted",
    inputs: [
      { name: "txId", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EvaluationSubmitted",
    inputs: [
      { name: "txId", type: "uint256", indexed: true },
      { name: "matchedPolicyId", type: "uint256", indexed: false },
      { name: "riskScore", type: "uint8", indexed: false },
      { name: "checkResults", type: "uint16", indexed: false },
      { name: "storageRoot", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TxApproved",
    inputs: [
      { name: "txId", type: "uint256", indexed: true },
      { name: "signer", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TxExecuted",
    inputs: [{ name: "txId", type: "uint256", indexed: true }],
  },
] as const;

export const EVALUATION_GATEWAY_ABI = [
  {
    type: "function",
    name: "sendEvaluate",
    stateMutability: "payable",
    inputs: [{ name: "_encryptedMessage", type: "bytes" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "evaluatorSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "txCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "EvaluateRequested",
    inputs: [
      { name: "txId", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "encryptedPayload", type: "bytes", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;
