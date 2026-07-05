import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { AuthController } from '../../src/controllers/auth.controller';

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
    },
}));

function createRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    };
}

describe('AuthController', () => {
    let db: any;
    let controller: AuthController;
    let res: ReturnType<typeof createRes>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });

        db = {
            user: {
                create: vi.fn(),
                findUnique: vi.fn(),
            },
        };

        controller = new AuthController(db);
        res = createRes();

        process.env.JWT_SECRET = 'test_secret';
    });

    it('register rejects missing fields', async () => {
        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'password123',
            },
        };

        await controller.register(req, res as any);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Missing required fields',
        });
        expect(db.user.create).not.toHaveBeenCalled();
    });

    it('register rejects invalid email', async () => {
        const req: any = {
            body: {
                email: 'invalid-email',
                password: 'password123',
                name: 'Ayesha Islam',
            },
        };

        await controller.register(req, res as any);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid email format',
        });
        expect(db.user.create).not.toHaveBeenCalled();
    });

    it('register rejects single-word full name', async () => {
        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'password123',
                name: 'Ayesha',
            },
        };

        await controller.register(req, res as any);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Full name must contain at least two words',
        });
        expect(db.user.create).not.toHaveBeenCalled();
    });

    it('register rejects short password', async () => {
        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: '1234567',
                name: 'Ayesha Islam',
            },
        };

        await controller.register(req, res as any);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Password must be at least 8 characters long',
        });
        expect(db.user.create).not.toHaveBeenCalled();
    });

    it('register hashes password and creates user', async () => {
        vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);

        const createdUser = {
            id: 1,
            email: 'ayesha@example.com',
            name: 'Ayesha Islam',
            createdAt: new Date('2026-06-22T00:00:00.000Z'),
        };

        db.user.create.mockResolvedValue(createdUser);

        const req: any = {
            body: {
                email: '  Ayesha@Example.com  ',
                password: 'password123',
                name: '  Ayesha Islam  ',
            },
        };

        await controller.register(req, res as any);

        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        expect(db.user.create).toHaveBeenCalledWith({
            data: {
                email: 'ayesha@example.com',
                password: 'hashed_password',
                name: 'Ayesha Islam',
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: createdUser,
        });
    });

    it('register handles duplicate email', async () => {
        vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);

        const duplicateError = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            {
                code: 'P2002',
                clientVersion: 'test',
            }
        );

        db.user.create.mockRejectedValue(duplicateError);

        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'password123',
                name: 'Ayesha Islam',
            },
        };

        await controller.register(req, res as any);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'User already exists',
        });
    });

    it('register returns 500 for unexpected errors', async () => {
        vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as never);
        db.user.create.mockRejectedValue(new Error('db failed'));

        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'password123',
                name: 'Ayesha Islam',
            },
        };

        await controller.register(req, res as any);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Internal server error',
        });
    });

    it('login rejects missing fields', async () => {
        const req: any = {
            body: {
                email: 'ayesha@example.com',
            },
        };

        await controller.login(req, res as any);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Missing required fields',
        });
        expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it('login rejects invalid credentials when user does not exist', async () => {
        db.user.findUnique.mockResolvedValue(null);

        const req: any = {
            body: {
                email: '  Missing@Example.com  ',
                password: 'wrong-password',
            },
        };

        await controller.login(req, res as any);

        expect(db.user.findUnique).toHaveBeenCalledWith({
            where: {
                email: 'missing@example.com',
            },
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid email or password',
        });
    });

    it('login rejects invalid password for existing user', async () => {
        db.user.findUnique.mockResolvedValue({
            id: 1,
            email: 'ayesha@example.com',
            password: 'hashed_password',
            name: 'Ayesha Islam',
        });

        vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'wrong-password',
            },
        };

        await controller.login(req, res as any);

        expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed_password');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid email or password',
        });
    });

    it('login returns JWT for valid credentials', async () => {
        const user = {
            id: 1,
            email: 'ayesha@example.com',
            password: 'hashed_password',
            name: 'Ayesha Islam',
        };

        db.user.findUnique.mockResolvedValue(user);
        vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
        vi.mocked(jwt.sign).mockReturnValue('jwt_token' as never);

        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'password123',
            },
        };

        await controller.login(req, res as any);

        expect(jwt.sign).toHaveBeenCalledWith(
            {
                id: 1,
                email: 'ayesha@example.com',
            },
            'test_secret',
            {
                expiresIn: '24h',
            }
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            token: 'jwt_token',
            data: {
                id: 1,
                email: 'ayesha@example.com',
                name: 'Ayesha Islam',
            },
        });
    });

    it('login returns 500 for unexpected errors', async () => {
        db.user.findUnique.mockRejectedValue(new Error('db failed'));

        const req: any = {
            body: {
                email: 'ayesha@example.com',
                password: 'password123',
            },
        };

        await controller.login(req, res as any);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Internal server error',
        });
    });

    it('me rejects unauthenticated requests', async () => {
        const req = {} as any;

        await controller.me(req, res as any);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Unauthorized',
        });
    });
});