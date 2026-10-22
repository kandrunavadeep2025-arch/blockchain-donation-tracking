
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// Register a new donor account
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "An account with this email already exists."
          : "Registration failed.",
    });
  }
});

// Log in
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});

// Get the currently logged-in user
router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      walletAddress: req.user.walletAddress || null,
    },
  });
});

// Admin approves an NGO and links its wallet address
router.patch(
  "/approve-ngo",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const email = req.body.email?.trim().toLowerCase();
      const walletAddress = req.body.walletAddress?.trim();

      if (!email || !walletAddress) {
        return res.status(400).json({
          success: false,
          message: "Email and wallet address are required.",
        });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({
          success: false,
          message: "Invalid wallet address.",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      if (user.role === "admin") {
        return res.status(400).json({
          success: false,
          message: "An admin cannot be approved as an NGO.",
        });
      }

      const normalizedWallet = walletAddress.toLowerCase();

      const walletInUse = await User.findOne({
        walletAddress: normalizedWallet,
        _id: { $ne: user._id },
      });

      if (walletInUse) {
        return res.status(409).json({
          success: false,
          message: "This wallet is already linked to another user.",
        });
      }

      user.role = "ngo";
      user.walletAddress = normalizedWallet;
      await user.save();

      res.json({
        success: true,
        message: "NGO account approved and wallet linked.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
        },
      });
    } catch (error) {
      console.error("NGO approval error:", error.message);

      res.status(500).json({
        success: false,
        message: "Could not approve NGO account.",
      });
    }
  }
);

module.exports = router;
