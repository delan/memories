import React, { useEffect, useRef, useLayoutEffect, MouseEvent } from "react";
import { usePath } from "./path";
import { ClusterMeta, ItemMeta } from "./data";

export function Timeline({ clusters }: { clusters: ClusterMeta[] }) {
  const { path } = usePath();
  const self = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    get(path)?.scrollIntoView({
      inline: "center",
      block: "center",
      behavior: "auto",
    });
  }, []);

  return (
    <div ref={self} className="Timeline">
      {clusters.map(({ ...rest }, i) => (
        <Cluster key={i} {...rest} />
      ))}
    </div>
  );

  function get(path: string | null) {
    return self.current!.querySelector(`[data-src="${path}"]`);
  }
}

export function Cluster({ items }: ClusterMeta) {
  const { path: selected } = usePath();
  const self = useRef<HTMLDivElement>(null);
  const classes = ["Cluster"];

  useEffect(() => {
    self.current!.style.setProperty("--len", String(items.length));
  }, [items.length]);

  if (items.some(({ path }) => path == selected)) {
    classes.push("selected");
  }

  return (
    <div ref={self} className={classes.join(" ")}>
      {[...items].reverse().map(({ path, ...rest }, i) => (
        <Item key={path} index={i} path={path} {...rest} />
      ))}
    </div>
  );
}

export function Item({ index, path, x, y }: { index: number } & ItemMeta) {
  const { path: selected, push } = usePath();
  const self = useRef<HTMLAnchorElement>(null);
  const classes = ["Item"];

  useEffect(() => {
    self.current!.style.setProperty("--index", String(index));
  }, [index]);

  useEffect(() => {
    if (path == selected) {
      self.current!.scrollIntoView({
        inline: "center",
        block: "center",
        behavior: "smooth",
      });
    }
  }, [selected]);

  if (path == selected) {
    classes.push("selected");
  }

  return (
    <a
      ref={self}
      className={classes.join(" ")}
      href={path}
      data-src={path}
      onClick={click}
    >
      <svg viewBox={`0 0 ${x} ${y}`}>
        <image width={x} height={y} href={`i/${path}.png`} />
      </svg>
    </a>
  );

  function click(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    push(event.currentTarget.dataset.src!);
  }
}
