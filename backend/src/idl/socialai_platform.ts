export const IDL = {
  "version": "0.1.0",
  "name": "socialai_platform",
  "instructions": [
    {
      "name": "initializePlatform",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "platformConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "platformFee",
          "type": "u16"
        }
      ]
    },
    {
      "name": "mintAiAgent",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "agentAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "platformConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ajexMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userAjexAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "platformAjexAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "agentConfig",
          "type": {
            "defined": "AIAgentConfig"
          }
        },
        {
          "name": "metadataUri",
          "type": "string"
        },
        {
          "name": "ajexFeeAmount",
          "type": "u64"
        },
        {
          "name": "burnFee",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateAgentPerformance",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "agentAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newStats",
          "type": {
            "defined": "PerformanceUpdate"
          }
        }
      ]
    },
    {
      "name": "transferAgent",
      "accounts": [
        {
          "name": "oldOwner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "newOwner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "agentAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "updatePlatformConfig",
      "accounts": [
        {
          "name": "platformConfig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "supportedPlatforms",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "supportedPersonalityTypes",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "maxPlatformsPerAgent",
          "type": "u8"
        },
        {
          "name": "maxSpecializationsPerAgent",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "PlatformConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "treasury",
            "type": "publicKey"
          },
                  {
          "name": "platformFee",
          "type": "u16"
        },
        {
          "name": "totalAgentsMinted",
          "type": "u64"
        },
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "supportedPlatforms",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "supportedPersonalityTypes",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "maxPlatformsPerAgent",
          "type": "u8"
        },
        {
          "name": "maxSpecializationsPerAgent",
          "type": "u8"
        }
        ]
      }
    },
    {
      "name": "AIAgentAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "config",
            "type": {
              "defined": "AIAgentConfig"
            }
          },
          {
            "name": "performanceStats",
            "type": {
              "defined": "PerformanceStats"
            }
          },
          {
            "name": "evolutionStage",
            "type": {
              "defined": "EvolutionStage"
            }
          },
          {
            "name": "achievements",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
    "types": [
    {
      "name": "AIAgentConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "personalityType",
            "type": "string"
          },
          {
            "name": "voiceTone",
            "type": "string"
          },
          {
            "name": "platforms",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "specialization",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "PerformanceStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalPosts",
            "type": "u32"
          },
          {
            "name": "totalReplies",
            "type": "u32"
          },
          {
            "name": "totalEngagements",
            "type": "u32"
          },
          {
            "name": "viralPosts",
            "type": "u16"
          },
          {
            "name": "avgEngagementRate",
            "type": "u32"
          },
          {
            "name": "reputationScore",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "PerformanceUpdate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "postsGenerated",
            "type": "u32"
          },
          {
            "name": "repliesSent",
            "type": "u32"
          },
          {
            "name": "engagements",
            "type": "u32"
          },
          {
            "name": "viralPosts",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "EvolutionStage",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Novice"
          },
          {
            "name": "Intermediate"
          },
          {
            "name": "Expert"
          },
          {
            "name": "Legendary"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "AgentMinted",
      "fields": [
        {
          "name": "mint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "agentName",
          "type": "string",
          "index": false
        },
        {
          "name": "personalityType",
          "type": "string",
          "index": false
        },
        {
          "name": "ajexFeeAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "platformFeeAmount",
          "type": "u64",
          "index": false
        },
        {
          "name": "burnFee",
          "type": "bool",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "AgentEvolved",
      "fields": [
        {
          "name": "mint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldStage",
          "type": {
            "defined": "EvolutionStage"
          },
          "index": false
        },
        {
          "name": "newStage",
          "type": {
            "defined": "EvolutionStage"
          },
          "index": false
        },
        {
          "name": "totalPosts",
          "type": "u32",
          "index": false
        },
        {
          "name": "avgEngagement",
          "type": "u32",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "PerformanceUpdated",
      "fields": [
        {
          "name": "mint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "totalPosts",
          "type": "u32",
          "index": false
        },
        {
          "name": "totalEngagements",
          "type": "u32",
          "index": false
        },
        {
          "name": "avgEngagementRate",
          "type": "u32",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "AgentTransferred",
      "fields": [
        {
          "name": "mint",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "oldOwner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newOwner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "PlatformConfigUpdated",
      "fields": [
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "MetadataUriTooLong",
      "msg": "Metadata URI too long"
    },
    {
      "code": 6001,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6002,
      "name": "AgentNotFound",
      "msg": "Agent not found"
    },
    {
      "code": 6003,
      "name": "InvalidEvolutionCriteria",
      "msg": "Invalid evolution criteria"
    }
  ]
};
