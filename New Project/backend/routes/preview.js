/**
 * Live browser preview of a project's files.
 *
 * WHY: an HTML/CSS/JS file has no meaning in a terminal - "run" for the web means "open it in a
 * browser". The explorer's Run button had no answer for .html at all. This serves the project
 * directory over HTTP so index.html loads with its real stylesheets, scripts and images.
 *
 * AUTH: a browser tab cannot send an Authorization header, and subresources (css/js/img) would
 * drop a token in the query string. So the first hit carries `?t=<jwt>`, we verify it and set a
 * short-lived httpOnly cookie scoped to this project's preview path; every subresource then
 * authenticates on the cookie.
 *
 * ponytail: preview is served from the API origin. Real IDEs use a separate sandbox domain so
 * user JS cannot touch the API origin at all. The cookie is httpOnly and the API only accepts
 * Bearer tokens, so there is nothing here for injected JS to steal today - move it to its own
 * host before this serves untrusted third-party projects.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../utils/jwt.js';
import { isProjectMember } from '../middleware/projectAccess.js';
import { resolveProjectPath } from '../controllers/FileSystemController.js';

const router = express.Router();

const COOKIE = (projectId) => `cs_preview_${projectId}`;
const COOKIE_MAX_AGE = 2 * 60 * 60 * 1000; // 2h

const previewAuth = async (req, res, next) => {
  const { projectId } = req.params;
  const token = req.query.t || req.cookies?.[COOKIE(projectId)];
  if (!token) return res.status(401).send('Preview link expired. Re-open it from the editor.');

  try {
    const decoded = verifyToken(token);
    if (!(await isProjectMember(projectId, decoded.id))) {
      return res.status(403).send('You do not have access to this project.');
    }
    if (req.query.t) {
      res.cookie(COOKIE(projectId), token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure,
        path: `/preview/${projectId}`,
        maxAge: COOKIE_MAX_AGE,
      });
    }
    next();
  } catch {
    res.status(401).send('Preview link expired. Re-open it from the editor.');
  }
};

router.get('/:projectId/*', previewAuth, (req, res) => {
  const { projectId } = req.params;
  const requested = req.params[0] || '';

  let target;
  try {
    ({ target } = resolveProjectPath(projectId, requested.split('/').filter(Boolean)));
  } catch (error) {
    return res.status(400).send(error.message);
  }

  // A folder (including the project root) means "serve its index.html", the way any static host does.
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }
  if (!fs.existsSync(target)) return res.status(404).send(`Not found: /${requested}`);

  // Never let the browser cache a file the user is actively editing.
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(target);
});

// `/preview/:projectId` with no trailing path.
router.get('/:projectId', previewAuth, (req, res) =>
  res.redirect(`/preview/${req.params.projectId}/index.html`)
);

export default router;
