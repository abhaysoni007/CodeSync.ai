import File from '../models/File.js';
import FileVersion from '../models/FileVersion.js';
import { calculateHash, generateUnifiedDiff, getDiffStats } from '../utils/diffUtil.js';

/**
 * File Version Controller
 * Handles file snapshots, version history, and reverts
 */

/**
 * @route   POST /files/:id/save-snapshot
 * @desc    Save a snapshot of the file
 * @access  Private
 */
export const saveSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, message, tags } = req.body;

    // Get the file
    const file = await File.findById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has permission
    // In production, add proper permission checks
    
    // Get the last version
    const lastVersion = await FileVersion.findOne({ fileId: id })
      .sort({ versionNumber: -1 })
      .limit(1);

    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
    const oldContent = file.content || '';
    const newContent = content;

    // Calculate hash
    const contentHash = calculateHash(newContent);

    // Check if content actually changed
    if (lastVersion && lastVersion.contentHash === contentHash) {
      return res.status(400).json({
        success: false,
        message: 'No changes detected. Content is identical to last version.'
      });
    }

    // Generate diff
    const diffString = generateUnifiedDiff(
      oldContent, 
      newContent,
      `v${lastVersion?.versionNumber || 0}`,
      `v${versionNumber}`
    );

    // Get diff statistics
    const stats = getDiffStats(oldContent, newContent);

    // Create new version
    const version = new FileVersion({
      fileId: id,
      versionNumber,
      content: newContent,
      contentHash,
      diff: diffString,
      createdBy: req.userId,
      message: message || `Version ${versionNumber}`,
      size: Buffer.byteLength(newContent, 'utf8'),
      isAutoSave: false,
      tags: tags || [],
      metadata: {
        linesAdded: stats.linesAdded,
        linesRemoved: stats.linesRemoved,
        charactersAdded: stats.charactersAdded,
        charactersRemoved: stats.charactersRemoved
      }
    });

    await version.save();

    // Update file
    file.content = newContent;
    file.size = version.size;
    file.lastModifiedBy = req.userId;
    file.metadata.lineCount = newContent.split('\n').length;
    await file.save();

    // Populate creator info
    await version.populate('createdBy', 'username email avatar');

    res.status(201).json({
      success: true,
      message: 'Snapshot saved successfully',
      data: {
        version,
        stats
      }
    });
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving snapshot',
      error: error.message
    });
  }
};

/**
 * @route   GET /files/:id/versions
 * @desc    Get version history for a file
 * @access  Private
 */
export const getVersionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, includeAutoSave = false } = req.query;

    // Check if file exists
    const file = await File.findById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Build query
    const query = { fileId: id };
    
    if (includeAutoSave !== 'true') {
      query.isAutoSave = false;
    }

    // Get versions with pagination
    const versions = await FileVersion.find(query)
      .populate('createdBy', 'username email avatar')
      .sort({ versionNumber: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-diff'); // Exclude diff for list view

    const total = await FileVersion.countDocuments(query);

    res.json({
      success: true,
      data: {
        file: {
          id: file._id,
          name: file.name,
          path: file.path,
          currentVersion: versions.length > 0 ? versions[0].versionNumber : 0
        },
        versions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching version history',
      error: error.message
    });
  }
};

/**
 * @route   GET /files/:id/versions/:versionNumber
 * @desc    Get specific version details including diff
 * @access  Private
 */
export const getVersionDetails = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;

    const version = await FileVersion.findOne({
      fileId: id,
      versionNumber: parseInt(versionNumber)
    }).populate('createdBy', 'username email avatar');

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    res.json({
      success: true,
      data: { version }
    });
  } catch (error) {
    console.error('Error fetching version details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching version details',
      error: error.message
    });
  }
};

/**
 * @route   POST /files/:id/revert/:versionNumber
 * @desc    Revert file to a specific version
 * @access  Private
 */
