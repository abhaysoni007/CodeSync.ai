import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Radio } from 'lucide-react';
import * as fileAPI from '../services/fileAPI';

/**
 * Which dev servers are up, and a link to open them.
 *
 * WHY: after `npm run dev` the next thing a developer wants is the running app. Without this the
 * only way to find out which port Vite settled on is to read the scrollback.
 */
const PortsPanel = ({ projectId }) => {
  const [ports, setPorts] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const res = await fileAPI.listPorts(projectId);
      setPorts(res.data.ports);
    } catch {
      setPorts([]);
    } finally {
      setBusy(false);
    }
  }, [projectId]);

  // A dev server can come up at any moment; poll slowly rather than making the user click.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="px-3 py-2 border-b border-vscode-border flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-vscode-textMuted">Ports</h3>
        <button
          onClick={refresh}
          title="Refresh"
          data-testid="ports-refresh"
          className="p-1 rounded text-vscode-textMuted hover:text-vscode-text hover:bg-vscode-hover"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" data-testid="ports-list">
        {ports.length === 0 && (
          <p className="p-3 text-sm text-vscode-textMuted">
            Nothing listening yet. Run <code className="text-vscode-accent">npm run dev</code> in the
            terminal.
          </p>
        )}

        {ports.map((entry) => (
          <div
            key={entry.port}
            className="px-3 py-2 flex items-center justify-between border-b border-vscode-border/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span className="tabular-nums text-sm">{entry.port}</span>
              <span className="text-xs text-vscode-textMuted truncate">{entry.role}</span>
            </div>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-vscode-textMuted hover:text-vscode-accent hover:bg-vscode-hover"
              title={`Open ${entry.url}`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortsPanel;
