
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
    .min(12)
    .max(128),

  fullName: z.string()
    .trim()
    .max(60)
    .optional(),
});

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email()
    .max(254),

  password: z.string()
    .min(1)
    .max(128),
});

module.exports = {
  registerSchema,
  loginSchema,
};
