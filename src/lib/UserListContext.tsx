import { createContext, useContext } from 'react';
import type { TwitterUser } from '../formats/twitter/types';

interface UserListContextValue {
  users: TwitterUser[];
  addUser: (user: TwitterUser) => void;
  removeUser: (id: string) => void;
}

export const UserListContext = createContext<UserListContextValue | null>(null);

export function useUserList(): UserListContextValue {
  const ctx = useContext(UserListContext);
  if (!ctx) throw new Error('useUserList must be used within UserListContext.Provider');
  return ctx;
}
