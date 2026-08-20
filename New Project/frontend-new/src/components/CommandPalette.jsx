import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * One overlay, three modes - the same thing VS Code does with one widget:
 *   'command' (Ctrl+Shift+P)  run an action
 *   'file'    (Ctrl+P)        open a file by name
 *   'line'    (Ctrl+G)        jump to a line in the open file
 *
 * Kept as a single component because all three share the filter box, the keyboard handling and the
 * highlight - three near-identical modals would be three places to fix every keyboard bug.
 */

/** Every file in the tree, flattened to a pickable list. */
const flattenFiles = (node, out = []) => {
  for (const child of node?.children || []) {
    if (child.type === 'folder') flattenFiles(child, out);
    else out.push(child);
  }
  return out;
};

// Subsequence match, so "prjrm" finds "pages/ProjectRoom.jsx" the way a fuzzy finder should.
const fuzzyMatch = (needle, haystack) => {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let i = 0;
  for (const char of h) {
    if (char === n[i]) i += 1;
    if (i === n.length) return true;
  }
  return n.length === 0;
};

const CommandPalette = ({ mode, commands, fileTree, onRunCommand, onOpenFile, onGoToLine, onClose }) => {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    setQuery(mode === 'command' ? '>' : '');
    setIndex(0);
    inputRef.current?.focus();
  }, [mode]);

  const files = useMemo(() => flattenFiles(fileTree), [fileTree]);

  const items = useMemo(() => {
    if (mode === 'line') return [];
    const term = mode === 'command' ? query.replace(/^>/, '').trim() : query.trim();
    const source =
      mode === 'command'
        ? commands.map((c) => ({ key: c.id, label: c.label, hint: c.hint, command: c }))
        : files.map((f) => ({ key: f.id, label: f.name, hint: f.path.join('/'), file: f }));

    // Rank before slicing: a subsequence match is generous enough that typing "Ports" also hits
    // "Reopen Closed Editor", and the top entry is the one Enter runs.
    const score = (item) => {
      const label = item.label.toLowerCase();
      const needle = term.toLowerCase();
      if (!needle) return 0;
      if (label.startsWith(needle)) return 3;
      if (label.includes(needle)) return 2;
      if ((item.hint || '').toLowerCase().includes(needle)) return 1;
      return 0;
    };

    return source
      .filter((item) => fuzzyMatch(term, `${item.label} ${item.hint || ''}`))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 50);
  }, [mode, query, commands, files]);

  const choose = (item) => {
    if (!item) return;
    if (item.command) onRunCommand(item.command);
    else if (item.file) onOpenFile(item.file);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'line') {
        const line = parseInt(query.replace(/\D/g, ''), 10);
        if (line > 0) onGoToLine(line);
        onClose();
      } else {
        choose(items[index]);
      }
    }
  };

  const placeholder =
    mode === 'command'
      ? 'Type a command'
      : mode === 'line'
        ? 'Go to line number'
        : 'Go to file';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/40"
      onClick={onClose}
      data-testid="command-palette"
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[36rem] max-w-[92vw] bg-vscode-panel border border-vscode-border rounded-lg shadow-2xl overflow-hidden"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          data-testid="palette-input"
          className="w-full px-4 py-3 bg-vscode-bg text-vscode-text border-b border-vscode-border focus:outline-none"
        />

        <div className="max-h-80 overflow-y-auto">
          {mode === 'line' && (
            <p className="px-4 py-3 text-sm text-vscode-textMuted">
              Enter a line number and press Enter.
            </p>
          )}

          {mode !== 'line' && items.length === 0 && (
            <p className="px-4 py-3 text-sm text-vscode-textMuted">No matches</p>
          )}

          {items.map((item, i) => (
            <button
              key={item.key}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(item)}
              className={`w-full text-left px-4 py-2 flex items-baseline justify-between gap-4 ${
                i === index ? 'bg-vscode-active text-white' : 'text-vscode-text hover:bg-vscode-hover'
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.hint && (
                <span className="text-xs text-vscode-textMuted truncate shrink-0 max-w-[55%]">
                  {item.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default CommandPalette;
