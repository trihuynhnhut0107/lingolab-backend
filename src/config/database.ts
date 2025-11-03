import { DataSource } from "typeorm";
import { config } from "dotenv";
import { User } from "../entities/User";

config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "lingolab_db",
  synchronize: process.env.TYPEORM_SYNCHRONIZE === "true",
  logging: process.env.TYPEORM_LOGGING === "true",
  entities: [User],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connection established successfully");
  } catch (error) {
    console.error("❌ Error connecting to database:", error);
    throw error;
  }
};
