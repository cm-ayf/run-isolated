import EventEmitter from "node:events";
import type { Module, Transferable } from "isolated-vm";

export interface IsolateRunnerEvents {
  ready: [module: Module];
  stdout: [data: string];
  stderr: [data: string];
  error: [error: unknown];
  exit: [result: Transferable];
}
