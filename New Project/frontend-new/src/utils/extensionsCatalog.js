// Static catalog for the cosmetic Extensions panel (VS Code style). No backend, no real
// install/execution — install/enable state is local UI state only (see ExtensionsPanel.jsx).
export const EXTENSIONS_CATALOG = [
  { id: 'prettier', name: 'Prettier — Code Formatter', publisher: 'Prettier', icon: '🎨', description: 'Opinionated code formatter for consistent style across the whole project.', installs: '42M' },
  { id: 'eslint', name: 'ESLint', publisher: 'Microsoft', icon: '🔍', description: 'Integrates ESLint into the editor for real-time linting as you type.', installs: '31M' },
  { id: 'gitlens', name: 'GitLens', publisher: 'GitKraken', icon: '🔮', description: 'Supercharge Git within the editor — blame, history, and authorship.', installs: '28M' },
  { id: 'live-share', name: 'Live Share', publisher: 'Microsoft', icon: '🤝', description: 'Real-time collaborative editing and debugging with your team.', installs: '19M' },
  { id: 'error-lens', name: 'Error Lens', publisher: 'Alexander Krivchun', icon: '🚨', description: 'Highlights errors and warnings inline, right where they happen.', installs: '12M' },
  { id: 'path-intellisense', name: 'Path Intellisense', publisher: 'Christian Kohler', icon: '📂', description: 'Autocompletes filenames in import and require statements.', installs: '15M' },
  { id: 'todo-tree', name: 'Todo Tree', publisher: 'Gruntfuggly', icon: '🌳', description: 'Collects TODO, FIXME, and other comment tags into one tree view.', installs: '9M' },
  { id: 'better-comments', name: 'Better Comments', publisher: 'Aaron Bond', icon: '💬', description: 'Human-friendly comment highlighting, categorized by intent.', installs: '8M' },
];
