import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config({
    path: '.env.local',
})

export default {
    dialect: "postgresql",
    schema: "./src/lib/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
      url: process.env.DATABASE_URL!,
    },
} satisfies Config;