const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Handle Uncaught Exceptions (Must be at the very top)
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });

const app = require("./app");

const getDatabaseUri = () => {
  const databaseUri =
    process.env.DATABASE || process.env.MONGODB_URI || process.env.DATABASE_URL;
  const missingEnvVars = [];

  if (!databaseUri) missingEnvVars.push("DATABASE");
  if (!process.env.JWT_SECRET) missingEnvVars.push("JWT_SECRET");

  if (databaseUri && databaseUri.includes("<db_password>")) {
    if (!process.env.DATABASE_PASSWORD) {
      missingEnvVars.push("DATABASE_PASSWORD");
    }

    return {
      databaseUri: databaseUri.replace(
        "<db_password>",
        process.env.DATABASE_PASSWORD || "",
      ),
      missingEnvVars,
    };
  }

  return { databaseUri, missingEnvVars };
};

const { databaseUri, missingEnvVars } = getDatabaseUri();

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

mongoose.connect(databaseUri).then(() => {
  console.log("DB connected succesfully!");
});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Handle Unhandled Rejections (At the bottom)
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
