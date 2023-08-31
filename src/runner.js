import fs from "node:fs/promises";
import EventEmitter from "node:events";
import ivm from "isolated-vm";

/**
 * @typedef {import("./events.js").IsolateRunnerEvents} Events
 *
 * @interface IsolateRunner
 * @property {string} code
 * @property {ivm.Isolate} isolate
 * @property {ivm.Context} context
 * @property {ivm.Module} main
 * @property {ivm.Module} format
 */

export class IsolateRunner extends EventEmitter {
  /**
   * @param {string} code
   */
  constructor(code) {
    super();

    this.code = code;
    this.isolate = new ivm.Isolate({ memoryLimit: 128 });

    this.init().catch((e) => this.emit("error", e));
  }

  /**
   * @override
   * @template {keyof Events} K
   * @param {K} event
   * @param {(...args: Events[K]) => void} listener
   */
  on(event, listener) {
    // @ts-expect-error
    return super.on(event, listener);
  }

  /**
   * @override
   * @template {keyof Events} K
   * @param {K} event
   * @param {(...args: Events[K]) => void} listener
   */
  once(event, listener) {
    // @ts-expect-error
    return super.once(event, listener);
  }

  async init() {
    const [context, main, format] = await Promise.all([
      this.createContext(),
      this.createMainModule(),
      this.createFormatModule(),
    ]);
    await Promise.all([
      main.instantiate(context, this.createResolver({ format })),
      format.instantiate(context, this.createResolver({})),
    ]);
    this.emit("ready", main);
  }

  /**
   * @private
   */
  async createContext() {
    this.context = await this.isolate.createContext();
    await Promise.all([
      this.context.global.set("global", this.context.global.derefInto()),
      this.context.global.set("stdout", this.stdout.bind(this)),
      this.context.global.set("stderr", this.stderr.bind(this)),
    ]);
    return this.context;
  }

  /**
   * @private
   */
  async createMainModule() {
    this.module = await this.isolate.compileModule(this.code);
    return this.module;
  }

  /**
   * @private
   */
  async createFormatModule() {
    const url = new URL("./format.js", import.meta.url);
    const code = await fs.readFile(url, "utf-8");
    this.format = await this.isolate.compileModule(code);
    return this.format;
  }

  /**
   * @param {{ [key: string]: ivm.Module }} modules
   * @returns {(specifier: string) => ivm.Module}
   */
  createResolver(modules) {
    return (specifier) => {
      const module = modules[specifier];
      if (module) return module;
      else throw new Error(`Module not found: ${specifier}`);
    };
  }

  /**
   * @private
   * @param {string} s
   */
  stdout(s) {
    /**
     * @event IsolateRunner#stdout
     * @type {string}
     */
    this.emit("stdout", s);
  }

  /**
   * @private
   * @param {string} s
   */
  stderr(s) {
    /**
     * @event IsolateRunner#stderr
     * @type {string}
     */
    this.emit("stderr", s);
  }
}

/**
 * @template {keyof Events} E
 * @param {IsolateRunner} emitter
 * @param {E} event
 * @returns {Promise<Events[E]>}
 */
export function once(emitter, event) {
  return new Promise((resolve, reject) => {
    emitter.once(event, (...args) => resolve(args));
    if (event !== "error") emitter.once("error", reject);
  });
}
