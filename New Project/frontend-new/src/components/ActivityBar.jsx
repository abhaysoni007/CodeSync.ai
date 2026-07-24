import { Files, Puzzle } from 'lucide-react';

// Slim VS Code-style icon rail that switches what's shown in the left sidebar.
const ITEMS = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
];

const ActivityBar = ({ active, onChange }) => (
  <nav className="w-12 bg-vscode-bg border-r border-vscode-border flex flex-col items-center py-2 gap-1 flex-shrink-0">
    {ITEMS.map(({ id, icon: Icon, label }) => {
      const isActive = active === id;
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          aria-label={label}
          className={`relative w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
            isActive
              ? 'text-vscode-accent bg-vscode-hover'
              : 'text-vscode-textMuted hover:text-vscode-text hover:bg-vscode-hover'
          }`}
        >
          <Icon className="w-5 h-5" />
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-vscode-accent rounded-full" />
          )}
        </button>
      );
    })}
  </nav>
);

export default ActivityBar;
