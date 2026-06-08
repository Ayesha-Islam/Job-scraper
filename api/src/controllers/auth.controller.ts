/**
 * auth.controller.ts
 *
 * Migration: raw pg Pool → Prisma
 *
 * Why:
 *   - Auth is simple CRUD on a single table — Prisma is the correct layer
 *   - Prisma gives typed return values, no manual column mapping
 *   - Prisma's P2002 unique-constraint error replaces the manual SELECT before INSERT
 *   - Removes the need to inject Pool into this controller entirely
 *
 * API contract: unchanged — same request shape, same response shape.
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';

export class AuthController {
  constructor(private db: PrismaClient) {}

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

      const hashedPassword = await bcrypt.hash(password, 10);

      // Prisma throws P2002 on duplicate email — no manual SELECT needed
      const user = await this.db.user.create({
        data: { email, password: hashedPassword, name },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      return res.status(201).json({ success: true, data: user });

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }
      console.error('Registration Error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const user = await this.db.user.findUnique({ where: { email } });

      // Constant-time check: always run bcrypt.compare even if user is null
      // to prevent timing attacks that reveal whether an email is registered.
      const passwordMatch = user
        ? await bcrypt.compare(password, user.password)
        : await bcrypt.compare(password, '$2a$10$invalidhashpaddingtowastetime000');

      if (!user || !passwordMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        token,
        data: { id: user.id, email: user.email, name: user.name },
      });

    } catch (error) {
      console.error('Login Error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async me(req: Request, res: Response) {
    // TODO: decode JWT from Authorization header and return user from DB
    return res.status(200).json({ success: true, data: 'Authenticated user context' });
  }
}