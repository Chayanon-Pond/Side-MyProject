import jwt from "jsonwebtoken";
import { Router } from 'express';
import bcrypt from 'bcrypt';
import connectionPool from '../utils/database.js';

const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const user = {
      full_name: req.body.fullName,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    };

    // Validation
    if (!user.full_name || !user.username || !user.email || !user.password) {
      return res.status(400).json({ 
        error: "All fields are required" 
      });
    }

    // Check if user already exists
    const existingUser = await connectionPool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [user.email, user.username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: "User with this email or username already exists" 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    // Insert user to database
    const result = await connectionPool.query(
      'INSERT INTO users (full_name, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, username, email, role',
      [user.full_name, user.username, user.email, user.password, 'user'] // default role is 'user'
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: "Failed to register user" 
    });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("=== LOGIN DEBUG ===");
    console.log("Email:", email);
    console.log("Password received:", password);

    // Find user
    const result = await connectionPool.query(
      'SELECT id, full_name, username, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log("User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    console.log("User found:", user.full_name);
    console.log("Password hash in DB:", user.password_hash);

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password valid:", isValidPassword);
    
    if (!isValidPassword) {
      console.log("Password mismatch!");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Failed to login" });
  }
});




export default authRouter;