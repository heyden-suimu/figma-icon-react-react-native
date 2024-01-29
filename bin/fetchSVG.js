const got = require("got");
const { ensureDir, writeFile } = require("fs-extra");
const { join, resolve } = require("path");
const Figma = require("figma-js");
const PQueue = require("p-queue");
const icons = require("../src/data.json");
const { getIconFormat, changeSvgName, hasChinese } = require("./utils");
require("dotenv").config();
const upperCamelCase = require("uppercamelcase");

//需要figma的链接，和token
const {FIGMA_TOKEN, FIGMA_FILE_URL} = process.env
let options = {
  format: 'svg',
  outputDir: './src/',
  scale: '1'
}

// for (const arg of process.argv.slice(2)) {
//   const [param, value] = arg.split('=')
//   if (options[param]) {
//     options[param] = value
//   }
// }

if (!FIGMA_TOKEN) {
  throw Error("Cannot find FIGMA_TOKEN in process!");
}

const getIconFile = (component, contentTypes, format) =>
  got.get(component.image, {
    headers: {
      "Content-Type": contentTypes[format],
    },
    encoding: format === "svg" ? "utf8" : "binary",
  });

const client = Figma.Client({
  personalAccessToken: FIGMA_TOKEN,
});

const writerDataJson = (components) => {
  let { _idsFormatMap, ...componentsData } = components;
  let { _idsFormatMapAdd: _idsFormatMapOld, ...componentsDataOld } = icons;
  const _idsFormatMapAdd = {};
  // getItemInComponent
  Object.keys(_idsFormatMap || {})?.forEach((key) => {
    _idsFormatMapAdd[key] = _idsFormatMap[key].names?.map(
      (v) => "Icon" + upperCamelCase(v)
    );
  });
  return ensureDir(join(options.outputDir))
    .then(() =>
      writeFile(
        resolve(options.outputDir, "data.json"),
        JSON.stringify(
          Object.assign(componentsDataOld || {}, componentsData, {
            _idsFormatMapAdd,
          })
        ),
        "utf8"
      )
    )
    .then(() => componentsData);
}

// Fail if there's no figma file key
let fileId = null;
if (!fileId) {
  try {
    fileId = FIGMA_FILE_URL.match(/file\/([a-z0-9]+)\//i)[1];
  } catch (e) {
    throw Error("Cannot find FIGMA_FILE_URL key in process!");
  }
}

client
  .file(fileId)

  .then(({ data }) => {
    // console.log('Processing response', data)
    const components = {};

    function check(c) {
      const name = c?.name?.replace(/\//g, "-");

      if (c.type === "COMPONENT" && !hasChinese(name) && !icons[name]) {
        const { id } = c;
        const { description = "", key } = data.components[c.id];
        const { width, height } = c.absoluteBoundingBox;

        let obj = {
          name,
          id,
          key,
          file: fileId,
          description,
          width,
          height,
        };
        components[name] = obj;
        const format = getIconFormat(name);
        if (format !== "svg") {
          components[changeSvgName(name, format)] = {
            ...obj,
            name: changeSvgName(name, format),
          };
        }
      } else if (c.children) {
        // eslint-disable-next-line github/array-foreach
        c.children.forEach(check);
      }
    }

    data.document.children.forEach(check);
    if (Object.values(components).length === 0) {
      throw Error("Figma: No components found!");
    }
    console.log(
      `${Object.values(components).length} components found in the figma file`
    );
    return components;
  })
  .then((components) => {
    console.log("Getting export urls");
    const idNameMAp = {};
    const idsFormatMap = {};
    Object.values(components).forEach((c) => {
      const format = getIconFormat(c.name);
      idNameMAp[c.id] = [...(idNameMAp[c.id] || []), c.name];

      if (idsFormatMap[format]) {
        idsFormatMap[format].ids = [c.id, ...idsFormatMap[format].ids];
        idsFormatMap[format].names = [c.name, ...idsFormatMap[format].names];
      } else {
        idsFormatMap[format] = {
          ids: [c.id],
          names: [c.name],
        };
      }
    });

    const imagePromises = Object.keys(idsFormatMap).map((key) => {
      return client.fileImages(fileId, {
        ids: idsFormatMap[key].ids,
        format: key,
      });
    });

    return Promise.all(imagePromises).then((data) => {
      const images = data.reduce(
        (p, n) => ({ ...p.data?.images, ...n.data?.images }),
        { data: { images: [] } }
      );
      for (const id of Object.keys(images)) {
        idNameMAp[id].forEach((v) => (components[v].image = images[id]));
      }
      components._idsFormatMap = idsFormatMap;
      return components;
    });
  })
  .then(async (components) => {
    let { _idsFormatMap, ...componentsData } = components;
    const contentTypes = {
      svg: "image/svg+xml",
      png: "image/png",
      jpg: "image/jpeg",
    };
    const queue = new PQueue(Object.assign({ concurrency: 3 }));
    await queueTasks(
      Object.values(componentsData).map((component) => () => {
        const format = getIconFormat(component.name);
        return getIconFile(component, contentTypes, format).then((response) => {
          const contentLength = response.headers["content-length"];
          const fileSizeInBytes = parseInt(contentLength, 10);
          const fileSizeInKB = parseInt(fileSizeInBytes / 1024);
          if (fileSizeInKB > 24) {
            throw new Error(`icon ${component.name} 大于24kb, （建议10kb以内, 必须24kb内）, 请在线压缩svg或者上传cdn给开发使用`)
          }
          
          return ensureDir(join(options.outputDir, format)).then(() => {
            if (format !== "svg") {
              writeFile(
                join(options.outputDir, format, `${component.name}.${format}`),
                response.body,
                "binary"
              );
            }
            writeFile(
              join(
                options.outputDir,
                options.format,
                `${changeSvgName(component.name, format)}.${options.format}`
              ),
              response.body,
              "utf8"
            );
          });
        });
      }), queue
    );
    components = {_idsFormatMap, ...componentsData}
    writerDataJson(components)
    return components;
  })
  .then((components) => {
    let { _idsFormatMap, ...componentsData } = components;
    let { _idsFormatMapAdd: _idsFormatMapOld, ...componentsDataOld } = icons;
    const _idsFormatMapAdd = {};
    // getItemInComponent
    Object.keys(_idsFormatMap || {})?.forEach((key) => {
      _idsFormatMapAdd[key] = _idsFormatMap[key].names?.map(
        (v) => "Icon" + upperCamelCase(v)
      );
    });
    return ensureDir(join(options.outputDir))
      .then(() =>
        writeFile(
          resolve(options.outputDir, "data.json"),
          JSON.stringify(
            Object.assign(componentsDataOld || {}, componentsData, {
              _idsFormatMapAdd,
            })
          ),
          "utf8"
        )
      )
      .then(() => componentsData);
  })
  .catch((error) => {
    throw Error(`Error fetching components from Figma: ${error}`);
  });

function queueTasks(tasks, queue) {
  for (const task of tasks) {
    queue.add(task);
  }
  queue.start();
  return queue.onIdle();
}
