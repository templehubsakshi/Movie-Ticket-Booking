/**
 * ============================================================
 * makeAdmin.js — One-time seed script to promote a user to admin
 * ============================================================
 *
 * USE: Pehli baar admin banana ho to yeh script run karo.
 * DB mein manually jaane ki zaroorat nahi.
 *
 * HOW TO RUN:
 *   node scripts/makeAdmin.js admin@example.com
 *
 * Example:
 *   node scripts/makeAdmin.js sakshi@kiet.edu
 *
 * Requirements:
 *   - .env file mein MONGODB_URI hona chahiye
 *   - User pehle register kar chuka hona chahiye
 * ============================================================
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

// ── Get email from command-line argument ───────────────────────────────────────
const email = process.argv[2];

if (!email) {
  console.error("❌  Email argument missing.");
  console.error("    Usage: node scripts/makeAdmin.js your@email.com");
  process.exit(1);
}

// ── Connect to MongoDB ─────────────────────────────────────────────────────────
try {
  await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
  console.log("✅  Database connected");
} catch (err) {
  console.error("❌  Database connection failed:", err.message);
  process.exit(1);
}

// ── Find user and promote ──────────────────────────────────────────────────────
const user = await User.findOne({ email: email.toLowerCase().trim() });

if (!user) {
  console.error(`❌  No user found with email: ${email}`);
  console.error("    Make sure the user has registered first.");
  await mongoose.disconnect();
  process.exit(1);
}

if (user.isAdmin) {
  console.log(`ℹ️   ${email} is already an admin. Nothing changed.`);
  await mongoose.disconnect();
  process.exit(0);
}

user.isAdmin = true;
await user.save();

console.log(`🎉  Success! "${user.name}" (${email}) is now an admin.`);
console.log("    They can log in and access /admin immediately.");

await mongoose.disconnect();
process.exit(0);
