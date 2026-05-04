export function isElectronAvailable() {
  return typeof window !== "undefined" && !!window.keepAPI;
}
