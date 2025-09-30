import path from "node:path";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { type PrismaConfig } from "prisma";

// Import environment variables
import "dotenv/config";

export default {
	experimental: {
		adapter: true,
	},
	schema: path.join("prisma", "schema.prisma"),
	migrations: {
		path: path.join("prisma", "migrations"),
		seed: "tsx other/runfile prisma/seed.ts",
	},
	async adapter() {
		return new PrismaBetterSQLite3({
			url: process.env.DATABASE_URL!,
		});
	},
} satisfies PrismaConfig;