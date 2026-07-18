const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "OceanForge API Documentation",
    version: "1.0.0",
    description: "Interactive API Documentation for the OceanForge Blox Fruits Account Manager. Learn about user authentication, account synchronization, inventory details, sessions, analytics, and Roblox Lua client interactions.",
    contact: {
      name: "OceanForge Developer Support",
      email: "support@oceanforge.dev"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Default API Base Path"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JSON Web Token (JWT) acquired from the login / register endpoints. Used for frontend user dashboard API access."
      },
      apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API Key or short-lived Roblox Session Token (JWT). Used for Roblox Lua script bootstrap and heartbeat updates."
      }
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message details" }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "65f8a2f4c3a12b001fc9e8d1" },
          username: { type: "string", example: "ocean_captain" },
          email: { type: "string", example: "captain@oceanforge.dev" },
          role: { type: "string", example: "user" },
          apiKey: { type: "string", example: "of_key_a8d7f2b9..." }
        }
      },
      Account: {
        type: "object",
        properties: {
          id: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" },
          userId: { type: "string", example: "65f8a2f4c3a12b001fc9e8d1" },
          robloxUsername: { type: "string", example: "RobloxProPlayer" },
          level: { type: "integer", example: 2550 },
          beli: { type: "integer", example: 5400000 },
          fragments: { type: "integer", example: 12500 },
          sea: { type: "integer", example: 3 },
          race: { type: "string", example: "Mink" },
          status: { type: "string", example: "grinding" },
          location: { type: "string", example: "Sea Castle" },
          playtime: { type: "integer", example: 36000 },
          notes: { type: "string", example: "Main grinding account" },
          lastSeen: { type: "string", format: "date-time", example: "2026-07-17T14:00:00Z" }
        }
      },
      Inventory: {
        type: "object",
        properties: {
          fruits: {
            type: "array",
            items: { type: "string" },
            example: ["Dragon", "Leopard", "Dough"]
          },
          weapons: {
            type: "array",
            items: { type: "string" },
            example: ["Cursed Dual Katana", "Hallow Scythe"]
          },
          guns: {
            type: "array",
            items: { type: "string" },
            example: ["Soul Guitar", "Kabucha"]
          },
          styles: {
            type: "array",
            items: { type: "string" },
            example: ["Godhuman", "Sanguine Art"]
          },
          accessories: {
            type: "array",
            items: { type: "string" },
            example: ["Valkyrie Helm", "Pilot Helmet"]
          },
          materials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", example: "Conjured Cocoa" },
                quantity: { type: "integer", example: 15 }
              }
            }
          },
          lastUpdated: { type: "string", format: "date-time", example: "2026-07-17T14:00:00Z" }
        }
      },
      Session: {
        type: "object",
        properties: {
          id: { type: "string", example: "65f8a2f4c3a12b001fc9e8da" },
          accountId: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" },
          online: { type: "boolean", example: true },
          startTime: { type: "string", format: "date-time", example: "2026-07-17T12:00:00Z" },
          endTime: { type: "string", format: "date-time", example: "2026-07-17T14:00:00Z" },
          duration: { type: "integer", example: 7200 }
        }
      }
    }
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        description: "Creates a new user profile and returns a JWT access token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email", "password"],
                properties: {
                  username: { type: "string", example: "captain_forge" },
                  email: { type: "string", example: "captain@oceanforge.dev" },
                  password: { type: "string", example: "securepassword123" }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    user: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          400: {
            description: "Username or email already taken",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login user",
        description: "Authenticates user using email and password, returning a JWT token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "captain@oceanforge.dev" },
                  password: { type: "string", example: "securepassword123" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    user: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user profile",
        description: "Retrieves details of the currently logged-in user using the JWT token.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Successfully retrieved profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    user: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/loader-token": {
      post: {
        tags: ["Authentication"],
        summary: "Generate a loader token for Roblox",
        description: "Generates a short-lived, single-use token that the Roblox Lua script uses to fetch the bootstrap loader script.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Loader token generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
                  }
                }
              }
            }
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/email": {
      put: {
        tags: ["Authentication"],
        summary: "Update user email",
        description: "Updates the authenticated user's email address.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "new-captain@oceanforge.dev" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Email updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Email updated successfully" },
                    email: { type: "string", example: "new-captain@oceanforge.dev" }
                  }
                }
              }
            }
          },
          400: {
            description: "Email already taken",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/password": {
      put: {
        tags: ["Authentication"],
        summary: "Update user password",
        description: "Updates the authenticated user's password.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string", example: "securepassword123" },
                  newPassword: { type: "string", example: "supersecurepassword456" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Password updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Password updated successfully" }
                  }
                }
              }
            }
          },
          400: {
            description: "Incorrect current password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/accounts": {
      get: {
        tags: ["Accounts"],
        summary: "Get all user Roblox accounts",
        description: "Retrieves a list of all Roblox accounts linked to the authenticated user.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Successfully retrieved accounts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer", example: 2 },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Account" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/accounts/{id}": {
      get: {
        tags: ["Accounts"],
        summary: "Get single account details",
        description: "Retrieves comprehensive details for a specific Roblox account (stats, inventory, active session, and recent logs).",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Roblox Account MongoDB ID",
            schema: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" }
          }
        ],
        responses: {
          200: {
            description: "Details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        account: { $ref: "#/components/schemas/Account" },
                        inventory: { $ref: "#/components/schemas/Inventory" },
                        activeSession: { $ref: "#/components/schemas/Session" },
                        logs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string", example: "65f8a2f4c3a12b001fc9e8e2" },
                              type: { type: "string", example: "level_up" },
                              message: { type: "string", example: "Leveled up from 2549 to 2550" },
                              timestamp: { type: "string", format: "date-time" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: "Account not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      delete: {
        tags: ["Accounts"],
        summary: "Delete Roblox account",
        description: "Deletes a linked Roblox account along with its inventory, sessions, and log histories.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Roblox Account MongoDB ID",
            schema: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" }
          }
        ],
        responses: {
          200: {
            description: "Account and associated data deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" }
              }
            }
          },
          404: {
            description: "Account not found"
          }
        }
      }
    },
    "/accounts/{id}/notes": {
      put: {
        tags: ["Accounts"],
        summary: "Update account notes",
        description: "Updates the text notes for a linked Roblox account.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Roblox Account MongoDB ID",
            schema: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  notes: { type: "string", example: "Grinding status: Gold farm active" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Notes updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Account" }
                  }
                }
              }
            }
          },
          404: {
            description: "Account not found"
          }
        }
      }
    },
    "/inventory/{accountId}": {
      get: {
        tags: ["Inventory"],
        summary: "Get account inventory",
        description: "Retrieves the inventory details (fruits, weapons, styles, materials) for a specific Roblox account.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "accountId",
            in: "path",
            required: true,
            description: "Roblox Account MongoDB ID",
            schema: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" }
          }
        ],
        responses: {
          200: {
            description: "Inventory retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Inventory" }
                  }
                }
              }
            }
          },
          404: {
            description: "Account or inventory not found"
          }
        }
      }
    },
    "/sessions/{accountId}": {
      get: {
        tags: ["Sessions"],
        summary: "Get session history",
        description: "Retrieves the complete active and historical sessions list for a specific Roblox account.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "accountId",
            in: "path",
            required: true,
            description: "Roblox Account MongoDB ID",
            schema: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" }
          }
        ],
        responses: {
          200: {
            description: "Sessions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer", example: 5 },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Session" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/analytics/overview": {
      get: {
        tags: ["Analytics"],
        summary: "Get aggregated user fleet analytics",
        description: "Fetches overview data, fruits distributions, level progression, materials summary, and session metrics for all linked accounts.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Analytics overview data retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        summary: {
                          type: "object",
                          properties: {
                            totalAccounts: { type: "integer", example: 3 },
                            onlineAccounts: { type: "integer", example: 1 },
                            totalBeli: { type: "integer", example: 9800000 },
                            totalFragments: { type: "integer", example: 25000 },
                            totalPlaytime: { type: "integer", example: 45000 },
                            totalFruitsCount: { type: "integer", example: 12 }
                          }
                        },
                        fruitsDistribution: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", example: "Dragon" },
                              value: { type: "integer", example: 4 }
                            }
                          }
                        },
                        levelProgress: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", example: "RobloxProPlayer" },
                              level: { type: "integer", example: 2550 },
                              beli: { type: "integer", example: 5400000 },
                              fragments: { type: "integer", example: 12500 }
                            }
                          }
                        },
                        materialsDistribution: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", example: "Magma Ore" },
                              quantity: { type: "integer", example: 60 }
                            }
                          }
                        },
                        sessionMetrics: {
                          type: "object",
                          properties: {
                            totalSessionsCount: { type: "integer", example: 15 },
                            avgSessionDuration: { type: "integer", example: 1200 },
                            longestSessionDuration: { type: "integer", example: 3600 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/lua/load": {
      get: {
        tags: ["Roblox Lua Script Interaction"],
        summary: "Load the Roblox client Lua script",
        description: "Serves the customized client sender Lua script dynamically, injecting configurations like the host domain and Roblox session key.",
        parameters: [
          {
            name: "key",
            in: "query",
            description: "Permanent API Key from settings (Used in fallback/permanent mode)",
            schema: { type: "string" }
          },
          {
            name: "token",
            in: "query",
            description: "Temporary bootstrap token (Acquired from settings and used for short-lived loader setups)",
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Serves raw Lua script string",
            content: {
              "text/plain": {
                schema: { type: "string", example: "-- Roblox client Lua sender script content..." }
              }
            }
          }
        }
      }
    },
    "/lua/update": {
      post: {
        tags: ["Roblox Lua Script Interaction"],
        summary: "Submit Roblox client stats update",
        description: "Endpoint called by the Roblox Executor script containing updated levels, currencies, locations, equipment, and inventories. Emits updates via Socket.IO in real time.",
        security: [{ apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "level"],
                properties: {
                  username: { type: "string", example: "RobloxProPlayer" },
                  level: { type: "integer", example: 2550 },
                  beli: { type: "integer", example: 5400000 },
                  fragments: { type: "integer", example: 12500 },
                  sea: { type: "integer", example: 3 },
                  race: { type: "string", example: "Mink" },
                  status: { type: "string", example: "farming" },
                  location: { type: "string", example: "Sea Castle" },
                  playtime: { type: "integer", example: 36000 },
                  fruit_equipped: { type: "string", example: "Dragon" },
                  fruit_mastery: { type: "integer", example: 600 },
                  sword: { type: "string", example: "Cursed Dual Katana" },
                  gun: { type: "string", example: "Soul Guitar" },
                  fighting_style: { type: "string", example: "Godhuman" },
                  accessory_equipped: { type: "string", example: "Valkyrie Helm" },
                  inventory: {
                    type: "object",
                    properties: {
                      fruits: { type: "array", items: { type: "string" }, example: ["Dragon", "Dough"] },
                      swords: { type: "array", items: { type: "string" }, example: ["Cursed Dual Katana"] },
                      guns: { type: "array", items: { type: "string" }, example: ["Soul Guitar"] },
                      styles: { type: "array", items: { type: "string" }, example: ["Godhuman"] },
                      accessories: { type: "array", items: { type: "string" }, example: ["Valkyrie Helm"] },
                      materials: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string", example: "Magma Ore" },
                            quantity: { type: "integer", example: 60 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Account stats updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Account updated successfully" },
                    accountId: { type: "string", example: "65f8a2f4c3a12b001fc9e8d5" }
                  }
                }
              }
            }
          },
          401: {
            description: "Invalid API Key or authorization failure"
          }
        }
      }
    }
  }
};

