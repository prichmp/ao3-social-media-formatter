import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { loadSaves, upsertSave, deleteSave } from './lib/saves';
import type { NamedSave } from './lib/saves';
import { loadUsers, saveUsers } from './lib/usersStorage';
import { UserListContext } from './lib/UserListContext';
import type { TwitterPost } from './formats/twitter/types';
import { twitterPostSchema } from './formats/twitter/schema';
import type { SavedUser } from './lib/savedUser';
import { savedUserSchema } from './lib/savedUser';
import type { IMessageChain } from './formats/imessage/types';
import { imessageSchema } from './formats/imessage/schema';
import { imessageDefaults } from './formats/imessage/defaults';
import { chainToMarkdown } from './formats/imessage/markdown';
import type { LivestreamSegment } from './formats/livestream/types';
import { livestreamSchema } from './formats/livestream/schema';
import { livestreamDefaults } from './formats/livestream/defaults';
import { segmentToMarkdown } from './formats/livestream/markdown';
import type { EmailThread } from './formats/email/types';
import { emailSchema } from './formats/email/schema';
import { emailDefaults } from './formats/email/defaults';
import { threadToMarkdown } from './formats/email/markdown';
import type { TumblrPost } from './formats/tumblr/types';
import { tumblrSchema } from './formats/tumblr/schema';
import { tumblrDefaults } from './formats/tumblr/defaults';
import { postToMarkdown } from './formats/tumblr/markdown';
import styles from './App.module.css';

// IDs the active-format dropdown can hold. Adding a format means adding it
// here plus an entry in `formats/registry.ts`.
type FormatId = 'twitter' | 'imessage' | 'livestream' | 'email' | 'tumblr';
const formatIdSchema = z.enum(['twitter', 'imessage', 'livestream', 'email', 'tumblr']);

// Editing state is intentionally NOT persisted -- multi-tab use was
// clobbering itself because both tabs auto-loaded and auto-saved against
// the same key. The Save / Load menu (NamedSave) is the persistence
// mechanism for in-progress work; the saved-users list persists in its
// own key via `usersStorage` so tabs share contacts but don't fight over
// drafts. `formatIdSchema` (above) is still used to validate the
// active-format dropdown's value at the dispatch site.

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
  z.object({
    version: z.number().optional(),
    name: z.string().nullable().optional(),
    savedAt: z.string().optional(),
    format: z.literal('email'),
    email: emailSchema,
  }),
  z.object({
    version: z.number().optional(),
    name: z.string().nullable().optional(),
    savedAt: z.string().optional(),
    format: z.literal('tumblr'),
    tumblr: tumblrSchema,
  }),
]);

// Schema for the file produced by handleExportUsers. `kind` and `version`
// are optional so older exports still validate; only `users` is required.
const userListImportSchema = z.object({
  version: z.number().optional(),
  kind: z.literal('user-list').optional(),
  savedAt: z.string().optional(),
  users: z.array(savedUserSchema),
});

// AppState only holds the live editing buffer. It is *not* persisted --
// each tab starts from defaults and the user opts in to persistence via
// the Save / Load menu. The users list lives in a separate React state
// backed by its own localStorage key (see `loadUsers` / `saveUsers`).
interface AppState {
  activeFormat: FormatId;
  twitter: TwitterPost;
  imessage: IMessageChain;
  livestream: LivestreamSegment;
  email: EmailThread;
  tumblr: TumblrPost;
  currentSaveId: string | null;
  currentSaveName: string | null;
}

