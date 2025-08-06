import jwt from "jsonwebtoken";
import { Router } from 'express';
import bcrypt from 'bcrypt';
import connectionPool from '../utils/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import fs from 'fs/promises';

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

// Update profile endpoint
authRouter.put("/profile", authenticateToken, (req, res) => {
  upload.single('profile_image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { full_name, username, email, bio } = req.body;
      const userId = req.user.id;

      // Validation
      if (!full_name || !username || !email) {
        return res.status(400).json({ 
          error: "Full name, username, and email are required" 
        });
      }

      // Check if username or email already exists for other users
      const existingUser = await connectionPool.query(
        'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
        [email, username, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          error: "Email or username already exists" 
        });
      }

      // Handle profile image
      let profile_image_url = null;
      if (req.file) {
        profile_image_url = `/uploads/profiles/${req.file.filename}`;
        
        // Delete old profile image if exists
        try {
          const oldUserResult = await connectionPool.query(
            'SELECT profile_image_url FROM users WHERE id = $1',
            [userId]
          );
          
          if (oldUserResult.rows[0]?.profile_image_url) {
            const oldImagePath = `./uploads/profiles/${oldUserResult.rows[0].profile_image_url.split('/').pop()}`;
            await fs.unlink(oldImagePath);
          }
        } catch (unlinkError) {
          console.log('Could not delete old profile image:', unlinkError.message);
        }
      }

      // Update user profile
      let updateQuery = `
        UPDATE users 
        SET full_name = $1, username = $2, email = $3, bio = $4, updated_at = CURRENT_TIMESTAMP
      `;
      let queryParams = [full_name, username, email, bio || null];

      if (profile_image_url) {
        updateQuery += `, profile_image_url = $5`;
        queryParams.push(profile_image_url);
      }

      updateQuery += ` WHERE id = $${queryParams.length + 1} RETURNING *`;
      queryParams.push(userId);

      const result = await connectionPool.query(updateQuery, queryParams);
      const updatedUser = result.rows[0];

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          full_name: updatedUser.full_name,
          username: updatedUser.username,
          email: updatedUser.email,
          bio: updatedUser.bio,
          profile_image_url: updatedUser.profile_image_url,
          role: updatedUser.role,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      // Delete uploaded file if database operation failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
});

// Reset password endpoint
authRouter.put("/reset-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: "Current password and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: "New password must be at least 6 characters long" 
      });
    }

    // Get current user
    const userResult = await connectionPool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        error: "New password must be different from current password" 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await connectionPool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, userId]
    );

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: "Failed to update password" });
  }
});



export default authRouter;