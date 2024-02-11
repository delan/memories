import React from "react";
import ReactDOM from "react-dom/client";
import "./main.sass";

import { Memories } from "./Memories.tsx";
import { fetchItemMetas } from "./data";
import { FILTER } from "./config";

async function main() {
  const all = await fetchItemMetas();
  const items = all.filter(({ path }) => FILTER.test(path));

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Memories items={items} />
    </React.StrictMode>,
  );
}

main();
