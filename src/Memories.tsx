import "pinch-zoom-element";

import React from "react";

import { Timeline } from "./Timeline";
import { usePath } from "./path";
import { ClusterMeta } from "./data";
import { BIG } from "./config";

export function Memories({ clusters }: { clusters: ClusterMeta[] }) {
  return (
    <>
      <Display />
      <Timeline clusters={clusters} />
    </>
  );
}

export function Display() {
  const { path } = usePath();

  if (path) {
    return (
      <pinch-zoom class="Display">
        <img src={BIG(path)} />
      </pinch-zoom>
    );
  }

  return (
    <div className="Display">
      <img />
    </div>
  );
}
