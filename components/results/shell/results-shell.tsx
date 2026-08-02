"use client";

import { useCallback, useState } from "react";
import { ResultsNav, MobileTabBar } from "./results-nav";
import { GlobalSearch, useSearchHotkey } from "../search/global-search";

/**
 * Client shell for the Results section: sub-navigation, mobile tab bar and
 * the search overlay, with one piece of shared state between them.
 *
 * Kept separate from the route layout so the layout itself stays a Server
 * Component and pages keep server-rendering their metadata and data.
 */
export function ResultsShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useSearchHotkey(openSearch);

  return (
    <>
      <ResultsNav onOpenSearch={openSearch} />
      {children}
      <MobileTabBar onOpenSearch={openSearch} />
      <GlobalSearch open={searchOpen} onClose={closeSearch} />
    </>
  );
}
