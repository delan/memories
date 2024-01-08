import React, {
  MouseEvent,
  WheelEvent,
  ReactFragment,
  Component,
  RefObject,
  forwardRef,
  memo,
  useCallback,
  createRef,
  FocusEvent,
} from "react";
import classNames from "classnames";

import { usePath } from "./path";
import { ClusterMeta, ItemMeta } from "./data";
import { SMALL, VIDEO } from "./config";

export function Timeline({
  clusters,
  setPinchEnabled,
}: {
  clusters: ClusterMeta[];
  setPinchEnabled: (_: boolean) => void;
}) {
  const { path, push } = usePath();
  return (
    <Timeline0
      clusters={clusters}
      setPinchEnabled={setPinchEnabled}
      path={path}
      push={useCallback(push, [])}
    />
  );
}

class Timeline0 extends Component<TimelineProps, TimelineState> {
  _self: RefObject<HTMLDivElement>;
  _clusters: RefObject<HTMLDivElement>[];
  _items: Map<string, RefObject<HTMLAnchorElement>>;

  constructor(props: TimelineProps) {
    super(props);

    this._focus = this._focus.bind(this);
    this._wheel = this._wheel.bind(this);

    const reverse = new Map();
    props.clusters.forEach((cluster, i) => {
      cluster.items.forEach((item, j) => {
        reverse.set(item.path, [i, j]);
      });
    });

    const flat = props.clusters
      .flatMap((cluster) => cluster.items)
      .sort((p, q) => p.index - q.index);

    this.state = {
      reverse,
      flat,
      focused: null,
      pathOld: null,
    };

    this._self = createRef();
    this._clusters = props.clusters.map(() => createRef());
    this._items = new Map(
      [...reverse.keys()].map((path) => [path, createRef()]),
    );
  }

  /**
   * When the user selects a different Item (i.e. when props.path changes), update state.focused at
   * the same time, rather than waiting until after we focus the Item in #componentDidUpdate then
   * scheduling a cascading update (setState) in the focus listener.
   *
   * This is both a performance optimisation and a way to guarantee that the previously-selected
   * Cluster collapses (and hence our scroll compensation happens) before any scrollIntoView calls.
   */
  static getDerivedStateFromProps(
    { path: pathNew, setPinchEnabled }: TimelineProps,
    { pathOld, reverse }: TimelineState,
  ): Partial<TimelineState> {
    const result: Partial<TimelineState> = { pathOld: pathNew };

    if (pathNew != pathOld) {
      result.focused = Timeline0._getSelectedCluster(pathNew, reverse);
      setPinchEnabled(false);
    }

    return result;
  }

  render() {
    const { clusters, path, push } = this.props;
    const { focused } = this.state;

    while (this._clusters.length < clusters.length) {
      this._clusters.push(createRef());
    }

    while (this._clusters.length < clusters.length) {
      this._clusters.push(createRef());
    }

    return (
      <div ref={this._self} onWheel={this._wheel} className="Timeline">
        {clusters.map((cluster, i) => {
          return (
            <Cluster
              key={i}
              ref={this._clusters[i]}
              length={cluster.items.length}
              expanded={this._clusterIsExpanded(i, path, focused)}
            >
              {cluster.items.map((item, j) => (
                <Item
                  key={item.path}
                  ref={this._items.get(item.path)}
                  indexInCluster={j}
                  selected={this._itemIsSelected(i, j)}
                  push={push}
                  onFocus={this._focus}
                  onFocusArg={i}
                  {...item}
                />
              ))}
            </Cluster>
          );
        })}
      </div>
    );
  }

