import mongoose from 'mongoose';
import Project from '../models/Project.js';

/**
 * Membership gate for anything scoped to a project.
 *
 * WHY: `authenticate` only proves *someone* is logged in. The filesystem and preview routes take
 * the project id straight from the URL, so without this any account could read or overwrite every
 * other project's files by guessing an id. The terminal already made this check itself
 * (canUseProject in TerminalSocketHandlers); this is the same rule for HTTP.
 */
export const isProjectMember = async (projectId, userId) => {
  if (!userId || !mongoose.isValidObjectId(projectId)) return false;
  const project = await Project.findOne({
    _id: projectId,
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  }).select('_id');
  return Boolean(project);
};

export const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    if (!(await isProjectMember(projectId, req.userId))) {
      return res.status(403).json({ success: false, message: 'You do not have access to this project.' });
    }
    next();
  } catch (error) {
    console.error('Project access check failed:', error);
    res.status(500).json({ success: false, message: 'Access check failed' });
  }
};

export default { requireProjectMember, isProjectMember };
