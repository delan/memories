import { Properties } from "csstype";

declare module "csstype" {
  interface Properties {
    "--length"?: number;
    "--index"?: number;
  }
}
