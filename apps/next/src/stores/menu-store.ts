"use client";

import type { MenuNode } from "@/lib/api-types";

import { create } from "zustand";

interface MenuState {
  menus: MenuNode[] | null;
  setMenus: (menus: MenuNode[]) => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  menus: null,
  setMenus: (menus) => set({ menus }),
}));
