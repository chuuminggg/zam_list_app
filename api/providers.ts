import { listProviders } from '../server/providers/index.js';
import { ok, route } from '../server/respond.js';

/** GET /api/providers — 공급자 목록과 활성화 여부 */
export const GET = route(async () => ok({ providers: listProviders() }, 60));
