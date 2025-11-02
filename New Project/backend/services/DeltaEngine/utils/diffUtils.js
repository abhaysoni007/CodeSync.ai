import * as Diff from 'diff';

/**
 * Compute delta diff between two text contents
 */
export function computeDiff(oldContent, newContent) {
  try {
    const oldText = oldContent || '';
    const newText = newContent || '';

    // Compute line-based diff
    const patches = Diff.createPatch('file', oldText, newText);
    
    // Compute character-based diff for statistics
    const charDiff = Diff.diffChars(oldText, newText);
    
    // Calculate statistics
    const stats = {
      linesAdded: 0,
      linesRemoved: 0,
      charsAdded: 0,
      charsRemoved: 0
    };

    charDiff.forEach(part => {
      if (part.added) {
        stats.charsAdded += part.count || 0;
      } else if (part.removed) {
        stats.charsRemoved += part.count || 0;
      }
    });

    // Count line changes
    const lines = patches.split('\n');
    lines.forEach(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        stats.linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        stats.linesRemoved++;
      }
    });

    return {
      patch: patches,
      stats,
      hasChanges: oldText !== newText
    };
  } catch (error) {
    console.error('[DiffUtils] Compute diff error:', error);
    throw error;
  }
}

/**
 * Apply patch to content
 */
export function applyPatch(oldContent, patch) {
  try {
    if (!patch || patch.trim().length === 0) {
      return oldContent;
    }

    const result = Diff.applyPatch(oldContent || '', patch);
    
    if (result === false) {
      throw new Error('Failed to apply patch');
    }

    return result;
  } catch (error) {
    console.error('[DiffUtils] Apply patch error:', error);
    throw error;
  }
}

/**
 * Compute structural diff (for two-pane diff viewer)
 */
export function computeStructuralDiff(oldContent, newContent) {
  try {
    const changes = Diff.diffLines(oldContent || '', newContent || '');
    
    const structured = {
      additions: [],
      deletions: [],
      modifications: []
    };

    let lineNumber = 0;
    
    changes.forEach(change => {
      const lines = change.value.split('\n').filter(l => l !== '');
      
      if (change.added) {
        structured.additions.push({
          startLine: lineNumber,
          endLine: lineNumber + lines.length,
          content: lines
        });
        lineNumber += lines.length;
      } else if (change.removed) {
        structured.deletions.push({
          startLine: lineNumber,
          endLine: lineNumber + lines.length,
          content: lines
        });
      } else {
        lineNumber += lines.length;
      }
    });

    return structured;
  } catch (error) {
    console.error('[DiffUtils] Compute structural diff error:', error);
    throw error;
  }
}

/**
 * Merge multiple patches
 */
export function mergePatches(patches) {
  try {
    if (!patches || patches.length === 0) {
      return '';
    }

    if (patches.length === 1) {
      return patches[0];
    }

    // Apply patches sequentially
    let content = '';
    
    for (const patch of patches) {
      content = applyPatch(content, patch);
    }

    return content;
  } catch (error) {
    console.error('[DiffUtils] Merge patches error:', error);
    throw error;
  }
}

/**
 * Check if two contents are identical
 */
export function areContentsEqual(content1, content2) {
  return (content1 || '') === (content2 || '');
}

/**
 * Get diff statistics
 */
export function getDiffStats(oldContent, newContent) {
  const diff = computeDiff(oldContent, newContent);
  return diff.stats;
}

/**
 * Format patch for display
 */
export function formatPatchForDisplay(patch) {
  try {
    const lines = patch.split('\n');
    
    return lines.map(line => {
      if (line.startsWith('+++') || line.startsWith('---')) {
        return { type: 'header', content: line };
      } else if (line.startsWith('+')) {
        return { type: 'addition', content: line.substring(1) };
      } else if (line.startsWith('-')) {
        return { type: 'deletion', content: line.substring(1) };
      } else if (line.startsWith('@@')) {
        return { type: 'hunk', content: line };
      } else {
        return { type: 'context', content: line };
      }
    });
  } catch (error) {
    console.error('[DiffUtils] Format patch error:', error);
    return [];
  }
}
