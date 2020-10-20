export function debug(x: any, ...rest: any[]) {
  if (DEBUG) {
    console.log(x, ...rest);
    const debug = document.querySelector("#debug")!;
    debug.textContent = `${[x, ...rest].join(" ")}\n${debug.textContent}`;
  }
  return x;
}

onerror = (m /* , s, l, c, e */) => {
  // debug(`[E] ${s}:${l}:${c} ${m}`);
  debug(`[E] ${m}`);
};
