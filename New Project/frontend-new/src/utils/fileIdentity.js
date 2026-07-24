/**
 * Single file identity for the editor.
 *
 * WHY: the app used to have two file backends with two identities — the editor keyed files by a
 * Mongo `_id`, the file tree by a `path` array of node ids. We unify on the tree path. The derived
 * string id is what the naive `code-update` collaboration groups edits by, so it must be identical
 * for every user selecting the same file (node ids come from the shared server structure, so a
 * joined path is stable across clients).
 */

// Stable string id for a file, derived from its path (array of node ids from the tree root).
export const fileIdFromPath = (path) => (path || []).join('/');

// Shape a file-tree node + its path into the object the editor pane expects.
export const makeActiveFile = (node, path) => ({
  _id: fileIdFromPath(path),
  name: node.name,
  path,
  content: node.content ?? '',
});
