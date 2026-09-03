import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const ROUTE = /^\/api\/([a-z0-9-]+)\/?$/;

/**
 * `npm run dev`에서 `api/*.ts`(Vercel Functions 웹 시그니처)를 그대로 실행하는 개발용 미들웨어.
 * 배포 환경에서는 Vercel이 직접 실행하므로 이 플러그인은 serve 모드에서만 동작한다.
 */
export default function devApi(): Plugin {
  return {
    name: 'zam-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const match = ROUTE.exec(url.pathname);
        if (!match) return next();

        const file = path.join(server.config.root, 'api', `${match[1]}.ts`);
        if (!existsSync(file)) return next();

        try {
          const mod = await server.ssrLoadModule(file);
          const method = req.method ?? 'GET';
          const handler = mod[method];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.end();
            return;
          }

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
          }
          const response: Response = await handler(new Request(url, { method, headers }));

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
    },
  };
}
