/** Escape a string for safe use inside a RegExp source (e.g. user search queries). */
export function escapeRegExp(s) {
  return String(s).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
