import { useState, useMemo } from 'react';
import { Search, Download, Check } from 'lucide-react';
import { EXTENSIONS_CATALOG } from '../utils/extensionsCatalog';

// Cosmetic VS Code-style Extensions view. Install/enable is local component state only —
// no backend call, no real code loading. Ships the look and feel now; a real plugin
// architecture is a separate, backend-touching feature (see docs/planning).
const ExtensionsPanel = () => {
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState(() => new Set());

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXTENSIONS_CATALOG;
    return EXTENSIONS_CATALOG.filter(
      (ext) => ext.name.toLowerCase().includes(q) || ext.publisher.toLowerCase().includes(q)
    );
  }, [query]);

  const toggleInstalled = (id) => {
    setInstalled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-vscode-border">
        <h3 className="text-xs font-semibold text-vscode-textMuted uppercase tracking-wide mb-2">
          Extensions
        </h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-vscode-textMuted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Extensions in Marketplace"
            className="w-full bg-vscode-bg border border-vscode-border rounded-md pl-8 pr-3 py-1.5 text-sm text-vscode-text placeholder-vscode-textMuted focus:outline-none focus:border-vscode-accent transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {results.length === 0 ? (
          <p className="text-sm text-vscode-textMuted text-center py-8">No extensions found</p>
        ) : (
          results.map((ext) => {
            const isInstalled = installed.has(ext.id);
            return (
              <div
                key={ext.id}
                className="flex gap-3 p-3 border-b border-vscode-border/60 hover:bg-vscode-hover transition-colors"
              >
                <div className="w-9 h-9 flex-shrink-0 rounded-md bg-vscode-panel border border-vscode-border flex items-center justify-center text-lg">
                  {ext.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-vscode-text truncate">{ext.name}</p>
                  <p className="text-xs text-vscode-textMuted">
                    {ext.publisher} · {ext.installs} installs
                  </p>
                  <p className="text-xs text-vscode-textMuted mt-1 line-clamp-2">{ext.description}</p>
                  <button
                    onClick={() => toggleInstalled(ext.id)}
                    className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isInstalled
                        ? 'bg-vscode-success/15 text-vscode-success'
                        : 'bg-vscode-accent text-[#14110A] hover:bg-vscode-accentHover'
                    }`}
                  >
                    {isInstalled ? (
                      <>
                        <Check className="w-3 h-3" /> Enabled
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" /> Install
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExtensionsPanel;
