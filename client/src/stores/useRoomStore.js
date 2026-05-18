import { create } from 'zustand';

const useRoomStore = create((set) => ({
  roomId: null,
  joinCode: null,
  users: [],
  cursors: {},
  isConnected: false,
  connectionWarning: false,

  setConnection: (isConnected) => set({
    isConnected,
    connectionWarning: !isConnected,
  }),
  setRoom: ({ roomId, joinCode }) => set({ roomId, joinCode }),
  clearRoom: () => set({ roomId: null, joinCode: null, users: [], cursors: {} }),
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({
    users: [...state.users.filter((item) => item.userId !== user.userId), user],
  })),
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((item) => item.userId !== userId),
    cursors: Object.fromEntries(Object.entries(state.cursors).filter(([id]) => id !== userId)),
  })),
  setCursor: (cursor) => set((state) => ({
    cursors: { ...state.cursors, [cursor.userId]: cursor },
  })),
}));

export default useRoomStore;
