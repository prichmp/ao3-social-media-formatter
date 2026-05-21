import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from './components/Layout';
import { CanvasPreview, type RenderStatus } from './components/CanvasPreview';
import { DownloadButton } from './components/DownloadButton';
import { DropdownMenu } from './components/DropdownMenu';
import { UserListPanel } from './components/UserListPanel';
import { Modal } from './components/Modal';
import { formats } from './formats/registry';
import { saveState, loadState, clearState } from './lib/storage';
import { loadSaves, upsertSave, deleteSave } from './lib/saves';
import type { NamedSave } from './lib/saves';
import { UserListContext } from './lib/UserListContext';
import type { TwitterPost } from './formats/twitter/types';
import type { TwitterUser } from './formats/twitter/types';
import styles from './App.module.css';

interface AppState {
  activeFormat: string;
  twitter: TwitterPost;
  users: TwitterUser[];
  currentSaveId: string | null;
  currentSaveName: string | null;
}

const EMPTY_TWITTER: TwitterPost = {
  author: { avatar: { src: '', alt: '', width: 50, height: 50 }, name: '', handle: '' },
  content: '',
  image: undefined,
  quote: { enabled: false, avatar: { src: '', alt: '', width: 50, height: 50 }, name: '', handle: '', content: '' },
  time: '',
  relativeTime: '',
  stats: { showRow: true, labels: '' },
  statIcons: formats[0].defaults.statIcons,
  replies: [],
};

function getInitialState(): AppState {
  const saved = loadState<AppState>();
  if (saved) return {
    ...saved,
    users: saved.users ?? [],
    currentSaveId: saved.currentSaveId ?? null,
    currentSaveName: saved.currentSaveName ?? null,
    twitter: {
      ...saved.twitter,
      statIcons: saved.twitter.statIcons ?? formats[0].defaults.statIcons,
      replies: (saved.twitter.replies ?? []).map(r => ({
        ...r,
        replyingTo: (r as { replyingTo?: string }).replyingTo ?? saved.twitter.author.handle,
      })),
    },
  };
  return {
    activeFormat: 'twitter',
    twitter: formats[0].defaults,
    users: [],
    currentSaveId: null,
    currentSaveName: null,
  };
}

