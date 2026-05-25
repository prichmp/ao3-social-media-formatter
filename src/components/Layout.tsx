import type React from 'react';
import styles from './Layout.module.css';

interface Props {
  header: React.ReactNode;
  form: React.ReactNode;
  preview: React.ReactNode;
  output: React.ReactNode;
  userList: React.ReactNode;
  usersOpen: boolean;
  onUsersOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Layout({ header, form, preview, output, userList, usersOpen, onUsersOpenChange }: Props) {
  const setUsersOpen = onUsersOpenChange;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {header}
      </header>
      <div className={styles.body}>
        <div className={`${styles.usersDrawer} ${usersOpen ? styles.usersDrawerOpen : ''}`}>
          <button className={styles.usersDrawerTab} onClick={() => setUsersOpen(o => !o)}>
            <span className={styles.usersDrawerTabText}>Saved Users</span>
          </button>
          <div className={styles.usersDrawerHead}>
            <div>
              <div className={styles.usersDrawerTitle}>Saved Users</div>
              <div className={styles.usersDrawerHint}>drag to Author or Replies</div>
            </div>
            <button className={styles.usersDrawerClose} onClick={() => setUsersOpen(false)}>×</button>
          </div>
          <div className={styles.usersDrawerBody}>
            {userList}
          </div>
        </div>
        <div className={styles.left}>{form}</div>
        <div className={styles.right}>
          <div className={styles.previewSection}>
            <h2 className={styles.sectionHeading}>Preview</h2>
            {preview}
          </div>
          <div className={styles.outputSection}>
            <h2 className={styles.sectionHeading}>Output</h2>
            {output}
          </div>
        </div>
      </div>
      <footer className={styles.footer}>
        <span>Not affiliated with AO3</span>
        <span className={styles.footerSep} aria-hidden="true">·</span>
        <span>
          For bugs,{' '}
          <a
            className={styles.footerLink}
            href="https://github.com/prichmp/ao3-social-media-formatter/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            file an issue on GitHub
          </a>
        </span>
        <span className={styles.footerSep} aria-hidden="true">·</span>
        <span>If errors persist after refresh, try clearing your browser&apos;s Local Storage.</span>
      </footer>
    </div>
  );
}
