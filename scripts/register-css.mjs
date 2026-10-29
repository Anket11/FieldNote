import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Next handles CSS imports in the app; Node only needs the exported class names.
const require = createRequire(import.meta.url);
require.extensions[".css"] = (module, filename) => {
  const css = readFileSync(filename, "utf8");
  module.exports = Object.fromEntries([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => [match[1], match[1]]));
};
