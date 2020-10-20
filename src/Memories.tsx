import React from "react";

import { Timeline } from "./Timeline";
import { usePath } from "./path";
import { ClusterMeta } from "./data";

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
      <div className="Display">
        <img src={`i/${path}`} />
      </div>
    );
  }

  return (
    <div className="Display">
      <img />
    </div>
  );
}
