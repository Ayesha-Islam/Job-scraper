import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../helpers/create-test-app';
import { createTestContainer } from '../helpers/create-test-container';

describe('Auth API routes', () => {
    let container: ReturnType<typeof createTestContainer>;
    let app: ReturnType<typeof createTestApp>;

    beforeEach(() => {
        vi.clearAllMocks();
        container = createTestContainer();
        app = createTestApp(container);

        container.authController.register.mockImplementation((_req, res) => {
            res.status(201).json({
                success: true,
                data: { id: 'user_1', email: 'ayesha@example.com', name: 'Ayesha' },
            });
        });

        container.authController.login.mockImplementation((_req, res) => {
            res.status(200).json({
                success: true,
                token: 'jwt_token',
                data: { id: 'user_1', email: 'ayesha@example.com', name: 'Ayesha Islam' },
            });
        });

        container.authController.me.mockImplementation((_req, res) => {
            res.status(200).json({
                success: true,
                data: 'Authenticated user context',
            });
        });
    });

    it('POST /api/v1/auth/register', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'ayesha@example.com', password: 'password123', name: 'Ayesha Islam' })
            .expect(201);

        expect(container.authController.register).toHaveBeenCalledTimes(1);
        expect(res.body.data.email).toBe('ayesha@example.com');
    });

    it('POST /api/v1/auth/login', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'ayesha@example.com', password: 'password123' })
            .expect(200);

        expect(container.authController.login).toHaveBeenCalledTimes(1);
        expect(res.body.token).toBe('jwt_token');
    });

    it('GET /api/v1/auth/me returns 401 without token', async () => {
        const res = await request(app)
            .get('/api/v1/auth/me')
            .expect(401);

        expect(container.authController.me).not.toHaveBeenCalled();
        expect(res.body).toEqual({
            success: false,
            error: 'Unauthorized',
        });
    });
});