import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type AuthTokenPayload = {
    id?: number;
    userId?: number;
    email?: string;
};

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email?: string;
            };
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
        });
    }

    const token = authorization.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET || 'your_secret_key';

    try {
        const payload = jwt.verify(token, secret) as AuthTokenPayload;
        const userId = payload.id ?? payload.userId;

        if (!userId || Number.isNaN(Number(userId))) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        req.user = {
            id: Number(userId),
            email: payload.email,
        };

        return next();
    } catch {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
        });
    }
}