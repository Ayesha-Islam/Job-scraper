import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';

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
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
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

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const configuredAdmins = (process.env.ADMIN_EMAILS ?? env.ADMIN_EMAILS ?? '')
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean);
    const email = req.user?.email?.trim().toLowerCase();

    if (!email || !configuredAdmins.includes(email)) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
        });
    }

    return next();
}
