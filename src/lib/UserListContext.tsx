import { createContext, useContext } from 'react';
import type { SavedUser } from './savedUser';

interface UserListContextValue {
  users: SavedUser[];
  addUser: (user: SavedUser) => void;
  updateUser: (user: SavedUser) => void;
  removeUser: (id: string) => void;
}

export const UserListContext = createContext<UserListContextValue | null>(null);

export function useUserList(): UserListContextValue {
  const ctx = useContext(UserListContext);
  if (!ctx) throw new Error('useUserList must be used within UserListContext.Provider');
  return ctx;
}
