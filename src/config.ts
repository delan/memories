export const FILTER = /[.](JPG|PNG)$/; // TODO support videos
export const BIG = (path: string) => `https://bucket.daz.cat/08a3d825b3ca1e53/${path}`;
export const SMALL = (path: string) => `https://bucket.daz.cat/08a3d825b3ca1e53/${path}.jpg`;
