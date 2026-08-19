import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(here, '.auth');
const API = process.env.E2E_API_URL || 'http://localhost:5000';
const APP = process.env.E2E_APP_URL || 'http://localhost:5173';

/**
 * Sign up a throwaway user and give them a fresh project, then hand Playwright a logged-in
 * storage state.
 *
 * WHY through the API and not the login UI: every spec would otherwise pay for a login round trip,
 * and a broken login page would fail all of them instead of just the auth spec (which drives the
 * real form itself).
 */
export default async function globalSetup() {
  const api = await request.newContext({ baseURL: API });

  const stamp = Date.now();
  const credentials = {
    username: `e2e_${stamp}`,
    email: `e2e_${stamp}@example.com`,
    password: 'E2ePassw0rd!',
  };

  const signup = await api.post('/auth/signup', { data: credentials });
  if (!signup.ok()) {
    throw new Error(`E2E signup failed (${signup.status()}): ${await signup.text()}`);
  }
  // NOTE: /auth/* returns token+user at the top level, while /projects nests under `data`.
  const body = await signup.json();
  const token = body.token;
  const user = body.user;
  if (!token) throw new Error(`E2E signup returned no token: ${JSON.stringify(body)}`);

  const project = await api.post('/projects', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `e2e-${stamp}`, description: 'playwright fixture project', language: 'javascript' },
  });
  if (!project.ok()) {
    throw new Error(`E2E project create failed (${project.status()}): ${await project.text()}`);
  }
  const projectId = (await project.json()).data.project._id;

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(AUTH_DIR, 'state.json'),
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: APP,
          localStorage: [
            { name: 'token', value: token },
            { name: 'user', value: JSON.stringify(user) },
          ],
        },
      ],
    })
  );
  fs.writeFileSync(
    path.join(AUTH_DIR, 'fixture.json'),
    JSON.stringify({ projectId, token, user, credentials }, null, 2)
  );

  await api.dispose();
  console.log(`[e2e] user ${credentials.email} / project ${projectId}`);
}
