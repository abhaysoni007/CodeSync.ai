import express from 'express';
import {
  getFileStructure,
  createFileOrFolder,
  renameFileOrFolder,
  deleteFileOrFolder,
  getFileContent,
  updateFileContent
} from '../controllers/FileSystemController.js';

const router = express.Router();

/**
 * @route   GET /api/filesystem/:projectId
 * @desc    Get file structure for a project
 * @access  Private (authenticated users only)
 */
router.get('/:projectId', getFileStructure);

/**
 * @route   POST /api/filesystem/:projectId/create
 * @desc    Create a new file or folder
 * @access  Private
 */
router.post('/:projectId/create', createFileOrFolder);

/**
 * @route   PUT /api/filesystem/:projectId/rename
 * @desc    Rename a file or folder
 * @access  Private
 */
router.put('/:projectId/rename', renameFileOrFolder);

/**
 * @route   DELETE /api/filesystem/:projectId/delete
 * @desc    Delete a file or folder
 * @access  Private
 */
router.delete('/:projectId/delete', deleteFileOrFolder);

/**
 * @route   GET /api/filesystem/:projectId/file
 * @desc    Get file content
 * @access  Private
 */
router.get('/:projectId/file', getFileContent);

/**
 * @route   PUT /api/filesystem/:projectId/file
 * @desc    Update file content
 * @access  Private
 */
router.put('/:projectId/file', updateFileContent);

export default router;
