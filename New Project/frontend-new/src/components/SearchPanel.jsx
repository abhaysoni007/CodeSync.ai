import { useState, useRef } from 'react';
import { Search, Loader2, CaseSensitive, Regex } from 'lucide-react';
import * as fileAPI from '../services/fileAPI';
import toast from 'react-hot-toast';

/**
 * Search across every file in the workspace.
 *
 * The server does the scanning (it is the only side that has the files), and returns a path plus a
 * 1-based line number per hit so clicking a result can open the file *at that line* rather than at
 * the top.
 */
const SearchPanel = ({ projectId, onOpenResult }) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [state, setState] = useState({ results: [], truncated: false, ran: false });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const run = async () => {
    if (query.trim().length < 2) {
      toast.error('Type at least 2 characters');
      return;
    }
    setBusy(true);
    try {
      const res = await fileAPI.searchProject(projectId, query, { caseSensitive, regex });
      setState({ results: res.data.results, truncated: res.data.truncated, ran: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  // Hits arrive flat; group them by file the way VS Code does so a busy file is one heading.
  const byFile = state.results.reduce((acc, hit) => {
    (acc[hit.id] ||= { name: hit.name, path: hit.path, hits: [] }).hits.push(hit);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="px-3 py-2 border-b border-vscode-border">
        <h3 className="text-xs uppercase tracking-wide text-vscode-textMuted mb-2">Search</h3>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            data-testid="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Search in files"
            className="flex-1 min-w-0 px-2 py-1 text-sm bg-vscode-bg border border-vscode-border rounded focus:outline-none focus:border-vscode-accent"
          />
          <button
            onClick={() => setCaseSensitive((v) => !v)}
            title="Match case"
            className={`p-1 rounded ${caseSensitive ? 'bg-vscode-active text-vscode-accent' : 'text-vscode-textMuted hover:text-vscode-text'}`}
          >
            <CaseSensitive className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRegex((v) => !v)}
            title="Use regular expression"
            className={`p-1 rounded ${regex ? 'bg-vscode-active text-vscode-accent' : 'text-vscode-textMuted hover:text-vscode-text'}`}
          >
            <Regex className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={run}
          disabled={busy}
          data-testid="search-run"
          className="mt-2 w-full text-sm py-1 rounded bg-vscode-bg hover:bg-vscode-hover border border-vscode-border disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <Search className="w-4 h-4 inline mr-1" />}
          Search
        </button>
      </div>

      <div className="flex-1 overflow-y-auto text-sm" data-testid="search-results">
        {state.ran && state.results.length === 0 && (
          <p className="p-3 text-vscode-textMuted">No results</p>
        )}

        {Object.entries(byFile).map(([id, file]) => (
          <div key={id}>
            <div className="px-3 py-1 text-xs text-vscode-textMuted sticky top-0 bg-vscode-panel">
              {file.path.join('/')} <span className="opacity-60">({file.hits.length})</span>
            </div>
            {file.hits.map((hit) => (
              <button
                key={`${id}:${hit.line}`}
                onClick={() => onOpenResult(hit)}
                className="w-full text-left px-4 py-1 hover:bg-vscode-hover flex gap-2"
              >
                <span className="text-vscode-accent tabular-nums shrink-0">{hit.line}</span>
                <span className="truncate font-mono text-xs opacity-90">{hit.preview.trim()}</span>
              </button>
            ))}
          </div>
        ))}

        {state.truncated && (
          <p className="p-3 text-xs text-vscode-textMuted">
            Results were capped — narrow the query to see the rest.
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
