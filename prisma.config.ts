import { defineConfig } from 'prisma/config';

const FILE_NOT_FOUND = 'ENOENT';

// Prisma 7 no longer reads .env itself. Containers and CI inject env vars
// directly, so a missing .env file is expected there; any other error is not.
const loadLocalEnvFile = (): void => {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== FILE_NOT_FOUND) throw error;
  }
};

loadLocalEnvFile();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` doesn't need a URL, so it must not fail without one.
  datasource: { url: process.env.DATABASE_URL },
});