export const revertToVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const { createSnapshot = true } = req.body;

    // Get the file
    const file = await File.findById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get the target version
    const targetVersion = await FileVersion.findOne({
      fileId: id,
      versionNumber: parseInt(versionNumber)
    });

    if (!targetVersion) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    const oldContent = file.content;
    const newContent = targetVersion.content;

    // Create a snapshot of current state before reverting
    if (createSnapshot) {
      const currentVersion = await FileVersion.findOne({ fileId: id })
        .sort({ versionNumber: -1 })
        .limit(1);

      const snapshotNumber = currentVersion ? currentVersion.versionNumber + 1 : 1;
      
      const snapshot = new FileVersion({
        fileId: id,
        versionNumber: snapshotNumber,
        content: oldContent,
        contentHash: calculateHash(oldContent),
        diff: generateUnifiedDiff(oldContent, oldContent, `v${snapshotNumber}`, `v${snapshotNumber}`),
        createdBy: req.userId,
        message: `Snapshot before reverting to v${versionNumber}`,
        size: Buffer.byteLength(oldContent, 'utf8'),
        isAutoSave: false,
        tags: ['pre-revert', 'snapshot']
      });

      await snapshot.save();
    }

    // Calculate stats for the revert
    const stats = getDiffStats(oldContent, newContent);

    // Update the file
    file.content = newContent;
    file.size = targetVersion.size;
    file.lastModifiedBy = req.userId;
    file.metadata.lineCount = newContent.split('\n').length;
    await file.save();

    // Get latest version number for new revert version
    const latestVersion = await FileVersion.findOne({ fileId: id })
      .sort({ versionNumber: -1 })
      .limit(1);

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create new version for the revert
    const revertVersion = new FileVersion({
      fileId: id,
      versionNumber: newVersionNumber,
      content: newContent,
      contentHash: targetVersion.contentHash,
      diff: generateUnifiedDiff(oldContent, newContent, 'current', `reverted to v${versionNumber}`),
      createdBy: req.userId,
      message: `Reverted to version ${versionNumber}`,
      size: targetVersion.size,
      isAutoSave: false,
      tags: ['revert'],
      metadata: {
        linesAdded: stats.linesAdded,
        linesRemoved: stats.linesRemoved,
        charactersAdded: stats.charactersAdded,
        charactersRemoved: stats.charactersRemoved
      }
    });

    await revertVersion.save();
    await revertVersion.populate('createdBy', 'username email avatar');

    res.json({
      success: true,
      message: `Successfully reverted to version ${versionNumber}`,
      data: {
        file,
        revertedFrom: versionNumber,
        newVersion: revertVersion,
        stats
      }
    });
  } catch (error) {
    console.error('Error reverting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverting file',
      error: error.message
    });
  }
};

/**
 * @route   GET /files/:id/compare/:versionA/:versionB
 * @desc    Compare two versions of a file
 * @access  Private
 */
export const compareVersions = async (req, res) => {
  try {
    const { id, versionA, versionB } = req.params;

    const [versionADoc, versionBDoc] = await Promise.all([
      FileVersion.findOne({ fileId: id, versionNumber: parseInt(versionA) }),
      FileVersion.findOne({ fileId: id, versionNumber: parseInt(versionB) })
    ]);

    if (!versionADoc || !versionBDoc) {
      return res.status(404).json({
        success: false,
        message: 'One or both versions not found'
      });
    }

    // Generate diff
    const diffString = generateUnifiedDiff(
      versionADoc.content,
      versionBDoc.content,
      `v${versionA}`,
      `v${versionB}`
    );

    const stats = getDiffStats(versionADoc.content, versionBDoc.content);

    res.json({
      success: true,
      data: {
        versionA: {
          number: versionADoc.versionNumber,
          message: versionADoc.message,
          createdAt: versionADoc.createdAt
        },
        versionB: {
          number: versionBDoc.versionNumber,
          message: versionBDoc.message,
          createdAt: versionBDoc.createdAt
        },
        diff: diffString,
        stats
      }
    });
  } catch (error) {
    console.error('Error comparing versions:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing versions',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /files/:id/versions/:versionNumber
 * @desc    Delete a specific version (soft delete)
 * @access  Private
 */
export const deleteVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;

    // Don't allow deleting the latest version
    const latestVersion = await FileVersion.findOne({ fileId: id })
      .sort({ versionNumber: -1 })
      .limit(1);

    if (latestVersion && latestVersion.versionNumber === parseInt(versionNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the latest version'
      });
    }

    const version = await FileVersion.findOneAndDelete({
      fileId: id,
      versionNumber: parseInt(versionNumber)
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    res.json({
      success: true,
      message: 'Version deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting version',
      error: error.message
    });
  }
};

export default {
  saveSnapshot,
  getVersionHistory,
  getVersionDetails,
  revertToVersion,
  compareVersions,
  deleteVersion
};
