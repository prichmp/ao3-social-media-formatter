import { useUserList } from '../lib/UserListContext';
import { TWITTER_USER_DRAG_TYPE } from '../formats/twitter/types';
import type { TwitterUser } from '../formats/twitter/types';
import styles from './UserListPanel.module.css';

export function UserListPanel() {
  const { users, removeUser } = useUserList();

  function handleDragStart(e: React.DragEvent, user: TwitterUser) {
    e.dataTransfer.setData(TWITTER_USER_DRAG_TYPE, JSON.stringify(user));
    e.dataTransfer.effectAllowed = 'copy';
  }

  if (users.length === 0) {
    return (
      <div className={styles.panel}>
        <p className={styles.empty}>No saved users yet. Use &ldquo;Add to user list&rdquo; on a reply card.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {users.map(user => (
        <div
          key={user.id}
          className={styles.card}
          draggable
          onDragStart={e => handleDragStart(e, user)}
        >
          {user.avatar.src && (
            <img
              className={styles.avatar}
              src={user.avatar.src}
              alt={user.avatar.alt || user.name}
              width={28}
              height={28}
            />
          )}
          <div className={styles.info}>
            <span className={styles.name}>{user.name}</span>
            <span className={styles.handle}>@{user.handle}</span>
          </div>
          <button className={styles.removeBtn} onClick={() => removeUser(user.id)} title="Remove">×</button>
        </div>
      ))}
    </div>
  );
}
