import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  MouseEvent,
  WheelEvent,
  ReactFragment,
  useState,
  useMemo,
  Component,
  RefObject,
  createRef,
  forwardRef,
} from "react";
import classNames from "classnames";

import { usePath } from "./path";
import { ClusterMeta, ItemMeta } from "./data";

export function Timeline({ clusters }: { clusters: ClusterMeta[] }) {
  const { path, push } = usePath();
  const self = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const { path: pathOld, focused: focusedOld } = usePrevious({ path, focused });

  const reverse = useMemo(() => {
    const result = new Map<string, [number, number]>();
    clusters.forEach((cluster, i) => {
      cluster.items.forEach((item, j) => {
        result.set(item.path, [i, j]);
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
        <ScrollFix
          key={i}
          shouldFix={() => shouldFix(i)}
          render={(target) => (
            <Cluster
              key={i}
              ref={target}
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
          )}
        />
      ))}
    </div>
  );

  // prettier-ignore
  function shouldFix(clusterIndex: number): boolean {
    const isExpanded = clusterIsExpanded(clusterIndex);
    const wasExpanded = clusterWasExpanded(clusterIndex);

    if (isExpanded != wasExpanded) {
      const dueToSelectedChange = clusterIsSelected(clusterIndex) != clusterWasSelected(clusterIndex);
      const dueToFocusedChange = clusterIsFocused(clusterIndex) != clusterWasFocused(clusterIndex);
      const selectedNew = path != null && reverse.has(path) ? reverse.get(path)![0] : null;
      const selectedOld = pathOld != null && reverse.has(pathOld) ? reverse.get(pathOld)![0] : null;
      const clusterNew = dueToSelectedChange ? selectedNew : dueToFocusedChange ? focused : null;
      const clusterOld = dueToSelectedChange ? selectedOld : dueToFocusedChange ? focusedOld : null;
      const potentiallyFixable = clusterNew != null && clusterOld != null;

      if (potentiallyFixable) {
        const clusterNewIsOnLeft = clusterNew! < clusterOld!;
        const clusterNewIsOnRight = clusterNew! > clusterOld!;

        console.log(
          [
            `cluster ${clusterIndex}`,
            isExpanded ? "expanded" : "collapsed",
            `due to ${
              dueToSelectedChange ? "a selected"
              : dueToFocusedChange ? "a focused"
              : "an impossible"
            } change`,
            `and the new expanded cluster is ${
              clusterNewIsOnLeft ? "on the left"
              : clusterNewIsOnRight ? "on the right"
              : "in an impossible direction"
            }`,
          ].join(" "),
        );

        const didExpand = isExpanded, didCollapse = !isExpanded;

        if (didExpand && clusterNewIsOnLeft) {
          // scroll right to compensate, and width delta is positive, so scroll by delta
          return true;
        } else if (didCollapse && clusterNewIsOnRight) {
          // scroll left to compensate, and width delta is negative, so scroll by delta
          return true;
        }
      }
    }

    return false;
  }

  function clusterIsExpanded(clusterIndex: number): boolean {
    return clusterIsSelected(clusterIndex) || clusterIsFocused(clusterIndex);
  }

  function clusterWasExpanded(clusterIndex: number): boolean {
    return clusterWasSelected(clusterIndex) || clusterWasFocused(clusterIndex);
  }

  function clusterIsFocused(clusterIndex: number, which = focused): boolean {
    return clusterIndex == which;
  }

  function clusterWasFocused(clusterIndex: number): boolean {
    return clusterIsFocused(clusterIndex, focusedOld);
  }

  function clusterIsSelected(clusterIndex: number, which = path): boolean {
    if (which == null || !reverse.has(which)) {
      return false;
    }

    return clusterIndex == reverse.get(which)![0];
  }

  function clusterWasSelected(clusterIndex: number): boolean {
    return clusterIsSelected(clusterIndex, pathOld);
  }

  function itemIsSelected(clusterIndex: number, itemIndex: number): boolean {
    if (!clusterIsSelected(clusterIndex)) {
      return false;
    }

    return itemIndex == reverse.get(path!)![1];
  }

  function navigate(delta: number) {
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
    navigate(Math.sign(event.deltaY));
  }
}

// FIXME how do i make this typeck without the HTMLDivElement bound :c
class ScrollFix<T extends HTMLDivElement> extends Component<ScrollFixProps<T>> {
  target: RefObject<T>;

  constructor(props: ScrollFixProps<T>) {
    super(props);
    this.target = createRef();
  }

  getSnapshotBeforeUpdate(): number | null {
    if (this.props.shouldFix()) {
      return this._measure();
    }

    return null;
  }

  componentDidUpdate(
    _props: unknown,
    _state: unknown,
    snapshot: ReturnType<ScrollFix<T>["getSnapshotBeforeUpdate"]>,
  ) {
    if (snapshot == null) {
      return;
    }

    const current = this._measure();
    const delta = current - snapshot;
    console.log(`was ${snapshot} now ${current} delta ${delta}`);
    scrollBy(delta, 0);
  }

  render() {
    return this.props.render(this.target);
  }

  _measure() {
    return this.target.current!.getBoundingClientRect().width;
  }
}

interface ScrollFixProps<T> {
  render: (target: RefObject<T>) => ReactFragment;
  shouldFix: () => boolean;
}

const Cluster = forwardRef<
  HTMLDivElement,
  {
    children: ReactFragment;
    length: number;
    expanded: boolean;
    onFocus: () => void;
  }
>(({ children, length, expanded, onFocus }, ref) => {
  return (
    <div
      ref={ref}
      className={classNames("Cluster", { expanded })}
      style={{ "--length": length }}
      onFocus={onFocus}
    >
      {children}
    </div>
  );
});

function Item({
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
        // self.current!.scrollIntoView({
        //   inline: "center",
        //   block: "center",
        //   behavior: "smooth",
        // });
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
      // self.current!.scrollIntoView({
      //   inline: "nearest",
      //   block: "nearest",
      //   behavior: "smooth",
      // });
    }
  }
}

function usePrevious<T>(value: T) {
  const state = useRef<Partial<T>>({});

  useEffect(() => {
    state.current = value;
  });

  return state.current;
}
