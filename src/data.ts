export interface ItemMeta {
  index: number;
  birth: number;
  path: string;
  width: number;
  height: number;
}

export interface ClusterMeta {
  birth: number;
  items: ItemMeta[];
}

export async function fetchItemMetas(): Promise<ItemMeta[]> {
  const response = await fetch("meta.txt");
  const text = await response.text();
  const records = text
    .trim()
    .split("\n")
    .map((x) => x.split(" "));
  return records
    .map(([birth, path, width, height]) => ({
      birth: Number(birth) * 1000,
      path,
      width: Number(width),
      height: Number(height),
    }))
    .sort((p, q) => p.birth - q.birth)
    .map(({ ...rest }, index) => ({ index, ...rest }));
}

export function findClusterMetas(metas: ItemMeta[]): ClusterMeta[] {
  const result = [];
  let cluster;
  let last = -Infinity;

  for (const item of metas) {
    if (!cluster || item.birth - last > 3_600_000) {
      if (cluster) {
        result.push(cluster);
      }
      cluster = { birth: item.birth, items: [item] };
    } else {
      cluster.items.push(item);
    }
    last = item.birth;
  }

  if (cluster) {
    result.push(cluster);
  }

  return result;
}
