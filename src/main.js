import { IsolateRunner, once } from "./runner.js";

/**
 * @type {{ event: "stdout" | "stderr"; content: string; }[]}
 */
const output = [];

const runner = new IsolateRunner(`
  import { format } from "format";
  stdout("Hello, World!");
`);
runner.on("stdout", (s) => output.push({ event: "stdout", content: s }));
runner.on("stderr", (s) => output.push({ event: "stderr", content: s }));

const [module] = await once(runner, "ready");
await module.evaluate({ timeout: 10000 });

console.log(output);
