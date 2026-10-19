/**
 * Host half of the local backdrop plugin.
 *
 * Everything the feature needs lives in the Client half: the picked image never
 * leaves the page, and the preference is a browser-local one. The Host row exists
 * only so the bundle has a Loader entry, so this half deliberately registers no
 * service, tool, or event.
 */
export function apply() {}
