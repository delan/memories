import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  MouseEvent,
  WheelEvent,
  ReactFragment,
  useState,
  useMemo,
} from "react";
import classNames from "classnames";

import { usePath } from "./path";
import { ClusterMeta, ItemMeta } from "./data";

export function Timeline({ clusters }: { clusters: ClusterMeta[] }) {
  const { path, push } = usePath();
  const self = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<number | null>(null);

  const reverse = useMemo(() => {
    const result = new Map<string, [number, number]>();
    clusters.forEach((cluster, i) => {
      cluster.items.forEach(({ path }, j) => {
        result.set(path, [i, j]);
      });
    });
    return result;
  }, [clusters]);

  const flat = useMemo(
    () =>
      clusters
        .flatMap((cluster) => cluster.items)
        .sort((p, q) => p.index - q.index),
    [clusters],
  );

  return (
    <div ref={self} onWheel={wheel} className="Timeline">
      {clusters.map((cluster, i) => (
        <Cluster
          key={i}
          length={cluster.items.length}
          expanded={clusterIsExpanded(i)}
          onFocus={() => void setFocused(i)}
        >
          {cluster.items.map((item, j) => (
            <Item
              key={item.path}
              indexInCluster={j}
              selected={itemIsSelected(i, j)}
              {...item}
            />
          ))}
        </Cluster>
      ))}
    </div>
  );

  function clusterIsExpanded(i: number): boolean {
    return i == focused || clusterIsSelected(i);
  }

  function clusterIsSelected(i: number): boolean {
    if (path == null || !reverse.has(path)) {
      return false;
    }

    return i == reverse.get(path)![0];
  }

  function itemIsSelected(i: number, j: number): boolean {
    return clusterIsSelected(i) && j == reverse.get(path!)![1];
  }

  function move(delta: number) {
    if (path == null || !reverse.has(path)) {
      return;
    }

    const [i, j] = reverse.get(path)!;
    const index = clusters[i].items[j].index + delta;

    if (index in flat) {
      push(flat[index].path);
    }
  }

  function wheel(event: WheelEvent<HTMLElement>) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    event.preventDefault();
    move(Math.sign(event.deltaY));
  }
}

export function Cluster({
  children,
  length,
  expanded,
  onFocus,
}: {
  children: ReactFragment;
  length: number;
  expanded: boolean;
  onFocus: () => void;
}) {
  const self = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={self}
      className={classNames("Cluster", { expanded })}
      style={{ "--length": length }}
      onFocus={onFocus}
    >
      {children}
    </div>
  );
}

export function Item({
  indexInCluster,
  selected,
  path,
  x,
  y,
}: { indexInCluster: number; selected: boolean } & ItemMeta) {
  const { push } = usePath();
  const self = useRef<HTMLAnchorElement>(null);
  const previous = usePrevious(selected);

  useLayoutEffect(() => {
    if (selected) {
      self.current!.scrollIntoView({
        inline: "center",
        block: "center",
        behavior: "auto",
      });
    }
  }, []);

  useEffect(() => {
    if (selected) {
      self.current!.focus({
        // shouldn’t be load-bearing; just for efficiency
        preventScroll: true,
      });

      if (!previous) {
        self.current!.scrollIntoView({
          inline: "center",
          block: "center",
          behavior: "smooth",
        });
      }
    }
  }, [selected]);

  return (
    <a
      ref={self}
      className={classNames("Item", { selected })}
      style={{ "--index": indexInCluster }}
      href={path}
      onClick={click}
      onFocus={focus}
    >
      <svg viewBox={`0 0 ${x} ${y}`} preserveAspectRatio="xMaxYMid slice">
        <image width={x} height={y} href={`i/${path}.png`} />
      </svg>
    </a>
  );

  function click(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    push(path);
  }

  function focus() {
    if (!selected || previous) {
      self.current!.scrollIntoView({
        inline: "nearest",
        block: "nearest",
        behavior: "smooth",
      });
    }
  }
}

function usePrevious<T>(value: T) {
  const state = useRef<T | null>(null);

  useEffect(() => {
    state.current = value;
  });

  return state.current;
}
