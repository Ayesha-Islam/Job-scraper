import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config';


export const createAuthRoutes = () => {
    const router = Router();

    router.post('/register', async (req: Request, res: Response) => {
        try {
            const { email, password, name } = req.body;

            if (!email || !password || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters'
                });
            }

            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'User already exists'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                `INSERT INTO users (email, password, name, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING id, email, name, created_at`,
                [email, hashedPassword, name]
            );

            const user = result.rows[0];

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    createdAt: user.created_at
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });


    router.post('/login', async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing email or password'
                });
            }

            const result = await pool.query(
                'SELECT id, email, name, password FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            const user = result.rows[0];

            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    router.get('/me', async (req: Request, res: Response) => {
        try {
            res.status(200).json({
                success: true,
                data: null
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    return router;
}