  // prettier-ignore
  getSnapshotBeforeUpdate({ path: pathOld }: TimelineProps, { focused: focusedOld }: TimelineState): TimelineSnapshot | null {
    const { path: pathNew } = this.props;
    const { focused: focusedNew } = this.state;
    console.log(`Timeline: gSBU: focusedNew=${focusedNew} focusedOld=${focusedOld}`);
    const selectedNew = this._getSelectedCluster(pathNew);
    const selectedOld = this._getSelectedCluster(pathOld);
    const selectedChanged = selectedNew != selectedOld;
    const focusedChanged = focusedNew != focusedOld;
    const clusterNew = selectedChanged ? selectedNew : focusedChanged ? focusedNew : null;
    const clusterOld = selectedChanged ? selectedOld : focusedChanged ? focusedOld : null;
    const potentiallyFixable = clusterNew != null && clusterOld != null;

    if (potentiallyFixable) {
      const clusterNewIsOnLeft = clusterNew! < clusterOld!;
      const clusterNewIsOnRight = clusterNew! > clusterOld!;

      const clusterLeft = Math.min(clusterNew!, clusterOld!);
      const clusterLeftIsExpanded = this._clusterIsExpanded(clusterLeft, pathNew, focusedNew);
      const clusterLeftWasExpanded = this._clusterIsExpanded(clusterLeft, pathOld, focusedOld);
      const clusterLeftChanged = clusterLeftIsExpanded != clusterLeftWasExpanded;

      console.log([
        `Timeline: gSBU:`,
        `${selectedChanged ? "selected" : focusedChanged ? "focused" : "unknown"}`,
        `clusterNew=${clusterNew} clusterOld=${clusterOld}`,
        `${clusterNewIsOnLeft ? "left" : clusterNewIsOnRight ? "right" : "unknown"}`,
        `clusterLeft=${clusterLeft} clusterLeftChanged=${clusterLeftChanged}`,
        `(${clusterLeftWasExpanded} to ${clusterLeftIsExpanded})`,
      ].join(" "));

      if (clusterLeftChanged) {
        const oldSize = this._measure(clusterLeft);
        return { clusterLeft, oldSize };
      }
    }

    return null;
  }

  _focus(
    clusterIndex: number,
    path: string,
    event: FocusEvent<HTMLAnchorElement>,
  ) {
    console.log(
      `Timeline: _focus: focus on Item path=${path} focused=${this.state.focused} clusterIndex=${clusterIndex}`,
    );

    scroll(`path=${path}`, event.target, "nearest", false);

    // try to avoid a cascading update (see #getDerivedStateFromProps)
    if (clusterIndex != this.state.focused) {
      this.setState({ focused: clusterIndex });
    }
  }

  _fixScroll({ clusterLeft, oldSize }: Required<TimelineSnapshot>) {
    const newSize = this._measure(clusterLeft);

    if (newSize == null) {
      return;
    }

    const delta = newSize - oldSize;
    console.log(
      `Timeline: cDU: _fixScroll: was ${oldSize} now ${newSize} delta ${delta}`,
    );

    addEventListener(
      "scroll",
      () => void console.log("Timeline: _fixScroll: Window#scroll"),
      { once: true },
    );
    scrollBy(delta, 0);
  }

  componentDidUpdate(
    { path: pathOld }: TimelineProps,
    _: TimelineState,
    snapshot: TimelineSnapshot | null,
  ) {
    const shouldFix = snapshot?.oldSize != null;

    if (shouldFix) {
      this._fixScroll(snapshot as Required<TimelineSnapshot>); // FIXME
    }

    const { path: pathNew } = this.props;

    if (pathNew != null && pathNew != pathOld) {
      const item = this._items.get(pathNew)?.current;

      if (item == null) {
        return;
      }

      item.focus({
        // this option shouldn’t be load-bearing (just for efficiency)
        preventScroll: true,
      });

      const doScroll = () =>
        void scroll(`path=${pathNew}`, item, "center", true);

      if (shouldFix) {
        // Firefox: scrollIntoView in smooth mode misbehaves if called too soon after scrollBy
        // requestAnimationFrame(doScroll);                         // always too early
        // setTimeout(doScroll, 0);                                 // sometimes too early
        // addEventListener("scroll", doScroll, { once: true });    // sometimes too early
        // “i hate this” — aria
        addEventListener("scroll", () => void setTimeout(doScroll, 0), {
          once: true,
        });
      } else {
        doScroll();
      }
    }
  }

