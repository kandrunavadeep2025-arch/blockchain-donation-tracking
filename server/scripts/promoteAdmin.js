require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function promoteAdmin() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error(
      'Usage: node scripts/promoteAdmin.js "your-registered-email"'
    );
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });

    if (!user) {
      console.error(
        "User not found. Register this email first."
      );
      process.exitCode = 1;
      return;
    }

    user.role = "admin";
    await user.save();

    console.log("Admin role assigned successfully!");
    console.log("Name:", user.name);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
  } catch (error) {
    console.error("Could not assign admin role:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

promoteAdmin();
