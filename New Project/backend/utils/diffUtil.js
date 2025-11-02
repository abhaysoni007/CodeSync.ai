import crypto from 'crypto';

/**
 * Diff Utility for comparing file versions
 * Uses line-based diff algorithm similar to difflib
 */

/**
 * Calculate hash of content
 */
export const calculateHash = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Split content into lines
 */
const getLines = (content) => {
  if (!content) return [];
  return content.split('\n');
};

/**
 * Generate unified diff between two texts
 */
export const generateDiff = (oldContent, newContent) => {
  const oldLines = getLines(oldContent);
  const newLines = getLines(newContent);

  const diff = {
    additions: [],
    deletions: [],
    changes: []
  };

  // Simple line-by-line comparison
  const maxLength = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      // Line added
      diff.additions.push({
        lineNumber: i + 1,
        content: newLine
      });
    } else if (oldLine !== undefined && newLine === undefined) {
      // Line deleted
      diff.deletions.push({
        lineNumber: i + 1,
        content: oldLine
      });
    } else if (oldLine !== newLine) {
      // Line changed
      diff.changes.push({
        lineNumber: i + 1,
        oldContent: oldLine,
        newContent: newLine
      });
    }
  }

  return diff;
};

/**
 * Generate unified diff string (similar to git diff)
 */
export const generateUnifiedDiff = (oldContent, newContent, oldLabel = 'old', newLabel = 'new') => {
  const oldLines = getLines(oldContent);
  const newLines = getLines(newContent);

  let diffString = `--- ${oldLabel}\n+++ ${newLabel}\n`;
  const maxLength = Math.max(oldLines.length, newLines.length);

  let hunkStart = 0;
  let hunkLines = [];

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      hunkLines.push(` ${oldLine || ''}`);
    } else {
      if (oldLine !== undefined) {
        hunkLines.push(`-${oldLine}`);
      }
      if (newLine !== undefined) {
        hunkLines.push(`+${newLine}`);
      }
    }
  }

  if (hunkLines.length > 0) {
    diffString += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
    diffString += hunkLines.join('\n');
  }

  return diffString;
};

/**
 * Calculate diff statistics
 */
export const getDiffStats = (oldContent, newContent) => {
  const oldLines = getLines(oldContent);
  const newLines = getLines(newContent);

  const diff = generateDiff(oldContent, newContent);

  return {
    linesAdded: diff.additions.length,
    linesRemoved: diff.deletions.length,
    linesChanged: diff.changes.length,
    oldLineCount: oldLines.length,
    newLineCount: newLines.length,
    charactersAdded: Math.max(0, newContent.length - oldContent.length),
    charactersRemoved: Math.max(0, oldContent.length - newContent.length),
    totalChanges: diff.additions.length + diff.deletions.length + diff.changes.length
  };
};

/**
 * Apply patch to content (simple implementation)
 */
export const applyPatch = (originalContent, patchData) => {
  // This is a simplified version
  // In production, use a proper patch library
  const lines = getLines(originalContent);
  
  // Apply deletions (in reverse order to maintain line numbers)
  if (patchData.deletions) {
    patchData.deletions.reverse().forEach(deletion => {
      lines.splice(deletion.lineNumber - 1, 1);
    });
  }

  // Apply additions
  if (patchData.additions) {
    patchData.additions.forEach(addition => {
      lines.splice(addition.lineNumber - 1, 0, addition.content);
    });
  }

  // Apply changes
  if (patchData.changes) {
    patchData.changes.forEach(change => {
      lines[change.lineNumber - 1] = change.newContent;
    });
  }

  return lines.join('\n');
};

/**
 * Compare two versions and generate a readable summary
 */
export const generateVersionSummary = (oldVersion, newVersion) => {
  const stats = getDiffStats(oldVersion.content, newVersion.content);
  
  return {
    oldVersion: oldVersion.versionNumber,
    newVersion: newVersion.versionNumber,
    stats,
    summary: `${stats.linesAdded} lines added, ${stats.linesRemoved} lines removed, ${stats.linesChanged} lines changed`
  };
};

export default {
  calculateHash,
  generateDiff,
  generateUnifiedDiff,
  getDiffStats,
  applyPatch,
  generateVersionSummary
};
