/**
 * Fallback when the dev client was built before expo-network was linked.
 * Rebuild with `npx expo run:ios` for real network state (Better Auth optional).
 */
function addNetworkStateListener(listener) {
  listener({ isConnected: true, isInternetReachable: true, type: "UNKNOWN" });
  return { remove: () => {} };
}

async function getNetworkStateAsync() {
  return {
    isConnected: true,
    isInternetReachable: true,
    type: "UNKNOWN",
  };
}

module.exports = {
  addNetworkStateListener,
  getNetworkStateAsync,
};
