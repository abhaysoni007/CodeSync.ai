import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, CloudOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import useDeltaStore from '../../stores/useDeltaStore';

/**
 * DeltaSyncStatus - Shows real-time sync status
 */
export default function DeltaSyncStatus({ fileId, className = '' }) {
  const { syncStatus, currentVersions } = useDeltaStore();

  const status = syncStatus[fileId] || {};
  const version = currentVersions[fileId];

  const getStatusConfig = () => {
    if (status.error) {
      return {
        icon: AlertCircle,
        text: 'Sync Error',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30'
      };
    }

    if (!status.initialized) {
      return {
        icon: Loader2,
        text: 'Initializing...',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        spin: true
      };
    }

    if (status.synced) {
      return {
        icon: Check,
        text: 'Synced',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30'
      };
    }

    return {
      icon: Loader2,
      text: 'Syncing...',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      spin: true
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <Icon 
        className={`w-4 h-4 ${config.color} ${config.spin ? 'animate-spin' : ''}`} 
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
      {version && (
        <span className="text-xs text-gray-500 font-mono">
          v{version}
        </span>
      )}
    </motion.div>
  );
}
