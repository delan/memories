import "pinch-zoom-element";

import React, { useState } from "react";

import { Timeline } from "./Timeline";
import { usePath } from "./path";
import { ClusterMeta } from "./data";
import { BIG } from "./config";

export function Memories({ clusters }: { clusters: ClusterMeta[] }) {
  const [pinchEnabled, setPinchEnabled] = useState(false);

  return (
    <>
      <Display pinchEnabled={pinchEnabled} setPinchEnabled={setPinchEnabled} />
      <Timeline clusters={clusters} setPinchEnabled={setPinchEnabled} />
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
    if (pinchEnabled) {
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
