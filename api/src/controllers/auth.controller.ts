import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg'; 

export class AuthController {
  constructor(private pool: Pool) {}

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
      }

      // Check if user exists
      const existingUser = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }

      // Secure password hashing
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await this.pool.query(
        `INSERT INTO users (email, password, name, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email, name, created_at`,
        [email, hashedPassword, name]
      );

      res.status(201).json({ 
        success: true, 
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      // Create a secure token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '24h' }
      );

      res.status(200).json({
        success: true,
        token,
        data: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async me(req: Request, res: Response) {
    // Logic to return the currently logged-in user
    res.status(200).json({ success: true, data: "Authenticated user context" });
  }
}