import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createAcpServeRouter } from './backend/agentsam/acp/serve';
import { createAuthRouter, handleGitHubCallbackRoute, handleGoogleCallbackRoute } from './backend/agentsam/acp/auth';

// Load environment variables
dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // Standard middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request logger for ACP endpoints
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      console.log(`[ACP-SERVER] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health and Root Server Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Flash-Lite Browser with AgentSam ACP Serve',
      timestamp: new Date().toISOString(),
      env: {
        githubOAuth: Boolean(process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID),
        githubApp: Boolean(process.env.GITHUB_APP_ID),
        googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID),
        googleAi: Boolean(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY),
        googleServiceAccount: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      },
    });
  });

  // Mount AgentSam ACP Serve and Auth Sub-systems
  const acpRouter = createAcpServeRouter();
  const authRouter = createAuthRouter();

  app.use('/api/agentsam/acp', acpRouter);
  app.use('/api/acp', acpRouter);
  app.use('/api/auth', authRouter);

  // Dedicated OAuth popup callback routes
  app.get(['/auth/github/callback', '/auth/github/callback/'], handleGitHubCallbackRoute);
  app.get(['/auth/google/callback', '/auth/google/callback/'], handleGoogleCallbackRoute);
  app.get(['/auth/callback', '/auth/callback/'], (req: Request, res: Response) => {
    // Route to provider based on query params or fallback
    if (req.query.code && req.query.state && String(req.query.state).includes('google')) {
      return handleGoogleCallbackRoute(req, res);
    }
    return handleGitHubCallbackRoute(req, res);
  });

  // Gemini API Proxy endpoints for secure server-side execution
  app.post('/api/gemini/generate', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY or GOOGLE_AI_API_KEY is not configured on the server.' });
    }

    try {
      const { prompt, model = 'gemini-2.5-flash', systemInstruction } = req.body;
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({ error: err.message || 'Gemini generation failed' });
    }
  });

  // Vite middleware in development vs static file serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` AgentSam ACP Serve & OAuth Engine running on port ${PORT}`);
    console.log(` ACP Endpoint: http://${HOST}:${PORT}/api/agentsam/acp/serve`);
    console.log(` GitHub Callback: http://${HOST}:${PORT}/auth/github/callback`);
    console.log(` Google Callback: http://${HOST}:${PORT}/auth/google/callback`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
