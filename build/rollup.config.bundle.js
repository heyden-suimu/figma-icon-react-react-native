import babel from "@rollup/plugin-babel";
import path from "path";
import copy from "rollup-plugin-copy";
import pkg from "../package.json";
import fs from "fs";
import { terser } from "rollup-plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";
const image = require("@rollup/plugin-image");
const rollup = require("rollup");
const analyzer = process.env.analyzer;

const resolveFile = function(filePath) {
  return path.join(__dirname, "..", filePath);
};

const cwd = process.cwd();
const pathResolveCwd = (relativePath) => path.resolve(cwd, relativePath);

//获取文件夹下的文件名
const getComponentEntries = (componentDir, options) => {
  const entries = {};
  const componentDirWithCwd = pathResolveCwd(componentDir);
  const componentEntryDirs = fs.readdirSync(componentDirWithCwd);

  for (let i = 0; i < componentEntryDirs.length; i++) {
    if (options?.exclude?.includes(componentEntryDirs[i])) {
      continue;
    }
    entries[componentEntryDirs[i].replace(".js", "")] = path.resolve(
      componentDirWithCwd,
      componentEntryDirs[i]
    );
  }
  return entries;
};

const entryEs = getComponentEntries("./src/icons", { exclude: "react-native" });
const entryEsRn = getComponentEntries("./src/icons/react-native");

const pluginCp = copy({
  targets: [
    { src: resolveFile("src/icons.d.ts"), dest: resolveFile("dist/") },
    {
      src: resolveFile("src/icons.js"),
      dest: resolveFile("dist/"),
      rename: "react-icon.esm.js",
    },
  ],
});

const pluginRnCp = copy({
  targets: [
    { src: resolveFile("src/iconsRn.d.ts"), dest: resolveFile("dist/"), rename:'react-native.d.ts' },
    {
      src: resolveFile("src/iconsRn.js"),
      dest: resolveFile("dist"),
      rename: "react-native.js",
    },
  ],
});

const inputOptions = {
  external: ["react", "prop-types", "react-native-svg"],
  plugins: [
    image(), //该插件不支持limit图片限制
    babel({
      exclude: "node_modules/**",
    }),
    terser(),
    analyzer &&
      visualizer({
        emitFile: true,
        filename: "stats.html",
      }),
  ],
};
const outputOptions = { dir: "dist/icons", format: "es" };

const buildReact = async () => {
  const bundleEs = await rollup.rollup({
    ...inputOptions,
    plugins: [...inputOptions.plugins, pluginCp],
    input: entryEs,
  });
  await bundleEs.write(outputOptions);
  //屏蔽掉单个cjs文件
  // const bundleCjs = await rollup.rollup({
  //   ...inputOptions,
  //   input: resolveFile("/src/icons.js"),
  // });
  // bundleCjs.write({ file: pkg.main, format: "cjs" });
  
  const bundleItemCjs = await rollup.rollup({
    ...inputOptions,
    plugins: [...inputOptions.plugins, pluginCp],
    input: entryEs,
  });
  bundleItemCjs.write({ dir: "dist/icons/cjs", format: "cjs" });

}

const buildReactNative = async () => { 
   const bundleEsRn = await rollup.rollup({
    ...inputOptions,
    plugins: [...inputOptions.plugins, pluginRnCp],
    input: entryEsRn,
  });
  await bundleEsRn.write({ dir: "dist/icons/react-native", format: "es" });
}

const build = async () => {
  buildReact()
  buildReactNative()
};

build();