const EMPTY_TWITTER: TwitterPost = {
  author: { avatar: { src: '', alt: '', width: 50, height: 50 }, name: '', handle: '', verified: false },
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

const EMPTY_EMAIL: EmailThread = {
  subject: '',
  label: '',
  messages: [],
};

const EMPTY_TUMBLR: TumblrPost = {
  entries: [],
  notes: '',
  timestamp: '',
};

function getInitialState(): AppState {
  // Always start from defaults. Editing state is tab-local now -- the
  // user uses Save / Load to persist anything they want to keep.
  return {
    activeFormat: 'twitter',
    twitter: formats.find(f => f.id === 'twitter')!.defaults as TwitterPost,
    imessage: imessageDefaults,
    livestream: livestreamDefaults,
    email: emailDefaults,
    tumblr: tumblrDefaults,
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

type ActiveData = TwitterPost | IMessageChain | LivestreamSegment | EmailThread | TumblrPost;

// Trigger a browser download of `data` serialized as pretty JSON.
function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Return the active format's data slot. Narrowed by `state.activeFormat`.
function activeData(state: AppState): ActiveData {
  switch (state.activeFormat) {
    case 'twitter':    return state.twitter;
    case 'imessage':   return state.imessage;
    case 'livestream': return state.livestream;
    case 'email':      return state.email;
    case 'tumblr':     return state.tumblr;
  }
}

// Set the active format's data slot, leaving the inactive slots untouched.
function setActiveData(state: AppState, data: ActiveData): AppState {
  switch (state.activeFormat) {
    case 'twitter':    return { ...state, twitter:    data as TwitterPost       };
    case 'imessage':   return { ...state, imessage:   data as IMessageChain     };
    case 'livestream': return { ...state, livestream: data as LivestreamSegment };
    case 'email':      return { ...state, email:      data as EmailThread       };
    case 'tumblr':     return { ...state, tumblr:     data as TumblrPost        };
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  // SavedUser list is the one slice that persists. Each tab loads on
  // mount and auto-saves on change (last-write-wins across tabs -- see
  // usersStorage for the rationale).
  const [users, setUsers] = useState<SavedUser[]>(() => loadUsers());
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
  const userFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveUsers(users);
  }, [users]);

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
        case 'email':
          return (
            state.email.subject.trim() !== '' ||
            state.email.label.trim() !== '' ||
            state.email.messages.length > 0
          );
        case 'tumblr':
          return (
            state.tumblr.entries.length > 0 ||
            state.tumblr.notes.trim() !== '' ||
            state.tumblr.timestamp.trim() !== ''
          );
      }
    }
    const allSaves = loadSaves();
    const named = allSaves.find(s => s.id === state.currentSaveId);
    if (!named) return true;
    const namedData =
      named.format === 'twitter'    ? named.twitter    :
      named.format === 'imessage'   ? named.imessage   :
      named.format === 'livestream' ? named.livestream :
      named.format === 'email'      ? named.email      :
                                      named.tumblr;
    return JSON.stringify(namedData) !== JSON.stringify(currentData);
  }

  function doNamedSave(id: string, name: string) {
    const base = { id, name, savedAt: new Date().toISOString() };
    const save: NamedSave =
      state.activeFormat === 'twitter'    ? { ...base, format: 'twitter',    twitter:    state.twitter    } :
      state.activeFormat === 'imessage'   ? { ...base, format: 'imessage',   imessage:   state.imessage   } :
      state.activeFormat === 'livestream' ? { ...base, format: 'livestream', livestream: state.livestream } :
      state.activeFormat === 'email'      ? { ...base, format: 'email',      email:      state.email      } :
                                            { ...base, format: 'tumblr',     tumblr:     state.tumblr     };
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
        case 'email':      return { ...s, activeFormat: 'email',      email:      save.email,      ...meta };
        case 'tumblr':     return { ...s, activeFormat: 'tumblr',     tumblr:     save.tumblr,     ...meta };
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
        case 'email':      return { ...s, activeFormat: 'email',      email:      parsed.email,      ...meta };
        case 'tumblr':     return { ...s, activeFormat: 'tumblr',     tumblr:     parsed.tumblr,     ...meta };
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
        s.activeFormat === 'livestream' ? { ...s, livestream: EMPTY_LIVESTREAM } :
        s.activeFormat === 'email'      ? { ...s, email:      EMPTY_EMAIL      } :
                                          { ...s, tumblr:     EMPTY_TUMBLR     };
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
      state.activeFormat === 'livestream' ? { ...base, format: 'livestream' as const, livestream: state.livestream } :
      state.activeFormat === 'email'      ? { ...base, format: 'email'      as const, email:      state.email      } :
                                            { ...base, format: 'tumblr'     as const, tumblr:     state.tumblr     };
    downloadJson(data, `${state.currentSaveName ?? `ao3-${state.activeFormat}`}.json`);
  }

  function handleExportUsers() {
    if (users.length === 0) {
      alert('No saved users to export. Add a user from the Users panel first.');
      return;
    }
    const data = {
      version: 1,
      kind: 'user-list' as const,
      savedAt: new Date().toISOString(),
      users,
    };
    downloadJson(data, 'ao3-user-list.json');
  }

  function handleImportUsersClick() {
    userFileInputRef.current?.click();
  }

  function handleImportUsersFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const raw = JSON.parse(evt.target?.result as string);
        const parsed = userListImportSchema.parse(raw);

        // Append, skipping users whose name + handle + email all match an
        // already-saved user. Keeps the panel from filling with duplicates
        // when re-importing the same file. Imported ids are reassigned so
        // they can't accidentally collide with anything local.
        let added = 0;
        let skipped = 0;
        setUsers(prev => {
          const next = [...prev];
          for (const u of parsed.users) {
            const isDup = next.some(existing =>
              existing.name === u.name &&
              existing.handle === u.handle &&
              existing.email === u.email,
            );
            if (isDup) {
              skipped++;
              continue;
            }
            next.push({ ...u, id: crypto.randomUUID() });
            added++;
          }
          return next;
        });
        setUsersOpen(true);
        alert(
          skipped > 0
            ? `Imported ${added} new user${added === 1 ? '' : 's'} (${skipped} already existed).`
            : `Imported ${added} user${added === 1 ? '' : 's'}.`,
        );
      } catch (err) {
        console.error('User list import failed:', err);
        alert('Could not import user list. Make sure it is a valid file exported from this tool.');
      }
    };
    reader.readAsText(file);
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
        s.activeFormat === 'livestream' ? { ...s, livestream: livestreamDefaults } :
        s.activeFormat === 'email'      ? { ...s, email:      emailDefaults      } :
                                          { ...s, tumblr:     tumblrDefaults     };
      return { ...reset, currentSaveId: null, currentSaveName: null };
    });
  }

  // Memoize the context value so consumers re-render only when users or
  // the drawer-open toggle actually changes (the closures themselves are
  // stable because they only touch setters).
  const userListContext = useMemo(() => ({
    users,
    addUser: (user: SavedUser) => {
      setUsers(prev => [...prev, user]);
      setUsersOpen(true);
    },
    updateUser: (user: SavedUser) =>
      setUsers(prev => prev.map(u => (u.id === user.id ? user : u))),
    removeUser: (id: string) =>
      setUsers(prev => prev.filter(u => u.id !== id)),
  }), [users]);

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
    state.activeFormat === 'livestream' ? segmentToMarkdown(state.livestream) :
    state.activeFormat === 'email'      ? threadToMarkdown(state.email)     :
                                          postToMarkdown(state.tumblr);
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
      <input
        ref={userFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportUsersFile}
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
                { label: 'Export user list', onClick: handleExportUsers },
                { label: 'Import user list', onClick: handleImportUsersClick },
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
