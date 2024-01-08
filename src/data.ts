export interface ItemMeta {
  index: number;
  birth: number;
  path: string;
  width: number;
  height: number;
  tags: string[];
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
    .map(([birth, path, width, height, ...tags]) => ({
      birth: Number(birth) * 1000,
      path,
      width: Number(width),
      height: Number(height),
      tags,
    }))
    .sort((p, q) => p.birth - q.birth)
    .map(({ ...rest }, index) => ({ index, ...rest }));
}

export function findClusterMetas(
  metas: ItemMeta[],
  requiredTags: Set<string>,
  excludedTags: Set<string>,
): ClusterMeta[] {
  const result = [];
  let cluster;
  let last = -Infinity;

  for (const item of metas) {
    let bad = false;

    for (const tag of requiredTags) {
      if (!item.tags.includes(tag)) {
        bad = true;
        break;
      }
    }
    if (bad) continue;

    for (const tag of excludedTags) {
      if (item.tags.includes(tag)) {
        bad = true;
        break;
      }
    }
    if (bad) continue;

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