  componentDidMount() {
    const { path } = this.props;

    if (path != null) {
      const item = this._items.get(path)?.current;

      if (item != null) {
        item.focus({
          // this option shouldn’t be load-bearing (just for efficiency)
          preventScroll: true,
        });

        scroll(`path=${path}`, item, "center", false);
      }
    }
  }

  _measure(clusterIndex: number): number | undefined {
    return this._clusters[clusterIndex].current?.getBoundingClientRect().width;
  }

  _getSelectedCluster(path: string | null): number | null {
    return Timeline0._getSelectedCluster(path, this.state.reverse);
  }

  static _getSelectedCluster(
    path: string | null,
    reverse: TimelineState["reverse"],
  ): number | null {
    if (path == null || !reverse.has(path)) {
      return null;
    }

    return reverse.get(path)![0];
  }

  _clusterIsExpanded(
    clusterIndex: number,
    whichPath: TimelineProps["path"],
    whichFocused: TimelineState["focused"],
  ): boolean {
    return (
      this._clusterIsSelected(clusterIndex, whichPath) ||
      this._clusterIsFocused(clusterIndex, whichFocused)
    );
  }

  _clusterIsFocused(
    clusterIndex: number,
    whichFocused: TimelineState["focused"],
  ): boolean {
    return clusterIndex == whichFocused;
  }

  _clusterIsSelected(
    clusterIndex: number,
    whichPath: TimelineProps["path"],
  ): boolean {
    if (whichPath == null || !this.state.reverse.has(whichPath)) {
      return false;
    }

    return clusterIndex == this.state.reverse.get(whichPath)![0];
  }

  _itemIsSelected(clusterIndex: number, itemIndex: number): boolean {
    if (!this._clusterIsSelected(clusterIndex, this.props.path)) {
      return false;
    }

    return itemIndex == this.state.reverse.get(this.props.path!)![1];
  }

  _navigate(delta: number) {
    const { clusters, path, push } = this.props;

    if (path == null || !this.state.reverse.has(path)) {
      return;
    }

    const [i, j] = this.state.reverse.get(path)!;
    const index = clusters[i].items[j].index + delta;

    if (index in this.state.flat) {
      push(this.state.flat[index].path);
    }
  }

  _wheel(event: WheelEvent<HTMLElement>) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (this._self.current) {
      scrollBy(event.deltaY, 0);
    }

    // FIXME this is very broken, often jumping forward or refusing to navigate
    // to items to the left of the current one
    // this._navigate(Math.sign(event.deltaY));
  }
}

interface TimelineProps {
  clusters: ClusterMeta[];
  setPinchEnabled: (_: boolean) => void;
  path: string | null;
  push: (_: string) => void;
}

interface TimelineState {
  reverse: Map<string, [number, number]>;
  flat: ItemMeta[];
  focused: number | null;
  pathOld: string | null;
}

interface TimelineSnapshot {
  clusterLeft: number;
  oldSize?: number;
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
      push: (_: string) => void;
      onFocus: (
        _: number,
        path: string,
        event: FocusEvent<HTMLAnchorElement>,
      ) => void;
      onFocusArg: number;
    } & ItemMeta
  >(function Item0(
    { indexInCluster, selected, push, onFocus, onFocusArg, path, width, height },
    ref,
  ) {
    const video = VIDEO.test(path);
    return (
      <a
        ref={ref}
        className={classNames("Item", { selected, video })}
        style={{ "--index": indexInCluster, "--width": width, "--height": height }}
        href={path}
        onClick={click}
        onFocus={(event) => void onFocus(onFocusArg, path, event)}
      >
        <img loading="lazy" src={SMALL(path)} />
      </a>
    );

    function click(event: MouseEvent<HTMLElement>) {
      event.preventDefault();
      push(path);
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
