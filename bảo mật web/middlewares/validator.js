const { z } = require('zod');

/**
 * Higher-order Express middleware to validate requests against a Zod schema
 * @param {z.ZodSchema} schema Zod validation schema
 * @param {'body' | 'query' | 'params'} source Express request property to validate
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    // Parse and replace original request data with parsed/validated data (removes extra fields)
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
  }
};

// --- AUTHENTICATION SCHEMAS ---

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim(),
  email: z.string()
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password is too long')
});

const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
});

// --- LUA ROBLEX INGESTION SCHEMAS ---

const equippedItemsSchema = z.object({
  fruit: z.string().optional().nullable(),
  fruitMastery: z.number().int().nonnegative().optional().nullable(),
  sword: z.string().optional().nullable(),
  gun: z.string().optional().nullable(),
  fightingStyle: z.string().optional().nullable()
}).optional();

const materialSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive().default(1)
});

const inventorySchema = z.object({
  fruits: z.array(z.string()).optional(),
  weapons: z.array(z.string()).optional(),
  guns: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  accessories: z.array(z.string()).optional(),
  materials: z.array(z.union([z.string(), materialSchema])).optional()
}).optional();

// Validator for /api/lua/update endpoint
const luaUpdateSchema = z.object({
  // Roblox username (can be flat under payload)
  username: z.string().min(1, 'Roblox username is required').max(50),
  roblox_username: z.string().optional(), // fallback
  
  // Game Stats
  level: z.number().int().min(1).max(3000).optional(),
  beli: z.number().int().nonnegative().optional(),
  fragments: z.number().int().nonnegative().optional(),
  sea: z.number().int().min(1).max(10).optional(),
  race: z.string().max(30).optional(),
  status: z.enum(['idle', 'grinding', 'leveling', 'done', 'frozen', 'error']).optional().default('grinding'),
  location: z.string().max(100).optional(),
  playtime: z.number().int().nonnegative().optional(),
  
  // Equipped Details
  fruit_equipped: z.string().optional(),
  fruit: z.string().optional(),
  fruit_mastery: z.number().int().nonnegative().optional(),
  sword: z.string().optional(),
  gun: z.string().optional(),
  fighting_style: z.string().optional(),
  weapons: z.array(z.string()).optional(), // fallback weapons array
  guns: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  
  // Inventory (both structured nested or flat)
  inventory: inventorySchema.optional(),
  
  // Flat inventory fallbacks
  weapons_flat: z.array(z.string()).optional(),
  guns_flat: z.array(z.string()).optional(),
  styles_flat: z.array(z.string()).optional(),
  accessories: z.array(z.string()).optional(),
  materials: z.array(z.union([z.string(), materialSchema])).optional(),
  inventory_fruits: z.array(z.string()).optional(),
  fruits: z.array(z.string()).optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  luaUpdateSchema
};
