import "pinch-zoom-element";

import React, { useEffect, useState } from "react";

import { Timeline } from "./Timeline";
import { computeTagFilters, usePath } from "./path";
import { ClusterMeta, ItemMeta, findClusterMetas } from "./data";
import { BIG, VIDEO } from "./config";

export function Memories({ items }: { items: ItemMeta[] }) {
  const { search } = usePath();
  const [clusters, setClusters] = useState<ClusterMeta[] | null>(null);
  const [reverse, setReverse] = useState<Map<string, [number, number]> | null>(
    null,
  );
  const [flat, setFlat] = useState<ItemMeta[] | null>(null);
  const [pinchEnabled, setPinchEnabled] = useState(false);

  useEffect(() => {
    const { required, excluded } = computeTagFilters(search);
    setClusters(findClusterMetas(items, required, excluded));
  }, [search]);

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

  if (clusters == null || reverse == null || flat == null) return null;

  return (
    <>
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
