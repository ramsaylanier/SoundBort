import { create } from 'zustand'

interface ModalState {
  keybindModalCell: number | null
  recordModalCell: number | null
  clipEditModalCell: number | null
  settingsOpen: boolean
}

interface ModalActions {
  openKeybindModal: (cell: number) => void
  closeKeybindModal: () => void
  openRecordModal: (cell: number) => void
  closeRecordModal: () => void
  openClipEditModal: (cell: number) => void
  closeClipEditModal: () => void
  openSettings: () => void
  closeSettings: () => void
}

export const useModalStore = create<ModalState & ModalActions>((set) => ({
  keybindModalCell: null,
  recordModalCell: null,
  clipEditModalCell: null,
  settingsOpen: false,

  openKeybindModal: (cell) => set({ keybindModalCell: cell }),
  closeKeybindModal: () => set({ keybindModalCell: null }),
  openRecordModal: (cell) => set({ recordModalCell: cell }),
  closeRecordModal: () => set({ recordModalCell: null }),
  openClipEditModal: (cell) => set({ clipEditModalCell: cell }),
  closeClipEditModal: () => set({ clipEditModalCell: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}))
