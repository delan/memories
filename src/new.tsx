import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";
import "./debug";

import React from "react";
import ReactDOM from "react-dom";

import { Memories } from "./Memories";
import { fetchItemMetas, findClusterMetas } from "./data";

async function main() {
  const items = await fetchItemMetas();

  // TODO support videos
  const stills = items.filter(({ path }) => /[.](JPG|PNG)$/.test(path));

  const clusters = findClusterMetas(stills);

  ReactDOM.render(
    <Memories clusters={clusters} />,
    document.querySelector(".Memories"),
  );
}

main();
