import { clerkClient } from "@clerk/express";

// ye middleware check karta hai ki request bhejne wala user admin hai ya nahi
export const protectAdmin = async (req, res, next) => {
  try {
    // req.auth() clerk middleware se aata hai
    // isme logged-in user ki basic info hoti hai
    // yaha se hume sirf userId chahiye
    const { userId } = req.auth();

    // clerk ke database se user ka complete data nikal rahe hain
    // jaise email, name, metadata etc.
    const user = await clerkClient.users.getUser(userId);

    // yaha hum user ke privateMetadata me role check kar rahe hain
    // role manually admin ke liye set kiya jata hai
    if (user.privateMetadata.role !== "admin") {
      // agar user admin nahi hai
      // toh yahin request ko rok dete hain
      return res.json({
        success: false,
        message: "not authorized",
      });
    }

    // agar user admin hai
    // toh request ko next controller / route tak jaane dete hain
    next();
  } catch (error) {
    // agar koi bhi error aaye
    // jaise user login nahi hai, token invalid hai, ya clerk error
    // toh user ko unauthorized hi bolenge
    return res.json({
      success: false,
      message: "not authorized",
    });
  }
};
