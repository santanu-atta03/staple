
const { z } = require("zod");

const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),

  email: z.string()
    .trim()
    .email()
    .max(254),

  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),

  fullName: z.string()
    .trim()
    .max(60)
    .optional(),
});

const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1)
    .max(254),

  password: z.string()
    .min(1)
    .max(128),

  rememberMe: z.boolean().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
};
