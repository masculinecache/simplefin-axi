import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin.ts"],
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
});
