import React, {
  MouseEvent,
  WheelEvent,
  ReactFragment,
  forwardRef,
  memo,
  FocusEvent,
  useState,
  useRef,
  useEffect,
} from "react";
import classNames from "classnames";

import { usePath } from "./path";
import { ClusterMeta, ItemMeta } from "./data";
import { SMALL, VIDEO } from "./config";

export function Timeline({
  clusters,
  reverse,
  flat,
  setPinchEnabled,
}: {
  clusters: ClusterMeta[];
  reverse: Map<string, [number, number]>;
  flat: ItemMeta[];
  setPinchEnabled: (_: boolean) => void;
}) {
  const { path, pushPath } = usePath();
  const [focused, setFocused] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  void flat; // TODO wheel to step through items?

  useEffect(() => {
    if (path == null) return;
    const indices = reverse.get(path);
    if (indices == null) {
      console.warn(`Timeline: path lookup failed: ${path}`);
      return;
    }
    const [i, j] = indices;
    const item = ref.current!.childNodes[i].childNodes[j];
    if (item != null && item instanceof HTMLElement) {
      setPinchEnabled(false);
      item.focus({
        // this option shouldn’t be load-bearing (just for efficiency)
        preventScroll: true,
      });
      scroll(`path=${path}`, item, "center", true);
    }
  }, [path]);

  return (
    <div ref={ref} onWheel={wheel} onClick={click} className="Timeline">
      {clusters.map((cluster, i) => {
        return (
          <Cluster
            key={i}
            length={cluster.items.length}
            expanded={clusterIsExpanded(i, path, focused)}
          >
            {cluster.items.map((item, j) => (
              <Item
                key={item.path}
                indexInCluster={j}
                selected={itemIsSelected(i, j)}
                pushPath={pushPath}
                onFocus={focus}
                onFocusArg={i}
                {...item}
              />
            ))}
          </Cluster>
        );
      })}
    </div>
  );

  function focus(
    clusterIndex: number,
    path: string,
    event: FocusEvent<HTMLAnchorElement>,
  ) {
    console.log(
      `Timeline: focus: focus on Item path=${path} focused=${focused} clusterIndex=${clusterIndex}`,
    );

    scroll(`path=${path}`, event.target, "nearest", false);
    setFocused(clusterIndex);
  }

  function clusterIsExpanded(
    clusterIndex: number,
    whichPath: string | null,
    whichFocused: number | null,
  ): boolean {
    return (
      clusterIsSelected(clusterIndex, whichPath) ||
      clusterIsFocused(clusterIndex, whichFocused)
    );
  }

  function clusterIsFocused(
    clusterIndex: number,
    whichFocused: number | null,
  ): boolean {
    return clusterIndex == whichFocused;
  }

  function clusterIsSelected(
    clusterIndex: number,
    whichPath: string | null,
  ): boolean {
    if (whichPath == null || !reverse.has(whichPath)) {
      return false;
    }

    return clusterIndex == reverse.get(whichPath)![0];
  }

  function itemIsSelected(clusterIndex: number, itemIndex: number): boolean {
    if (!clusterIsSelected(clusterIndex, path)) {
      return false;
    }

    return itemIndex == reverse.get(path!)![1];
  }

  function wheel(event: WheelEvent<HTMLElement>) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (ref.current != null) {
      scrollBy(event.deltaY, 0);
    }
  }

  /**
   * Fallback click handler.
   *
   * When you click on an item in another cluster, the collapsing and expanding of clusters can move
   * the item far enough away that the item no longer counts as clicked. In this case, the click is
   * fired on the containing cluster or Timeline, but the correct item still gets focused, so we can
   * catch that and treat the focused item as clicked.
   */
  function click() {
    const item = document.activeElement;
    console.log("Timeline: click!", item);
    if (
      item != null &&
      item instanceof HTMLElement &&
      item.dataset.path != null
    ) {
      pushPath(item.dataset.path);
    }
  }
}

const Cluster = forwardRef<
  HTMLDivElement,
  {
    children: ReactFragment;
    length: number;
    expanded: boolean;
  }
>(function Cluster0({ children, length, expanded }, ref) {
  return (
    <div
      ref={ref}
      className={classNames("Cluster", { expanded })}
      style={{ "--length": length }}
    >
      {children}
    </div>
  );
});

const Item = memo(
  forwardRef<
    HTMLAnchorElement,
    {
      indexInCluster: number;
      selected: boolean;
      pushPath: (_: string) => void;
      onFocus: (
        _: number,
        path: string,
        event: FocusEvent<HTMLAnchorElement>,
      ) => void;
      onFocusArg: number;
    } & ItemMeta
  >(function Item0(
    {
      indexInCluster,
      selected,
      pushPath,
      onFocus,
      onFocusArg,
      path,
      width,
      height,
    },
    ref,
  ) {
    const video = VIDEO.test(path);
    return (
      <a
        ref={ref}
        className={classNames("Item", { selected, video })}
        style={{
          "--index": indexInCluster,
          "--width": width,
          "--height": height,
        }}
        href={path}
        data-path={path}
        onClick={click}
        onFocus={(event) => void onFocus(onFocusArg, path, event)}
      >
        <img loading="lazy" src={SMALL(path)} />
      </a>
    );

    function click(event: MouseEvent<HTMLElement>) {
      // Don’t navigate due to clicking on a link.
      event.preventDefault();

      // Don’t run the Timeline’s fallback click handler.
      event.stopPropagation();

      pushPath(path);
    }
  }),
);

function scroll(
  label: string,
  element: HTMLElement,
  where: "center" | "nearest",
  smooth: boolean,
) {
  const behavior = smooth ? "smooth" : "auto";
  console.log(
    `scroll: scrolling to ${label} (${where}, ${
      smooth ? "smooth" : "instant"
    })`,
  );
  element.scrollIntoView({
    inline: where,
    block: where,
    behavior,
  });
}
