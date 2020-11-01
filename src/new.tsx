import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";
import "./debug";

import React from "react";
import ReactDOM from "react-dom";

import { Memories } from "./Memories";
import { fetchItemMetas, findClusterMetas } from "./data";
import { FILTER } from "./config";

async function main() {
  const all = await fetchItemMetas();
  const items = all.filter(({ path }) => FILTER.test(path));
  const clusters = findClusterMetas(items);

  ReactDOM.render(
    <Memories clusters={clusters} />,
    document.querySelector(".Memories"),
  );
}

main();
