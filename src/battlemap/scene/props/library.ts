import { bridge } from "./bridge.js";
import type { PropSpec } from "./spec.js";
import {
  bar,
  barrel,
  candle,
  chair,
  crate,
  hearth,
  rug,
  stool,
  tableLong,
  tableRound,
} from "./tavern.js";

/**
 * Every prop a scene can use, by kind. Each is drawn once here and reused everywhere,
 * so they all share the style. To add one, write its PropSpec and list it here.
 */
export const PROPS: Record<string, PropSpec> = {
  "table-round": tableRound,
  "table-long": tableLong,
  chair,
  stool,
  bar,
  barrel,
  crate,
  hearth,
  rug,
  candle,
  bridge,
};
