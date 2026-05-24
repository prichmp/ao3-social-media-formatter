import React, { useState, useEffect, useRef, useCallback } from 'react';
import { z } from 'zod';
import { Layout } from './components/Layout';
import { CanvasPreview, type RenderStatus } from './components/CanvasPreview';
import { DownloadButton } from './components/DownloadButton';
import { DropdownMenu } from './components/DropdownMenu';
import { UserListPanel } from './components/UserListPanel';
import { Modal } from './components/Modal';
import { ImgTagSnippet } from './components/ImgTagSnippet';
import { tweetToMarkdown } from './lib/markdownBuilder';
import { selfClose, serializeMinified } from './lib/htmlBuilder';
import { formats } from './formats/registry';
import { saveState, loadState, clearState } from './lib/storage';
import { loadSaves, upsertSave, deleteSave } from './lib/saves';
import type { NamedSave } from './lib/saves';
import { UserListContext } from './lib/UserListContext';
import type { TwitterPost } from './formats/twitter/types';
import type { TwitterUser } from './formats/twitter/types';
import { twitterPostSchema, twitterUserSchema } from './formats/twitter/schema';
import type { IMessageChain } from './formats/imessage/types';
import { imessageSchema } from './formats/imessage/schema';
import { imessageDefaults } from './formats/imessage/defaults';
import { chainToMarkdown } from './formats/imessage/markdown';
import type { LivestreamSegment } from './formats/livestream/types';
import { livestreamSchema } from './formats/livestream/schema';
import { livestreamDefaults } from './formats/livestream/defaults';
import { segmentToMarkdown } from './formats/livestream/markdown';
import styles from './App.module.css';

// IDs the active-format dropdown can hold. Adding a format means adding it
// here plus an entry in `formats/registry.ts`.
type FormatId = 'twitter' | 'imessage' | 'livestream';
const formatIdSchema = z.enum(['twitter', 'imessage', 'livestream']);

// Schema for the full app state stored in localStorage. Validated on load;
// any mismatch (or corrupt JSON) clears the key and reloads with defaults.
const appStateSchema = z.object({
  activeFormat: formatIdSchema,
  twitter:    twitterPostSchema,
  imessage:   imessageSchema,
  livestream: livestreamSchema,
  users: z.array(twitterUserSchema),
  currentSaveId: z.string().nullable(),
  currentSaveName: z.string().nullable(),
});

// Schema for the wrapper object produced by handleExport (and consumed by
// handleImportFile). Discriminated by `format` so a single file can carry
// either format's payload.
const importFileSchema = z.discriminatedUnion('format', [
  z.object({
    version: z.number().optional(),
    name: z.string().nullable().optional(),
    savedAt: z.string().optional(),
    format: z.literal('twitter'),
    twitter: twitterPostSchema,
  }),
  z.object({
    version: z.number().optional(),
    name: z.string().nullable().optional(),
    savedAt: z.string().optional(),
    format: z.literal('imessage'),
    imessage: imessageSchema,
  }),
  z.object({
    version: z.number().optional(),
    name: z.string().nullable().optional(),
    savedAt: z.string().optional(),
    format: z.literal('livestream'),
    livestream: livestreamSchema,
  }),
]);

interface AppState {
  activeFormat: FormatId;
  twitter: TwitterPost;
  imessage: IMessageChain;
  livestream: LivestreamSegment;
  users: TwitterUser[];
  currentSaveId: string | null;
  currentSaveName: string | null;
}

const EMPTY_TWITTER: TwitterPost = {
  author: { avatar: { src: '', alt: '', width: 50, height: 50 }, name: '', handle: '' },
  content: '',
  attachment: { type: 'text' },
  time: '',
  relativeTime: '',
  stats: { showRow: true, labels: '' },
  statIcons: (formats.find(f => f.id === 'twitter')!.defaults as TwitterPost).statIcons,
  replies: [],
};

const EMPTY_IMESSAGE: IMessageChain = {
  contactName: '',
  contactAvatar: { src: '', alt: '' },
  messages: [],
  showDeliveredOnLast: false,
};

const EMPTY_LIVESTREAM: LivestreamSegment = {
  streamer: { avatar: { src: '', alt: '' }, name: '' },
  title: '',
  category: '',
  viewerCount: '',
  thumbnail: { src: '', alt: '' },
  showLiveBadge: true,
  chat: [],
};

