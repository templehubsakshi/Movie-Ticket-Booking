import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow?retryWrites=true&w=majority`);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("DB Connection Error:", error.message);
  }
};

export default connectDB;
