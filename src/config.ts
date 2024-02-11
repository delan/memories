export const FILTER = /[.](jpe?g|png|webp|mov|mp4)$/i;
export const VIDEO = /[.](mov|mp4)$/i;
export const BIG = (path: string) =>
  `https://bucket.daz.cat/08a3d825b3ca1e53/${path}`;
export const SMALL = (path: string) =>
  `https://bucket.daz.cat/08a3d825b3ca1e53/${path}.jpg`;
