import express from 'express';
import multer from 'multer';
import {
  getFileStructure,
  createFileOrFolder,
  renameFileOrFolder,
  deleteFileOrFolder,
  getFileContent,
  updateFileContent,
  moveFileOrFolder,
  searchProject,
  downloadFile,
  uploadFiles,
} from '../controllers/FileSystemController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/projectAccess.js';

const router = express.Router();

// WHY: this router had no auth — any request could read/write another project's files.
// Authentication alone was still not enough: any *logged-in* user could pass any projectId, so
// membership is checked too.
router.use(authenticate);
router.use('/:projectId', requireProjectMember);

// Uploads stay in memory and are written straight into the project dir; multer's own disk storage
// would put them somewhere else and need a second move.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
});

router.get('/:projectId', getFileStructure);
router.post('/:projectId/create', createFileOrFolder);
router.put('/:projectId/rename', renameFileOrFolder);
router.delete('/:projectId/delete', deleteFileOrFolder);
router.get('/:projectId/file', getFileContent);
router.put('/:projectId/file', updateFileContent);
router.post('/:projectId/move', moveFileOrFolder);
router.get('/:projectId/search', searchProject);
router.get('/:projectId/download', downloadFile);
router.post('/:projectId/upload', upload.array('files'), uploadFiles);

export default router;
