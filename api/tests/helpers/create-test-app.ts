import express from 'express';
import { createRoutes } from '../../src/routes';

export function createTestApp(container: any) {
    const app = express();

    app.use(express.json());
    app.use(createRoutes(container));

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found',
            path: req.path,
        });
    });

    app.use((err: any, _req: any, res: any, _next: any) => {
        res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Internal server error',
        });
    });

    return app;
}