const { z } = require('zod');

/**
 * Higher-order Express middleware to validate req[source] against a Zod schema
 * @param {z.ZodSchema} schema  Zod validation schema
 * @param {'body'|'query'|'params'} source  Request property to validate
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
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
    return res.status(500).json({ success: false, message: 'Internal validation error' });
  }
};

// ───── Authentication Schemas ─────

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

// ───── Lua Roblox Ingestion Schema ─────

const materialSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive().default(1)
});

const inventorySchema = z.object({
  fruits: z.array(z.string()).optional(),
  stored_fruits: z.array(z.string()).optional(),
  weapons: z.array(z.string()).optional(),
  swords: z.array(z.string()).optional(),
  guns: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  fighting_styles: z.array(z.string()).optional(),
  accessories: z.array(z.string()).optional(),
  materials: z.array(z.union([z.string(), materialSchema])).optional()
}).optional();

const luaUpdateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  roblox_username: z.string().min(1).max(50).optional(),
  level: z.number().int().min(1).max(3000).optional(),
  beli: z.number().int().nonnegative().optional(),
  fragments: z.number().int().nonnegative().optional(),
  sea: z.number().int().min(1).max(10).optional(),
  race: z.string().max(30).optional(),
  status: z.enum(['idle', 'grinding', 'leveling', 'done', 'frozen', 'error', 'offline']).optional(),
  location: z.string().max(100).optional(),
  playtime: z.number().int().nonnegative().optional(),
  fruit_equipped: z.string().optional(),
  fruit: z.string().optional(),
  fruit_mastery: z.number().int().nonnegative().optional(),
  sword: z.string().optional(),
  gun: z.string().optional(),
  fighting_style: z.string().optional(),
  accessory_equipped: z.string().optional(),
  weapons: z.array(z.string()).optional(),
  guns: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  accessories: z.array(z.string()).optional(),
  materials: z.array(z.union([z.string(), materialSchema])).optional(),
  inventory_fruits: z.array(z.string()).optional(),
  fruits: z.array(z.string()).optional(),
  inventory: inventorySchema,
}).refine(
  data => data.username || data.roblox_username,
  { message: 'Either username or roblox_username is required' }
);

const updateEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Current password is required')
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long')
});

module.exports = { 
  validate, 
  registerSchema, 
  loginSchema, 
  luaUpdateSchema, 
  updateEmailSchema, 
  updatePasswordSchema 
};

