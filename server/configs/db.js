import mongoose from "mongoose";

// Register listener ONCE outside the function — prevents stacking duplicate
// listeners if connectDB is ever called more than once (hot reload, tests).
mongoose.connection.once("connected", () => console.log("Database connected"));

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
