import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  MouseEvent,
  WheelEvent,
} from "react";
import { usePath } from "./path";
import { ClusterMeta, ItemMeta } from "./data";

export function Timeline({ clusters }: { clusters: ClusterMeta[] }) {
  const { path, push } = usePath();
  const self = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    get(path)?.scrollIntoView({
      inline: "center",
      block: "center",
      behavior: "auto",
    });
  }, []);

  return (
    <div ref={self} onWheel={wheel} className="Timeline">
      {clusters.map(({ ...rest }, i) => (
        <Cluster key={i} {...rest} />
      ))}
    </div>
  );

  function get(path: string | null): HTMLElement {
    return self.current!.querySelector(`[data-src="${path}"]`) as HTMLElement;
  }

  function getByIndex(index: number): HTMLElement {
    return self.current!.querySelector(
      `[data-index="${index}"]`,
    ) as HTMLElement;
  }

  function wheel(event: WheelEvent<HTMLElement>) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    event.preventDefault();

    const index = get(path)?.dataset.index;

    if (index == null) {
      return;
    }

    getByIndex(Number(index) + Math.sign(event.deltaY))?.click();
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
        <Item key={path} i={i} path={path} {...rest} />
      ))}
    </div>
  );
}

export function Item({ i, index, path, x, y }: { i: number } & ItemMeta) {
  const { path: selected, push } = usePath();
  const self = useRef<HTMLAnchorElement>(null);
  const classes = ["Item"];

  useEffect(() => {
    self.current!.style.setProperty("--i", String(i));
  }, [i]);

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
      data-index={index}
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
