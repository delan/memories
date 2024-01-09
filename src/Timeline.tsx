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
    this._click = this._click.bind(this);

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

    return (
      <div
        ref={this._self}
        onWheel={this._wheel}
        onClick={this._click}
        className="Timeline"
      >
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

  componentDidUpdate({ path: pathOld }: TimelineProps, _: TimelineState) {
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

      scroll(`path=${pathNew}`, item, "center", true);
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

  /**
   * Fallback click handler.
   *
   * When you click on an item in another cluster, the collapsing and expanding of clusters can move
   * the item far enough away that the item no longer counts as clicked. In this case, the click is
   * fired on the containing cluster or Timeline, but the correct item still gets focused, so we can
   * catch that and treat the focused item as clicked.
   */
  _click() {
    const item = document.activeElement;
    console.log("Timeline: _click!", item);
    if (
      item != null &&
      item instanceof HTMLElement &&
      item.dataset.path != null
    )
      this.props.push(item.dataset.path);
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
    {
      indexInCluster,
      selected,
      push,
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
