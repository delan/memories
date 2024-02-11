import "pinch-zoom-element";

import React, { MouseEvent, PropsWithChildren, useEffect, useState } from "react";

import { Timeline } from "./Timeline";
import { parseSearch, parseTagFilters, tagFilterIsNegative, tagFilterName, usePath } from "./path";
import { ClusterMeta, ItemMeta, findClusterMetas } from "./data";
import { BIG, VIDEO } from "./config";

export function Memories({ items }: { items: ItemMeta[] }) {
  const { search } = usePath();
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set);

  // all items (items), and their derived state
  const [itemsByPath, setItemsByPath] = useState<Map<string, ItemMeta>>(new Map);

  // search results, and their derived state
  const [clusters, setClusters] = useState<ClusterMeta[] | null>(null);
  const [reverse, setReverse] = useState<Map<string, [number, number]> | null>(
    null,
  );
  const [flat, setFlat] = useState<ItemMeta[] | null>(null);

  const [pinchEnabled, setPinchEnabled] = useState(false);

  useEffect(() => {
    const itemsByPath = new Map;
    items.forEach(item => itemsByPath.set(item.path, item));
    setItemsByPath(itemsByPath);
  }, [items]);

  useEffect(() => {
    const tagFilters = parseSearch(search);
    const { required, excluded } = parseTagFilters(tagFilters);
    setTagFilters(tagFilters);
    setClusters(findClusterMetas(items, required, excluded));
  }, [items, search]);

  useEffect(() => {
    if (clusters == null) return;

    const reverse = new Map();
    clusters.forEach((cluster, i) => {
      cluster.items.forEach((item, j) => {
        reverse.set(item.path, [i, j]);
      });
    });

    const flat = clusters
      .flatMap((cluster) => cluster.items)
      .sort((p, q) => p.index - q.index);

    setReverse(reverse);
    setFlat(flat);
  }, [clusters]);

  if (itemsByPath == null) return null;
  if (clusters == null) return null;
  if (reverse == null) return null;
  if (flat == null) return null;

  return (
    <>
      <Sidebar itemsByPath={itemsByPath} tagFilters={tagFilters} />
      <Display pinchEnabled={pinchEnabled} setPinchEnabled={setPinchEnabled} />
      <Timeline
        clusters={clusters}
        reverse={reverse}
        flat={flat}
        setPinchEnabled={setPinchEnabled}
      />
    </>
  );
}

export function Sidebar({ itemsByPath, tagFilters }: {
  itemsByPath: Map<string, ItemMeta>;
  tagFilters: Set<string>;
}) {
  const { path, search, pushSearch } = usePath();

  return <>
    <details className="Sidebar">
      <summary></summary>
      {/* <h2>search</h2> */}
      <ul onClick={click}>
        {[...tagFilters].map(tagFilter => <li>
          [<TagLink search={query(search, [tagFilter])}>×</TagLink>]
          {" "}
          <TagLink search={query("", [], tagFilter)}>
            {tagFilterIsNegative(tagFilter) ? `−` : `+`}
            {tagFilterName(tagFilter)}
          </TagLink>
        </li>)}
      </ul>
      {/* <h2>tags</h2> */}
      <ul onClick={click}>
        {currentTags().map(tag => <li>
          [<TagLink search={query(search, [], tag)}>+</TagLink>]
          [<TagLink search={query(search, [], `-${tag}`)}>−</TagLink>]
          {" "}
          <TagLink search={query("", [], tag)}>{tag}</TagLink>
        </li>)}
      </ul>
    </details>
  </>;

  function currentTags() {
    if (path == null) return [];
    const result = itemsByPath.get(path);
    if (result == null) return [];
    return result.tags;
  }

  function query(initialSearch: string, remove: string[], ...add: string[]) {
    const initialParams = new URLSearchParams(initialSearch);
    let newParams = "";
    for (const signedTag of [...remove, ...add]) {
      const tag = tagFilterName(signedTag);
      initialParams.delete(tag);
      initialParams.delete(`-${tag}`);
    }
    for (const signedTag of add) {
      if (initialParams.size > 0)
        newParams += "&";
      newParams += encodeURIComponent(signedTag);
    }
    return "?" + initialParams.toString().replace(/=($|&)/g, "$1") + newParams;
  }

  function click(event: MouseEvent<HTMLElement>) {
    if (
      event.target == null ||
      !(event.target instanceof HTMLElement) ||
      event.target.nodeName != "A" ||
      event.target.dataset.search == null
    ) {
      return;
    }
    // Don’t navigate due to clicking on a link.
    event.preventDefault();
    pushSearch(event.target.dataset.search);
  }

  function TagLink({ children, search }: PropsWithChildren<{ search: string }>) {
    return <a href={search} data-search={search}>{children}</a>;
  }
}

export function Display({
  pinchEnabled,
  setPinchEnabled,
}: {
  pinchEnabled: boolean;
  setPinchEnabled: (_: boolean) => void;
}) {
  const { path } = usePath();

  if (path) {
    if (VIDEO.test(path)) {
      return (
        <div className="Display">
          <video src={BIG(path)} controls autoPlay />
        </div>
      );
    } else if (pinchEnabled) {
      return (
        <pinch-zoom class="Display" style={{ cursor: "all-scroll" }}>
          <img src={BIG(path)} />
        </pinch-zoom>
      );
    } else {
      return (
        <div
          className="Display"
          onClick={() => setPinchEnabled(true)}
          style={{ cursor: "zoom-in" }}
        >
          <img src={BIG(path)} />
        </div>
      );
    }
  }

  return (
    <div className="Display">
      <img />
    </div>
  );
}
