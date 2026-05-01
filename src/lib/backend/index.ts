// Backend selector — picks LocalBackend or RemoteBackend based on whether
// the caller has an authenticated session. Components that need a backend
// should use `getBackend(signedIn)` rather than importing the concrete impls.

import { localBackend } from "./local";
import { remoteBackend } from "./remote";
import type { Backend } from "./types";

export function getBackend(signedIn: boolean): Backend {
  return signedIn ? remoteBackend : localBackend;
}

export type { Backend, BackendSnapshot } from "./types";
