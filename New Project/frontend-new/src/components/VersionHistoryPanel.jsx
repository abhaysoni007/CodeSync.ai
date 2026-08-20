import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as versionAPI from '../services/versionAPI';
import {
  History,
  Save,
  Eye,
  GitCompare,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  User,
  Clock,
  FileText
} from 'lucide-react';

const VersionHistoryPanel = ({
  activeFile,
  projectId,
  currentCode,
  onClose,
  onVersionRestored
}) => {
  const [versions, setVersions] = useState([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Modals & Selections
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedVersion, setSelectedVersion] = useState(null);
  const [viewModalContent, setViewModalContent] = useState(null);

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [versionA, setVersionA] = useState(null);
  const [versionB, setVersionB] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const fileIdentifier = activeFile?.mongoFileId || activeFile?._id || activeFile?.pathString || activeFile?.name;

  useEffect(() => {
    if (activeFile) {
      loadHistory();
    }
  }, [activeFile]);

  const loadHistory = async () => {
    if (!fileIdentifier) return;
    setLoading(true);
    try {
      const targetId = activeFile?.mongoFileId || activeFile?._id || activeFile?.pathString || activeFile?.name;
      const res = await versionAPI.getVersionHistory(targetId, { projectId });
      if (res?.success) {
        setVersions(res.data?.versions || []);
        setCurrentVersionNumber(res.data?.file?.currentVersion || 0);
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVersion = async (e) => {
    e.preventDefault();
    if (!fileIdentifier) return;
    setIsSaving(true);
    try {
      const targetId = activeFile?.mongoFileId || activeFile?._id || activeFile?.pathString || activeFile?.name;
      const payload = {
        content: currentCode,
        message: saveMessage.trim() || 'Saved version snapshot',
        projectId
      };
      const res = await versionAPI.saveVersion(targetId, payload);
      if (res?.success) {
        toast.success(`Version ${res.data.version.versionNumber} saved successfully`);
        setSaveMessage('');
        setShowSaveModal(false);
        await loadHistory();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('No changes detected. Content is identical to last version.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to save version');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewVersion = async (versionNumber) => {
    if (!fileIdentifier) return;
    try {
      const targetId = activeFile?.mongoFileId || activeFile?._id || activeFile?.pathString || activeFile?.name;
      const res = await versionAPI.getVersionDetails(targetId, versionNumber, { projectId });
      if (res?.success) {
        setSelectedVersion(res.data.version);
        setViewModalContent(res.data.version.content);
      }
    } catch (err) {
      toast.error('Failed to load version details');
    }
  };

  const handleOpenCompare = async (vNumA, vNumB) => {
    if (!fileIdentifier) return;
    setCompareModalOpen(true);
    setCompareLoading(true);
    try {
      const targetId = activeFile?.mongoFileId || activeFile?._id || activeFile?.pathString || activeFile?.name;
      const res = await versionAPI.compareVersions(targetId, vNumA, vNumB, { projectId });
      if (res?.success) {
        setDiffData(res.data);
      }
    } catch (err) {
      toast.error('Failed to compare versions');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget || !fileIdentifier) return;
    setRestoreLoading(true);
    try {
      const targetId = activeFile?.mongoFileId || activeFile?._id || activeFile?.pathString || activeFile?.name;
      const res = await versionAPI.restoreVersion(targetId, restoreTarget.versionNumber, {
        message: `Restored v${restoreTarget.versionNumber}: ${restoreTarget.message || ''}`,
        projectId
      });

      if (res?.success) {
        toast.success(`Restored to version ${restoreTarget.versionNumber}`);
        const restoredContent = res.data.newVersion?.content || restoreTarget.content;
        if (onVersionRestored && restoredContent !== undefined) {
          onVersionRestored(restoredContent);
        }
        setRestoreTarget(null);
        await loadHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore version');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div
      data-testid="version-history"
      className="w-96 bg-vscode-panel border-l border-vscode-border flex flex-col h-full text-vscode-text select-none"
    >
      {/* Header */}
      <div className="p-4 border-b border-vscode-border flex items-center justify-between bg-vscode-bg/50">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-vscode-accent" />
          <h2 className="font-semibold text-white text-base">Version History</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Version History"
          className="p-1 hover:bg-vscode-bg rounded transition-colors text-vscode-textMuted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-3 border-b border-vscode-border flex items-center justify-between bg-vscode-panel">
        <span className="text-xs text-vscode-textMuted font-mono truncate max-w-[180px]">
          {activeFile?.name || 'No file selected'}
        </span>
        <button
          data-testid="save-version"
          onClick={() => setShowSaveModal(true)}
          disabled={!activeFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-vscode-accent hover:bg-vscode-accent/90 text-white disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          Save Version
        </button>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-vscode-textMuted text-sm">
            <div className="w-5 h-5 border-2 border-vscode-accent border-t-transparent rounded-full animate-spin mr-2"></div>
            Loading history...
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 px-4 text-vscode-textMuted">
            <History className="w-10 h-10 mx-auto mb-2 opacity-40 text-vscode-accent" />
            <p className="text-sm font-medium text-white mb-1">No versions saved yet</p>
            <p className="text-xs">Click "Save Version" above to create your first explicit checkpoint.</p>
          </div>
        ) : (
          versions.map((ver) => (
            <div
              key={ver._id || ver.versionNumber}
              data-testid={`version-item-${ver.versionNumber}`}
              className="p-3 rounded-lg border border-vscode-border hover:border-vscode-accent/50 bg-vscode-bg/40 hover:bg-vscode-bg/80 transition-all shadow-sm group"
            >
              {/* Row Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-vscode-accent/20 text-vscode-accent border border-vscode-accent/30">
                    v{ver.versionNumber}
                  </span>
                  {ver.versionNumber === currentVersionNumber && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      Head
                    </span>
                  )}
                  {ver.tags?.includes('revert') && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      Restored
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-vscode-textMuted flex items-center gap-1">
                  <Clock className="w-3 h-3 inline" />
                  {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Message */}
              <p className="text-xs font-medium text-white mb-2 line-clamp-2 leading-relaxed">
                {ver.message || 'Saved version'}
              </p>

              {/* Meta & Stats */}
              <div className="flex items-center justify-between text-[11px] text-vscode-textMuted border-t border-vscode-border/50 pt-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-vscode-accent" />
                  <span className="truncate max-w-[100px]">{ver.createdBy?.username || 'User'}</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  {ver.metadata?.linesAdded > 0 && (
                    <span className="text-green-400">+{ver.metadata.linesAdded}</span>
                  )}
                  {ver.metadata?.linesRemoved > 0 && (
                    <span className="text-red-400">-{ver.metadata.linesRemoved}</span>
                  )}
                </div>
              </div>

              {/* Row Action Buttons */}
              <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-1">
                <button
                  data-testid={`view-version-${ver.versionNumber}`}
                  onClick={() => handleViewVersion(ver.versionNumber)}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-vscode-bg hover:bg-vscode-border text-vscode-text hover:text-white transition-colors flex items-center gap-1"
                  title="Inspect version content"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>

                <button
                  data-testid="compare-version"
                  onClick={() => {
                    const prevVer = versions.find(v => v.versionNumber === ver.versionNumber - 1) || versions[versions.length - 1];
                    setVersionA(prevVer ? prevVer.versionNumber : ver.versionNumber);
                    setVersionB(ver.versionNumber);
                    handleOpenCompare(prevVer ? prevVer.versionNumber : ver.versionNumber, ver.versionNumber);
                  }}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-vscode-bg hover:bg-vscode-border text-vscode-text hover:text-white transition-colors flex items-center gap-1"
                  title="Compare with another version"
                >
                  <GitCompare className="w-3 h-3" />
                  Compare
                </button>

                <button
                  data-testid={`restore-version-${ver.versionNumber}`}
                  onClick={() => setRestoreTarget(ver)}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-vscode-accent/20 hover:bg-vscode-accent text-vscode-accent hover:text-white transition-colors flex items-center gap-1"
                  title="Restore this version"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SAVE VERSION MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-vscode-panel border border-vscode-border rounded-xl shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Save className="w-5 h-5 text-vscode-accent" />
                Save Version Checkpoint
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 text-vscode-textMuted hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVersion}>
              <label className="block text-xs text-vscode-textMuted mb-1 font-medium">
                Commit Message / Description
              </label>
              <input
                data-testid="save-version-message-input"
                type="text"
                value={saveMessage}
                onChange={(e) => setSaveMessage(e.target.value)}
                placeholder="e.g. Added user authentication check"
                className="w-full px-3 py-2 text-sm bg-vscode-bg border border-vscode-border rounded-lg text-white placeholder-vscode-textMuted focus:outline-none focus:border-vscode-accent mb-4"
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-xs font-medium bg-vscode-bg hover:bg-vscode-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  data-testid="save-version-submit"
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium bg-vscode-accent hover:bg-vscode-accent/90 rounded-lg text-white flex items-center gap-1.5 shadow"
                >
                  {isSaving ? 'Saving...' : 'Create Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW VERSION DETAILS MODAL */}
      {selectedVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="w-full max-w-3xl bg-vscode-panel border border-vscode-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-white">
            <div className="p-4 border-b border-vscode-border flex items-center justify-between bg-vscode-bg/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-vscode-accent" />
                <h3 className="font-semibold text-sm">
                  Version v{selectedVersion.versionNumber} — {selectedVersion.message}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedVersion(null); setViewModalContent(null); }}
                className="p-1 text-vscode-textMuted hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs bg-vscode-bg">
              <pre data-testid="version-content" className="whitespace-pre-wrap leading-relaxed text-vscode-text">
                {viewModalContent}
              </pre>
            </div>

            <div className="p-3 border-t border-vscode-border flex items-center justify-between bg-vscode-panel text-xs text-vscode-textMuted">
              <span>Author: {selectedVersion.createdBy?.username || 'Unknown'}</span>
              <span>Saved on: {new Date(selectedVersion.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* COMPARE VERSIONS MODAL */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
          <div className="w-full max-w-4xl bg-vscode-panel border border-vscode-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-white">
            <div className="p-4 border-b border-vscode-border flex items-center justify-between bg-vscode-bg/50">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-vscode-accent" />
                <h3 className="font-semibold text-sm">
                  Compare Versions v{versionA} vs v{versionB}
                </h3>
              </div>
              <button
                onClick={() => { setCompareModalOpen(false); setDiffData(null); }}
                className="p-1 text-vscode-textMuted hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs bg-vscode-bg">
              {compareLoading ? (
                <div className="text-center py-12 text-vscode-textMuted">Generating diff comparison...</div>
              ) : diffData ? (
                <div>
                  <div className="flex items-center gap-4 mb-3 pb-2 border-b border-vscode-border text-xs">
                    <span className="text-green-400 font-semibold">+{diffData.stats?.linesAdded || 0} additions</span>
                    <span className="text-red-400 font-semibold">-{diffData.stats?.linesRemoved || 0} deletions</span>
                  </div>
                  <pre data-testid="diff-container" className="whitespace-pre-wrap text-vscode-text leading-relaxed">
                    {diffData.diff || 'No differences found (versions are identical).'}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-vscode-textMuted">No diff data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-vscode-panel border border-vscode-border rounded-xl shadow-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3 text-vscode-accent">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-semibold">Confirm Version Restore</h3>
            </div>

            <p className="text-xs text-vscode-textMuted mb-4 leading-relaxed">
              Restoring <strong className="text-white">v{restoreTarget.versionNumber}</strong> ("{restoreTarget.message}") will set the editor and active file content to this version state.
              <br /><br />
              <span className="text-vscode-accent">Note:</span> This will create a <strong className="text-white">new head version</strong> so your complete historical audit trail remains safe.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 text-xs font-medium bg-vscode-bg hover:bg-vscode-border rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoreLoading}
                className="px-4 py-2 text-xs font-medium bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg flex items-center gap-1.5 shadow"
              >
                {restoreLoading ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryPanel;
