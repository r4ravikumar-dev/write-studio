/** The API's settings, read once at start. Missing required values stop it starting. */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name} (see backend/express/.env.example).`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  supabaseUrl: required('SUPABASE_URL').replace(/\/+$/, ''),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret: required('JWT_SECRET'),
  isProduction: process.env.NODE_ENV === 'production',
};
