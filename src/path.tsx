import { useState, useEffect } from "react";

type State = Pick<PopStateEvent, "state">;

const handlers: ((_: State) => void)[] = [];

export function usePath() {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    handlers.push(handler);
    return () => void handlers.splice(handlers.indexOf(handler), 1);
  }, []);

  return { path, push };

  function handler({ state }: State) {
    setPath(state);
  }

  function push(path: string) {
    history.pushState(path, "", path);
    handlers.forEach((handler) => handler({ state: path }));
  }
}

function getPath() {
  if (location.href.startsWith(document.baseURI)) {
    const base = new URL(document.baseURI);
    return location.pathname.slice(base.pathname.length);
  }

  return null;
}