// OceanForge Custom Dark Sea Theme overrides
const swaggerOptions = {
  customCss: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    
    body {
      background-color: #030712 !important;
      margin: 0;
      padding: 0;
    }
    
    .swagger-ui {
      background-color: #030712 !important;
      color: #cbd5e1 !important;
      font-family: 'Outfit', sans-serif !important;
    }
    
    .swagger-ui .topbar {
      background-color: #0b1329 !important;
      border-bottom: 2px solid #d4af37 !important;
      padding: 12px 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    
    .swagger-ui .topbar .download-url-wrapper {
      display: none !important; /* Hide validator */
    }
    
    .swagger-ui .topbar-wrapper a span {
      color: #ffffff !important;
      font-weight: 800 !important;
      letter-spacing: 0.15em !important;
      text-shadow: 0 0 10px rgba(212,175,55,0.4);
    }
    
    .swagger-ui .info {
      margin: 35px 0 !important;
    }
    
    .swagger-ui .info .title {
      color: #d4af37 !important;
      font-size: 32px !important;
      font-weight: 800 !important;
      text-shadow: 0 0 12px rgba(212,175,55,0.25) !important;
    }
    
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info td, .swagger-ui .info a {
      color: #94a3b8 !important;
      font-size: 15px !important;
    }
    
    .swagger-ui .info a {
      color: #5bc0be !important;
      text-decoration: none !important;
      transition: color 0.2s;
    }
    
    .swagger-ui .info a:hover {
      color: #d4af37 !important;
    }
    
    .swagger-ui .scheme-container {
      background-color: #0b1329 !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
      border-radius: 16px !important;
      margin: 25px 0 !important;
      padding: 20px !important;
    }
    
    .swagger-ui select {
      background-color: #1e293b !important;
      color: #f8fafc !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      font-family: inherit;
    }
    
    .swagger-ui .opblock-tag-section {
      margin-bottom: 20px !important;
    }
    
    .swagger-ui .opblock-tag {
      font-size: 20px !important;
      color: #f1f5f9 !important;
      border-bottom: 1px solid #1e293b !important;
      padding: 10px 0 !important;
      font-weight: 700 !important;
    }
    
    .swagger-ui .opblock {
      background-color: rgba(11, 19, 41, 0.6) !important;
      border-radius: 12px !important;
      border: 1px solid rgba(255,255,255,0.04) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      margin-bottom: 12px !important;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .swagger-ui .opblock:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important;
    }
    
    .swagger-ui .opblock.opblock-post {
      border-color: rgba(16, 185, 129, 0.3) !important;
      background-color: rgba(16, 185, 129, 0.03) !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary {
      border-color: rgba(16, 185, 129, 0.2) !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background-color: #10b981 !important;
      border-radius: 8px !important;
      font-weight: bold;
    }
    
    .swagger-ui .opblock.opblock-get {
      border-color: rgba(59, 130, 246, 0.3) !important;
      background-color: rgba(59, 130, 246, 0.03) !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary {
      border-color: rgba(59, 130, 246, 0.2) !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background-color: #3b82f6 !important;
      border-radius: 8px !important;
      font-weight: bold;
    }
    
    .swagger-ui .opblock.opblock-put {
      border-color: rgba(245, 158, 11, 0.3) !important;
      background-color: rgba(245, 158, 11, 0.03) !important;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary {
      border-color: rgba(245, 158, 11, 0.2) !important;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background-color: #f59e0b !important;
      border-radius: 8px !important;
      font-weight: bold;
    }
    
    .swagger-ui .opblock.opblock-delete {
      border-color: rgba(239, 68, 68, 0.3) !important;
      background-color: rgba(239, 68, 68, 0.03) !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary {
      border-color: rgba(239, 68, 68, 0.2) !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background-color: #ef4444 !important;
      border-radius: 8px !important;
      font-weight: bold;
    }
    
    .swagger-ui .opblock .opblock-summary-operation-id, 
    .swagger-ui .opblock .opblock-summary-path, 
    .swagger-ui .opblock .opblock-summary-description {
      color: #f1f5f9 !important;
      font-family: inherit;
    }
    
    .swagger-ui .opblock-description-wrapper p, 
    .swagger-ui .opblock-external-docs-wrapper p, 
    .swagger-ui .opblock-title_normal p {
      color: #94a3b8 !important;
    }
    
    .swagger-ui .btn.authorize {
      border-color: #d4af37 !important;
      color: #d4af37 !important;
      background: transparent !important;
      font-weight: bold;
      border-radius: 8px !important;
      transition: all 0.2s;
    }
    .swagger-ui .btn.authorize:hover {
      background: rgba(212,175,55,0.1) !important;
    }
    .swagger-ui .btn.authorize svg {
      fill: #d4af37 !important;
    }
    
    .swagger-ui .btn {
      background-color: #1e293b !important;
      color: #f1f5f9 !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      padding: 6px 16px !important;
      transition: all 0.2s;
    }
    .swagger-ui .btn:hover {
      background-color: #334155 !important;
      border-color: #475569 !important;
    }
    
    .swagger-ui input[type=text] {
      background-color: #0f172a !important;
      color: #f8fafc !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      font-family: inherit;
    }
    .swagger-ui input[type=text]:focus {
      border-color: #d4af37 !important;
      outline: none;
    }
    
    .swagger-ui .responses-table, .swagger-ui .parameters-table {
      background-color: transparent !important;
      color: #e2e8f0 !important;
    }
    
    .swagger-ui .parameter__name, 
    .swagger-ui .parameter__type, 
    .swagger-ui .parameter__deprecated, 
    .swagger-ui .parameter__in {
      color: #e2e8f0 !important;
      font-family: inherit;
    }
    
    .swagger-ui .response-col_status {
      color: #f1f5f9 !important;
      font-weight: bold;
    }
    .swagger-ui .response-col_description {
      color: #94a3b8 !important;
    }
    
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: #94a3b8 !important;
      border-bottom: 2px solid #1e293b !important;
      font-weight: 600;
    }
    
    .swagger-ui .opblock-body pre.microlight {
      background-color: #020617 !important;
      border: 1px solid rgba(255,255,255,0.05) !important;
      border-radius: 10px !important;
      padding: 15px !important;
    }
    
    .swagger-ui .model-box {
      background-color: #020617 !important;
      border-radius: 10px !important;
      padding: 12px !important;
      border: 1px solid rgba(255,255,255,0.03) !important;
    }
    
    .swagger-ui .model {
      color: #94a3b8 !important;
    }
    
    .swagger-ui .model-title {
      color: #d4af37 !important;
      font-weight: 600;
    }
    
    .swagger-ui .dialog-ux .modal-ux {
      background-color: #0b1329 !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
      border-radius: 20px !important;
    }
    
    .swagger-ui .dialog-ux .modal-ux-header {
      border-bottom: 1px solid #1e293b !important;
      padding: 15px 20px !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 {
      color: #d4af37 !important;
      font-weight: 800;
    }
    .swagger-ui .dialog-ux .modal-ux-header .close-modal {
      fill: #94a3b8 !important;
    }
    
    .swagger-ui .dialog-ux .modal-ux-content h4 {
      color: #f1f5f9 !important;
      font-weight: 700;
    }
    .swagger-ui .dialog-ux .modal-ux-content p {
      color: #94a3b8 !important;
    }
    
    /* JSON property styling in schemas */
    .swagger-ui .prop-name {
      color: #5bc0be !important;
    }
    .swagger-ui .prop-type {
      color: #3b82f6 !important;
    }
  `,
  customSiteTitle: "OceanForge API Documentation",
  customfavIcon: "/api/images/favicon.ico"
};

module.exports = {
  swaggerSpec,
  swaggerOptions
};
