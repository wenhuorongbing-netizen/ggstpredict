"use client";

export interface LoungeMegaphone {
  id: string;
  message: string;
  expiresAt: string;
  user: {
    displayName: string;
    nameColor: string;
  };
}

export interface LoungeState {
  robbieHexes: string[];
  megaphones: LoungeMegaphone[];
}

const EMPTY_LOUNGE_STATE: LoungeState = {
  robbieHexes: [],
  megaphones: [],
};

let loungePromise: Promise<LoungeState> | null = null;

export function invalidateLoungeStateCache() {
  loungePromise = null;
}

export function loadLoungeState(force = false) {
  if (force || !loungePromise) {
    loungePromise = fetch("/api/lounge", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load lounge state");
        }

        return response.json() as Promise<LoungeState>;
      })
      .catch(() => EMPTY_LOUNGE_STATE);
  }

  return loungePromise;
}