function getInitialState(): AppState {
  const saved = loadState(appStateSchema);
  if (saved) return saved;
  return {
    activeFormat: 'twitter',
    twitter: formats.find(f => f.id === 'twitter')!.defaults as TwitterPost,
    imessage: imessageDefaults,
    livestream: livestreamDefaults,
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

type ActiveData = TwitterPost | IMessageChain | LivestreamSegment;

// Return the active format's data slot. Narrowed by `state.activeFormat`.
function activeData(state: AppState): ActiveData {
  switch (state.activeFormat) {
    case 'twitter':    return state.twitter;
    case 'imessage':   return state.imessage;
    case 'livestream': return state.livestream;
  }
}

// Set the active format's data slot, leaving the inactive slots untouched.
function setActiveData(state: AppState, data: ActiveData): AppState {
  switch (state.activeFormat) {
    case 'twitter':    return { ...state, twitter:    data as TwitterPost       };
    case 'imessage':   return { ...state, imessage:   data as IMessageChain     };
    case 'livestream': return { ...state, livestream: data as LivestreamSegment };
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('pending');
  const [renderSize, setRenderSize] = useState<{ width: number; height: number } | null>(null);
  const [usersOpen, setUsersOpen] = useState(false);
  const handleStatusChange = useCallback((s: RenderStatus) => setRenderStatus(s), []);
  const handleDimensionsChange = useCallback(
    (s: { width: number; height: number } | null) => setRenderSize(s),
    [],
  );
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
  const currentData = activeData(state);

  function isCurrentDirty(): boolean {
    if (!state.currentSaveId) {
      // Dirty if the active format's data has any meaningful content. Each
      // format has its own definition of "meaningful" so the inactive slot
      // (which may hold defaults) doesn't bleed into the dirty check.
      switch (state.activeFormat) {
        case 'twitter':
          return (
            state.twitter.content.trim() !== '' ||
            state.twitter.author.name.trim() !== '' ||
            state.twitter.attachment.type !== 'text' ||
            state.twitter.replies.length > 0
          );
        case 'imessage':
          return (
            state.imessage.contactName.trim() !== '' ||
            state.imessage.contactAvatar.src.trim() !== '' ||
            state.imessage.messages.length > 0
          );
        case 'livestream':
          return (
            state.livestream.streamer.name.trim() !== '' ||
            state.livestream.title.trim() !== '' ||
            state.livestream.chat.length > 0
          );
      }
    }
    const allSaves = loadSaves();
    const named = allSaves.find(s => s.id === state.currentSaveId);
    if (!named) return true;
    const namedData =
      named.format === 'twitter'  ? named.twitter  :
      named.format === 'imessage' ? named.imessage :
                                    named.livestream;
    return JSON.stringify(namedData) !== JSON.stringify(currentData);
  }

  function doNamedSave(id: string, name: string) {
    const base = { id, name, savedAt: new Date().toISOString() };
    const save: NamedSave =
      state.activeFormat === 'twitter'    ? { ...base, format: 'twitter',    twitter:    state.twitter    } :
      state.activeFormat === 'imessage'   ? { ...base, format: 'imessage',   imessage:   state.imessage   } :
                                            { ...base, format: 'livestream', livestream: state.livestream };
    upsertSave(save);
    setState(s => ({ ...s, currentSaveId: id, currentSaveName: name }));
  }

  function doLoad(save: NamedSave) {
    // Switching the active format AND loading the data lets the user keep
    // independent work-in-progress in the inactive slots.
    setState(s => {
      const meta = { currentSaveId: save.id, currentSaveName: save.name };
      switch (save.format) {
        case 'twitter':    return { ...s, activeFormat: 'twitter',    twitter:    save.twitter,    ...meta };
        case 'imessage':   return { ...s, activeFormat: 'imessage',   imessage:   save.imessage,   ...meta };
        case 'livestream': return { ...s, activeFormat: 'livestream', livestream: save.livestream, ...meta };
      }
    });
    setModal({ type: 'none' });
  }

  function doImport(parsed: z.infer<typeof importFileSchema>) {
    setState(s => {
      const meta = { currentSaveId: null, currentSaveName: parsed.name ?? null };
      switch (parsed.format) {
        case 'twitter':    return { ...s, activeFormat: 'twitter',    twitter:    parsed.twitter,    ...meta };
        case 'imessage':   return { ...s, activeFormat: 'imessage',   imessage:   parsed.imessage,   ...meta };
        case 'livestream': return { ...s, activeFormat: 'livestream', livestream: parsed.livestream, ...meta };
      }
    });
    setModal({ type: 'none' });
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  function handleSave() {
    if (state.currentSaveName && state.currentSaveId) {
      doNamedSave(state.currentSaveId, state.currentSaveName);
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
    doNamedSave(id, name);
    setModal({ type: 'none' });
    afterSave();
  }

  // ── New ──────────────────────────────────────────────────────────────────
  function createNew() {
    setState(s => {
      const emptied =
        s.activeFormat === 'twitter'    ? { ...s, twitter:    EMPTY_TWITTER    } :
        s.activeFormat === 'imessage'   ? { ...s, imessage:   EMPTY_IMESSAGE   } :
                                          { ...s, livestream: EMPTY_LIVESTREAM };
      return { ...emptied, currentSaveId: null, currentSaveName: null };
    });
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
      doNamedSave(state.currentSaveId, state.currentSaveName);
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
      doNamedSave(state.currentSaveId, state.currentSaveName);
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
    const base = {
      version: 1,
      name: state.currentSaveName ?? undefined,
      savedAt: new Date().toISOString(),
    };
    const data =
      state.activeFormat === 'twitter'    ? { ...base, format: 'twitter'    as const, twitter:    state.twitter    } :
      state.activeFormat === 'imessage'   ? { ...base, format: 'imessage'   as const, imessage:   state.imessage   } :
                                            { ...base, format: 'livestream' as const, livestream: state.livestream };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentSaveName ?? `ao3-${state.activeFormat}`}.json`;
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
      doNamedSave(state.currentSaveId, state.currentSaveName);
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
      // Two failure modes share a single user-facing alert: malformed JSON
      // (SyntaxError) and shape mismatch (ZodError). Details go to console.
      try {
        const raw = JSON.parse(evt.target?.result as string);
        const parsed = importFileSchema.parse(raw);
        doImport(parsed);
      } catch (err) {
        console.error('Import failed:', err);
        alert('Could not import file. Make sure it is a valid JSON file exported from this tool.');
      }
    };
    reader.readAsText(file);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    if (!confirm('Reset all fields to the example defaults?')) return;
    setState(s => {
      const reset =
        s.activeFormat === 'twitter'    ? { ...s, twitter: formats.find(f => f.id === 'twitter')!.defaults as TwitterPost } :
        s.activeFormat === 'imessage'   ? { ...s, imessage:   imessageDefaults   } :
                                          { ...s, livestream: livestreamDefaults };
      return { ...reset, currentSaveId: null, currentSaveName: null };
    });
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

  // The registry erases per-format generics so we cast back to a wider
  // `any` shape here; each Form / renderImage knows its own type internally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Form = format.Form as React.FC<{ state: any; onChange: (s: any) => void }>;

  // Build the AO3-ready <img /> snippet. src is left empty for the user to
  // fill in; alt carries the active format's data as Markdown; width/height
  // come from the last successful render (ceiling'd to whole pixels).
  const altMarkdown =
    state.activeFormat === 'twitter'    ? tweetToMarkdown(state.twitter)    :
    state.activeFormat === 'imessage'   ? chainToMarkdown(state.imessage)   :
                                          segmentToMarkdown(state.livestream);
  const imgTag = serializeMinified(selfClose('img', {
    src: '',
    alt: altMarkdown,
    width: renderSize ? Math.ceil(renderSize.width) : '',
    height: renderSize ? Math.ceil(renderSize.height) : '',
  }));

  const downloadFilename = `${state.currentSaveName ?? state.activeFormat}.png`;

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
              onChange={e => setState(s => ({ ...s, activeFormat: formatIdSchema.parse(e.target.value) }))}
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
            state={currentData}
            onChange={data => setState(s => setActiveData(s, data))}
          />
        }
        preview={
          <CanvasPreview
            post={currentData}
            render={format.renderImage}
            onCanvasReady={setCanvasEl}
            onStatusChange={handleStatusChange}
            onDimensionsChange={handleDimensionsChange}
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
              filename={downloadFilename}
            />
            <ImgTagSnippet imgTag={imgTag} disabled={renderStatus !== 'ok'} />
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
                    <span className={styles.saveDate}>
                      {save.format} · {new Date(save.savedAt).toLocaleString()}
                    </span>
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
