import { useState, useEffect } from "react";

type State = Pick<PopStateEvent, "state">;

const handlers: ((_: State) => void)[] = [];

export function usePath() {
  const [path, setPath] = useState(getPath());
  const [search, setSearch] = useState(getSearch());

  useEffect(() => {
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    handlers.push(handler);
    return () => void handlers.splice(handlers.indexOf(handler), 1);
  }, []);

  return { path, search, push };

  function handler({ state }: State) {
    const { path, search } = state;
    setPath(path);
    setSearch(search);
  }

  function push(path: string) {
    const search = getSearch();
    const state = { path, search };
    history.pushState(state, "", path + search);
    handlers.forEach((handler) => handler({ state }));
  }
}

function getPath() {
  const base = new URL(".", location.href);
  if (location.href.startsWith(base.href)) {
    return location.pathname.slice(base.pathname.length);
  }

  return null;
}

function getSearch() {
  return location.search;
}

export function computeTagFilters(search: string) {
  const result = {
    required: new Set<string>(),
    excluded: new Set<string>(),
  };
  const params = new URLSearchParams(search);
  for (const key of params.keys()) {
    if (key.startsWith("-")) {
      result.excluded.add(key.slice(1));
    } else {
      result.required.add(key);
    }
  }
  return result;
}