type ModalState =
  | { type: 'none' }
  | { type: 'name'; afterSave: () => void }
  | { type: 'new-confirm' }
  | { type: 'load' }
  | { type: 'load-confirm'; saveToLoad: NamedSave }
  | { type: 'import-confirm' };

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('pending');
  const [usersOpen, setUsersOpen] = useState(false);
  const handleStatusChange = useCallback((s: RenderStatus) => setRenderStatus(s), []);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [nameInput, setNameInput] = useState('');
  const [saves, setSaves] = useState<NamedSave[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (modal.type === 'name') {
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [modal.type]);

  const format = formats.find(f => f.id === state.activeFormat) ?? formats[0];

  function isCurrentDirty(): boolean {
    if (!state.currentSaveId) {
      return (
        state.twitter.content.trim() !== '' ||
        state.twitter.author.name.trim() !== '' ||
        state.twitter.replies.length > 0
      );
    }
    const allSaves = loadSaves();
    const named = allSaves.find(s => s.id === state.currentSaveId);
    if (!named) return true;
    return JSON.stringify(named.twitter) !== JSON.stringify(state.twitter);
  }

  function doNamedSave(id: string, name: string, twitter: TwitterPost) {
    upsertSave({ id, name, savedAt: new Date().toISOString(), twitter });
    setState(s => ({ ...s, currentSaveId: id, currentSaveName: name }));
  }

  function doLoad(save: NamedSave) {
    setState(s => ({ ...s, twitter: save.twitter, currentSaveId: save.id, currentSaveName: save.name }));
    setModal({ type: 'none' });
  }

  function doImport(twitter: TwitterPost, name: string | null) {
    setState(s => ({
      ...s,
      twitter: { ...twitter, statIcons: twitter.statIcons ?? formats[0].defaults.statIcons },
      currentSaveId: null,
      currentSaveName: name,
    }));
    setModal({ type: 'none' });
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  function handleSave() {
    if (state.currentSaveName && state.currentSaveId) {
      doNamedSave(state.currentSaveId, state.currentSaveName, state.twitter);
    } else {
      setNameInput('');
      setModal({ type: 'name', afterSave: () => {} });
    }
  }

  function confirmName() {
    const name = nameInput.trim();
    if (!name) return;
    const id = state.currentSaveId ?? crypto.randomUUID();
    const afterSave = modal.type === 'name' ? modal.afterSave : () => {};
    doNamedSave(id, name, state.twitter);
    setModal({ type: 'none' });
    afterSave();
  }

  // ── New ──────────────────────────────────────────────────────────────────
  function createNew() {
    setState(s => ({ ...s, twitter: EMPTY_TWITTER, currentSaveId: null, currentSaveName: null }));
  }

  function handleNew() {
    if (isCurrentDirty()) {
      setModal({ type: 'new-confirm' });
    } else {
      createNew();
    }
  }

  function handleNewSaveFirst() {
    if (state.currentSaveName && state.currentSaveId) {
      doNamedSave(state.currentSaveId, state.currentSaveName, state.twitter);
      setModal({ type: 'none' });
      createNew();
    } else {
      setNameInput('');
      setModal({ type: 'name', afterSave: createNew });
    }
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  function handleLoad() {
    setSaves(loadSaves());
    setModal({ type: 'load' });
  }

  function handleLoadSelect(save: NamedSave) {
    if (isCurrentDirty()) {
      setModal({ type: 'load-confirm', saveToLoad: save });
    } else {
      doLoad(save);
    }
  }

  function handleLoadConfirmSaveFirst(saveToLoad: NamedSave) {
    if (state.currentSaveName && state.currentSaveId) {
      doNamedSave(state.currentSaveId, state.currentSaveName, state.twitter);
      doLoad(saveToLoad);
    } else {
      setNameInput('');
      setModal({ type: 'name', afterSave: () => doLoad(saveToLoad) });
    }
  }

  function handleDeleteSave(id: string) {
    deleteSave(id);
    setSaves(s => s.filter(sv => sv.id !== id));
  }

  // ── Export ───────────────────────────────────────────────────────────────
  function handleExport() {
    const data = {
      version: 1,
      name: state.currentSaveName ?? undefined,
      savedAt: new Date().toISOString(),
      twitter: state.twitter,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentSaveName ?? 'ao3-post'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import ───────────────────────────────────────────────────────────────
  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  function handleImportClick() {
    if (isCurrentDirty()) {
      setModal({ type: 'import-confirm' });
    } else {
      triggerFileInput();
    }
  }

  function handleImportConfirmSaveFirst() {
    if (state.currentSaveName && state.currentSaveId) {
      doNamedSave(state.currentSaveId, state.currentSaveName, state.twitter);
      setModal({ type: 'none' });
      triggerFileInput();
    } else {
      setNameInput('');
      setModal({ type: 'name', afterSave: triggerFileInput });
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const raw = JSON.parse(evt.target?.result as string);
        const twitter: TwitterPost = raw.twitter ?? raw;
        const name: string | null = raw.name ?? null;
        if (typeof twitter !== 'object' || !twitter.author) {
          alert('Invalid file: missing expected fields.');
          return;
        }
        doImport(twitter, name);
      } catch {
        alert('Could not read file. Make sure it is a valid JSON file exported from this tool.');
      }
    };
    reader.readAsText(file);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirm('Reset all fields to the example defaults?')) return;
    setState(s => ({ ...s, twitter: formats[0].defaults, currentSaveId: null, currentSaveName: null }));
    clearState();
  }

  const userListContext = {
    users: state.users,
    addUser: (user: TwitterUser) => {
      setState(s => ({ ...s, users: [...s.users, user] }));
      setUsersOpen(true);
    },
    removeUser: (id: string) => setState(s => ({ ...s, users: s.users.filter(u => u.id !== id) })),
  };

  const Form = format.Form as React.FC<{ state: TwitterPost; onChange: (s: TwitterPost) => void }>;

  return (
    <UserListContext.Provider value={userListContext}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <Layout
        header={
          <>
            <span className={styles.appTitle}>AO3 Social Media Formatter</span>
            <span className={styles.alphaNote}>⚠ Alpha software — expect bugs</span>
            <span className={styles.localNote}>Local only. No data leaves your browser.</span>
            <select
              className={styles.formatSelect}
              value={state.activeFormat}
              onChange={e => setState(s => ({ ...s, activeFormat: e.target.value }))}
              aria-label="Format"
            >
              {formats.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <DropdownMenu
              label="Menu"
              items={[
                { label: 'New', onClick: handleNew },
                { label: 'Load', onClick: handleLoad },
                { label: state.currentSaveName ? `Save "${state.currentSaveName}"` : 'Save', onClick: handleSave },
                { label: 'Export', onClick: handleExport },
                { label: 'Import', onClick: handleImportClick },
                { label: 'Reset', onClick: handleReset, danger: true },
              ]}
            />
          </>
        }
        form={
          <Form
            state={state.twitter}
            onChange={twitter => setState(s => ({ ...s, twitter }))}
          />
        }
        preview={
          <CanvasPreview
            post={state.twitter}
            render={format.renderImage}
            onCanvasReady={setCanvasEl}
            onStatusChange={handleStatusChange}
          />
        }
        userList={<UserListPanel />}
        usersOpen={usersOpen}
        onUsersOpenChange={setUsersOpen}
        output={
          <div className={styles.outputPanels}>
            <DownloadButton
              canvas={canvasEl}
              ready={renderStatus === 'ok'}
              filename={`${state.currentSaveName ?? 'tweet'}.png`}
            />
          </div>
        }
      />

      {/* Name modal */}
      {modal.type === 'name' && (
        <Modal title="Name this save" onClose={() => setModal({ type: 'none' })}>
          <input
            ref={nameInputRef}
            className={styles.modalInput}
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmName(); }}
            placeholder="e.g. Chapter 3 tweet"
          />
          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={() => setModal({ type: 'none' })}>Cancel</button>
            <button className={styles.modalConfirm} onClick={confirmName} disabled={!nameInput.trim()}>Save</button>
          </div>
        </Modal>
      )}

      {/* New — save-first confirm */}
      {modal.type === 'new-confirm' && (
        <Modal title="Create new post?" onClose={() => setModal({ type: 'none' })}>
          <p className={styles.modalText}>Your current post will be cleared. Do you want to save it first?</p>
          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={() => setModal({ type: 'none' })}>Cancel</button>
            <button className={styles.modalSecondary} onClick={() => { setModal({ type: 'none' }); createNew(); }}>Don&apos;t save</button>
            <button className={styles.modalConfirm} onClick={handleNewSaveFirst}>Save first</button>
          </div>
        </Modal>
      )}

      {/* Load list */}
      {modal.type === 'load' && (
        <Modal title="Load saved post" onClose={() => setModal({ type: 'none' })}>
          {saves.length === 0 ? (
            <p className={styles.modalText}>No saved posts yet.</p>
          ) : (
            <ul className={styles.saveList}>
              {saves.map(save => (
                <li key={save.id} className={styles.saveItem}>
                  <div className={styles.saveInfo}>
                    <span className={styles.saveName}>{save.name}</span>
                    <span className={styles.saveDate}>{new Date(save.savedAt).toLocaleString()}</span>
                  </div>
                  <div className={styles.saveItemActions}>
                    <button className={styles.modalConfirm} onClick={() => handleLoadSelect(save)}>Load</button>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteSave(save.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={() => setModal({ type: 'none' })}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Load — save-first confirm */}
      {modal.type === 'load-confirm' && (
        <Modal title="Unsaved changes" onClose={() => setModal({ type: 'none' })}>
          <p className={styles.modalText}>
            You have unsaved changes. Do you want to save before loading <strong>{modal.saveToLoad.name}</strong>?
          </p>
          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={() => setModal({ type: 'none' })}>Cancel</button>
            <button className={styles.modalSecondary} onClick={() => doLoad(modal.saveToLoad)}>Don&apos;t save</button>
            <button className={styles.modalConfirm} onClick={() => handleLoadConfirmSaveFirst(modal.saveToLoad)}>Save first</button>
          </div>
        </Modal>
      )}

      {/* Import — save-first confirm */}
      {modal.type === 'import-confirm' && (
        <Modal title="Import file?" onClose={() => setModal({ type: 'none' })}>
          <p className={styles.modalText}>Importing will replace your current post. Do you want to save it first?</p>
          <div className={styles.modalActions}>
            <button className={styles.modalCancel} onClick={() => setModal({ type: 'none' })}>Cancel</button>
            <button className={styles.modalSecondary} onClick={() => { setModal({ type: 'none' }); triggerFileInput(); }}>Don&apos;t save</button>
            <button className={styles.modalConfirm} onClick={handleImportConfirmSaveFirst}>Save first</button>
          </div>
        </Modal>
      )}
    </UserListContext.Provider>
  );
}
