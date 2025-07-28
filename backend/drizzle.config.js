import 'dotenv/config'; // Loads .env variables
import { config } from 'dotenv';
config(); // ⬅️ Ensures process.env is populated

console.log("Loaded DB URL: ", process.env.DATABASE_URL); // ✅ for debugging

export default {
  schema: './drizzle/schema.js',       // Path to your schema file
  out: './drizzle',                    // Migrations output folder
  dialect: 'postgresql',               // ✅ REQUIRED: must be one of ['postgresql', 'mysql', 'sqlite', ...]
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:1111@localhost:5432/intelverse", // Or hardcode here
  },
};
