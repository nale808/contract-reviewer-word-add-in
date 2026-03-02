import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:          z.enum(['development', 'production', 'test']).default('development'),
  PORT:              z.coerce.number().min(1024).default(5001),
  DATABASE_URL:      z.string().url().refine(s => !s.includes('password@'), {
                       message: 'DATABASE_URL contains default weak password — update before production',
                     }).or(z.string().min(10)), // allow in dev
  ANTHROPIC_API_KEY: z.string().min(10).refine(s => s !== 'sk-ant-placeholder', {
                       message: 'ANTHROPIC_API_KEY is still a placeholder',
                     }),
  FRONTEND_ORIGIN:   z.string().url().default('https://localhost:3000'),
  MSAL_TENANT_ID:    z.string().min(1).default('placeholder'),
  MSAL_CLIENT_ID:    z.string().min(1).default('placeholder'),
  SKIP_AUTH:         z.coerce.boolean().default(false),
  MOCK_AI:           z.coerce.boolean().default(false),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌  Invalid environment variables:\n', result.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    console.warn('⚠️   Continuing with invalid env in non-production mode.');
    return process.env as unknown as z.infer<typeof envSchema>;
  }
  return result.data;
}

export const config = validateEnv();
export type Config = typeof config;
