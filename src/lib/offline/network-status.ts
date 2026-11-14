import { useSyncExternalStore } from "react";
import * as Network from "expo-network";

type Listener = (online: boolean) => void;

let deviceOnline = true;
/** Set when a request failed at the transport level; cleared by the next success or a network change. */
let requestFailed = false;
let started = false;
const listeners = new Set<Listener>();

function currentOnline() {
  return deviceOnline && !requestFailed;
}

function update(nextDeviceOnline: boolean, nextRequestFailed: boolean) {
  const before = currentOnline();
  deviceOnline = nextDeviceOnline;
  requestFailed = nextRequestFailed;
  const after = currentOnline();
  if (before !== after) {
    for (const listener of listeners) listener(after);
  }
}

function isStateOnline(state: Network.NetworkState) {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function startNetworkMonitoring() {
  if (started) return;
  started = true;

  void Network.getNetworkStateAsync()
    .then((state) => update(isStateOnline(state), false))
    .catch(() => undefined);

  Network.addNetworkStateListener((state) => {
    update(isStateOnline(state), false);
  });
}

export function isOnline() {
  return currentOnline();
}

export function subscribeNetworkStatus(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportNetworkFailure() {
  update(deviceOnline, true);
}

export function reportNetworkSuccess() {
  update(true, false);
}

/** `fetch` rejects with a TypeError (or an AbortError on timeout) when the server can't be reached. */
export function isNetworkError(error: unknown) {
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

export function useNetworkStatus() {
  return useSyncExternalStore(subscribeNetworkStatus, currentOnline, currentOnline);
}
