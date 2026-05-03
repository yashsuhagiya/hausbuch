// Backend registry. Holds the active Backend implementation; the store
// reads from here on every call so swapping the backend (e.g. injecting
// an in-memory fake in tests) takes effect without re-creating the store.
//
// Default is the remote (Postgres-backed) adapter. Tests that want a
// pure in-memory backend can call setBackend(fakeBackend) in their
// setup, then setBackend(remoteBackend) in teardown.

import { remoteBackend } from "./remote";
import type { Backend } from "./types";

let active: Backend = remoteBackend;

export function getBackend(): Backend {
  return active;
}

export function setBackend(b: Backend): void {
  active = b;
}

export { remoteBackend } from "./remote";
export type { Backend, BackendSnapshot } from "./types";
