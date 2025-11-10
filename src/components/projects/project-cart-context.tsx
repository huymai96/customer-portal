'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import type { ProjectCartState } from './project-cart-store';
import { useProjectCartStore } from './project-cart-store';

const ProjectCartContext = createContext<typeof useProjectCartStore | null>(null);

export function ProjectCartProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => useProjectCartStore, []);
  return <ProjectCartContext.Provider value={store}>{children}</ProjectCartContext.Provider>;
}

export function useProjectCart<T>(selector: (state: ProjectCartState) => T): T {
  const store = useContext(ProjectCartContext);
  if (!store) {
    throw new Error('useProjectCart must be used within ProjectCartProvider');
  }
  return useStore(store, selector);
}


