import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';
import { env } from '../config';

export class AuthController {
  constructor(private db: PrismaClient) { }

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedName = String(name).trim();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      if (normalizedName.split(/\s+/).length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Full name must contain at least two words',
        });
      }

      if (String(password).length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.db.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: normalizedName,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      return res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
        });
      }

      console.error('Registration Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      const user = await this.db.user.findUnique({
        where: { email: normalizedEmail },
      });

      const passwordMatch = user
        ? await bcrypt.compare(password, user.password)
        : false;

      if (!user || !passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        token,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error('Login Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Me Error:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
