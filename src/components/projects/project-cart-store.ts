import { create } from 'zustand';
import type { CartLine, DecorationSpec } from '@/lib/types';

export interface ProjectCartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  updateDecoration: (index: number, decoration: DecorationSpec | null) => void;
  removeLine: (index: number) => void;
  clear: () => void;
}

export const useProjectCartStore = create<ProjectCartState>((set) => ({
  lines: [],
  addLine: (line) =>
    set((state) => ({
      lines: [...state.lines, line],
    })),
  updateDecoration: (index, decoration) =>
    set((state) => ({
      lines: state.lines.map((line, i) => (i === index ? { ...line, decoration: decoration ?? null } : line)),
    })),
  removeLine: (index) =>
    set((state) => ({
      lines: state.lines.filter((_, i) => i !== index),
    })),
  clear: () => set({ lines: [] }),
}));


