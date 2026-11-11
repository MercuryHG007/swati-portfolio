"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export interface ProposedSubject {
  name: string;
  checked: boolean;
}

interface AiArtworkState {
  altText: string;
  setAltText: (value: string) => void;
  proposed: ProposedSubject[];
  setProposed: Dispatch<SetStateAction<ProposedSubject[]>>;
  seriesNote: string;
  setSeriesNote: (value: string) => void;
}

const AiArtworkContext = createContext<AiArtworkState | null>(null);

// The AI button fills fields across the whole form. Its results are shared here so each result can
// render beside the field it belongs to.
export function AiArtworkProvider({ children }: { children: ReactNode }) {
  const [altText, setAltText] = useState("");
  const [proposed, setProposed] = useState<ProposedSubject[]>([]);
  const [seriesNote, setSeriesNote] = useState("");
  const value = useMemo(
    () => ({ altText, setAltText, proposed, setProposed, seriesNote, setSeriesNote }),
    [altText, proposed, seriesNote],
  );
  return <AiArtworkContext.Provider value={value}>{children}</AiArtworkContext.Provider>;
}

export function useAiArtwork(): AiArtworkState {
  const value = useContext(AiArtworkContext);
  if (!value) throw new Error("useAiArtwork must be used inside AiArtworkProvider");
  return value;
}
