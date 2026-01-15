import mongoose from "mongoose";

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    // Event listener: jab database connect ho jaaye
    mongoose.connection.on("connected", () =>
      console.log("Database connected")
    );

    // Connect to MongoDB using URI from .env
    // '/quickshow' database ka naam hai
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
  } catch (error) {
    // Agar connection me error aaye to console me dikhaye
    console.log(error.message);
  }
};

// Export function to use in server.js
export default connectDB;
//2