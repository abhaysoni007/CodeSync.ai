import { motion } from 'framer-motion';
import FileIcon from './FileIcon';
import Icon from './Icon';
import { useTheme } from '../hooks/useTheme';

// Import some UI icons
import chatIcon from '/icons/icons/chat-icon.svg';
import videoIcon from '/icons/icons/video-call.svg';
import settingsIcon from '/icons/icons/setting.svg';
import participantsIcon from '/icons/icons/participants.svg';

/**
 * FileIconDemo - Showcases the icon system
 * Demonstrates both theme-aware icons and file-specific icons
 */
const FileIconDemo = () => {
  const { theme } = useTheme();

  const sampleFiles = [
    'index.html',
    'styles.css',
    'app.js',
    'component.jsx',
    'types.ts',
    'main.py',
    'Server.java',
    'database.sql',
    'config.json',
    'README.md',
    'image.png',
    'audio.mp3',
    'video.mp4',
  ];

  const uiIcons = [
    { src: chatIcon, name: 'Chat' },
    { src: videoIcon, name: 'Video Call' },
    { src: settingsIcon, name: 'Settings' },
    { src: participantsIcon, name: 'Participants' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Icon System Demo
          </h1>
          <p className="text-gray-400 text-lg">
            Current Theme: <span className="text-cyan-400 font-semibold">{theme}</span>
          </p>
        </motion.div>

        {/* Theme-Aware UI Icons Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            Theme-Aware UI Icons
          </h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <p className="text-gray-400 mb-6">
              These icons change color based on the theme (white in dark mode, black in light mode)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {uiIcons.map((icon, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-3 p-4 bg-slate-700/30 rounded-lg"
                >
                  <Icon 
                    src={icon.src}
                    alt={icon.name}
                    className="w-12 h-12"
                    themed={true}
                    animated={true}
                  />
                  <span className="text-gray-300 text-sm">{icon.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* File Icons Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            File Icons (Color Preserved)
          </h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <p className="text-gray-400 mb-6">
              These icons maintain their original colors regardless of theme
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sampleFiles.map((filename, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex flex-col items-center gap-2 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <FileIcon 
                    filename={filename}
                    className="w-10 h-10"
                  />
                  <span className="text-gray-300 text-xs text-center truncate w-full">
                    {filename}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Usage Guide */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Usage Guide</h3>
            <div className="text-gray-300 space-y-2 text-sm">
              <p><strong className="text-cyan-400">For UI Icons:</strong> Use the {`<Icon>`} component with themed={`{true}`}</p>
              <p><strong className="text-cyan-400">For File Icons:</strong> Use the {`<FileIcon>`} component (no theming applied)</p>
              <p><strong className="text-cyan-400">Toggle Theme:</strong> Use the theme toggle button in the navbar</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default FileIconDemo;
