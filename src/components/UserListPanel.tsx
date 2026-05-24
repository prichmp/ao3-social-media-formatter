import { useState, type DragEvent, type ReactNode } from 'react';
import { useUserList } from '../lib/UserListContext';
import { SAVED_USER_DRAG_TYPE, emptySavedUser, type SavedUser } from '../lib/savedUser';
import { ImageInput } from './ImageInput';
import styles from './UserListPanel.module.css';

export function UserListPanel() {
  const { users, addUser, updateUser, removeUser } = useUserList();
  const [draft, setDraft] = useState<SavedUser>(emptySavedUser);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleDragStart(e: DragEvent, user: SavedUser) {
    e.dataTransfer.setData(SAVED_USER_DRAG_TYPE, JSON.stringify(user));
    e.dataTransfer.effectAllowed = 'copy';
  }

  function handleAdd() {
    if (!hasIdentity(draft)) return;
    addUser(draft);
    setDraft(emptySavedUser());
  }

  return (
    <div className={styles.panel}>
      <details
        className={styles.addSection}
        open={formOpen}
        onToggle={e => setFormOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className={styles.addSummary}>+ New user</summary>
        <div className={styles.addBody}>
          <UserFields user={draft} onChange={setDraft} />
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleAdd}
            disabled={!hasIdentity(draft)}
          >
            Add user
          </button>
        </div>
      </details>

      {users.length === 0 ? (
        <p className={styles.empty}>No saved users yet. Add one above, or use &ldquo;Add to user list&rdquo; on a card.</p>
      ) : (
        <div className={styles.list}>
          {users.map(user => (
            editingId === user.id ? (
              <EditCard
                key={user.id}
                user={user}
                onSave={updated => { updateUser(updated); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ViewCard
                key={user.id}
                user={user}
                onEdit={() => setEditingId(user.id)}
                onRemove={() => removeUser(user.id)}
                onDragStart={e => handleDragStart(e, user)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

function hasIdentity(user: SavedUser): boolean {
  return user.name.trim() !== '' || user.handle.trim() !== '' || user.email.trim() !== '';
}

function ViewCard({ user, onEdit, onRemove, onDragStart }: {
  user: SavedUser;
  onEdit: () => void;
  onRemove: () => void;
  onDragStart: (e: DragEvent) => void;
}) {
  return (
    <div className={styles.card} draggable onDragStart={onDragStart}>
      {user.avatar.src ? (
        <img
          className={styles.avatar}
          src={user.avatar.src}
          alt={user.avatar.alt || user.name}
          width={28}
          height={28}
        />
      ) : (
        <span
          className={styles.avatarFallback}
          style={{ background: user.color || '#888' }}
          aria-hidden="true"
        >
          {(user.name || user.handle || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <div className={styles.info}>
        <span className={styles.name}>{user.name || user.handle || '—'}</span>
        <span className={styles.handle}>
          {user.handle ? `@${user.handle}` : user.email}
        </span>
      </div>
      <button
        className={styles.iconBtn}
        onClick={onEdit}
        title="Edit"
        aria-label="Edit user"
      >
        ✎
      </button>
      <button
        className={styles.removeBtn}
        onClick={onRemove}
        title="Remove"
        aria-label="Remove user"
      >
        ×
      </button>
    </div>
  );
}

function EditCard({ user, onSave, onCancel }: {
  user: SavedUser;
  onSave: (updated: SavedUser) => void;
  onCancel: () => void;
}) {
  // Local draft so the user can cancel without committing. Seeded once from
  // the incoming user; further updates land in the local state only.
  const [draft, setDraft] = useState<SavedUser>(user);

  return (
    <div className={styles.editCard}>
      <UserFields user={draft} onChange={setDraft} />
      <div className={styles.editActions}>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => onSave(draft)}
          disabled={!hasIdentity(draft)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function UserFields({ user, onChange }: {
  user: SavedUser;
  onChange: (u: SavedUser) => void;
}) {
  return (
    <>
      <Field label="Display name">
        <input
          type="text"
          className={styles.input}
          value={user.name}
          onChange={e => onChange({ ...user, name: e.target.value })}
          placeholder="e.g. Adora Grayskull"
        />
      </Field>
      <Field label="Handle / username">
        <input
          type="text"
          className={styles.input}
          value={user.handle}
          onChange={e => onChange({ ...user, handle: e.target.value })}
          placeholder="adoragrayskull (no @)"
        />
      </Field>
      <Field label="Email">
        <input
          type="text"
          className={styles.input}
          value={user.email}
          onChange={e => onChange({ ...user, email: e.target.value })}
          placeholder="adora@example.com"
        />
      </Field>
      <Field label="Color">
        <div className={styles.colorRow}>
          <input
            type="color"
            className={styles.colorSwatch}
            value={user.color || '#1DA1F2'}
            onChange={e => onChange({ ...user, color: e.target.value })}
            aria-label="User color"
          />
          <input
            type="text"
            className={styles.input}
            value={user.color}
            onChange={e => onChange({ ...user, color: e.target.value })}
            placeholder="#1DA1F2"
          />
        </div>
      </Field>
      <Field label="Avatar">
        <ImageInput
          value={user.avatar}
          onChange={v => onChange({ ...user, avatar: v })}
          defaultDimensions={40}
          showDimensions={false}
          uploadMaxSize={240}
        />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
