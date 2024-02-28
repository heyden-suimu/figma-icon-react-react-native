const Svgo = require('svgo');
const cheerio = require('cheerio')
const icons = require('../src/data.json')

/**
 * Convert string to CamelCase.
 * @param {string} str - A string.
 * @returns {string}
 */
function CamelCase (str) {
  return str.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
}

/**
 * 给每个svg标签的fill和stroke加上style
 * @param {ast} ast 
 */
function addStyleEl (ast, name) {
  if (ast.type === 'root') {
    ast.children[0].attributes.width= '{size}',
    ast.children[0].attributes.height= '{size}',
    ast.children[0].attributes.viewBox= `0 0 ${icons[name]?.width} ${icons[name]?.height}`
  }
  if (ast.attributes?.fill && ast.attributes?.fill !== 'none') {
    ast.attributes.fill = `{fillColor ||${ast.attributes.fill}}`
  }

  if (ast.attributes?.stroke && ast.attributes?.stroke !== 'none') {
    ast.attributes.stroke = `{color ||${ast.attributes.stroke}}`
  }
  //转换style支持react, 且支持1个key的style object, @@ 替换 “
  if(ast.attributes?.style) {
      let style = ast.attributes?.style
      const arr = style.split(':')
      let str = `{@@${arr[0].replace(/([a-z]+)-([a-z]+)/g, (_, a, b) => `${a}${CamelCase(b)}`)}@@:@@${arr[1]}@@}`
      ast.attributes.style = `${str}`
  }

  if (ast.children?.length) {
    ast.children.forEach(addStyleEl)
  }
}

//保持svg里面id的唯一性，重新替换ID
const IdMaps = {}
function changeIds (ast, name, index = 0,  level = 0) {
  if (ast.attributes?.id) {
    const newId = `${name}-${level}-${index}`
    IdMaps[ast.attributes.id] = newId
    ast.attributes.id = newId
    level++
  }
  ast.children?.forEach((item, index) => changeIds(item, name, index, level));
}

/**
 * Optimize SVG with `svgo`.
 * @param {string} svg - An SVG string.
 * @returns {Promise<string>}
 */
function optimize (svg, name) {
  let changeColorPlugingStatus = false
  const plugins = [
    'convertShapeToPath',
    'mergePaths',
    'removeTitle',
  ]
  plugins.push({
    name: 'changeColor',
    type: 'perItem', // full, perItem or perItemReverse
    // params: {color, fillColor}, // some arbitrary data
    fn: function (ast, params, info) {
      // custom plugin code goes here
      if (changeColorPlugingStatus) return
      changeColorPlugingStatus = true
      addStyleEl(ast, name)
      changeIds(ast, name)
    }
  })

  //把defs定义前置
  plugins.push({
    name: 'moveDefs',
    type: 'perItem', // full, perItem or perItemReverse
    fn: function (ast, params, info) { 
      if (ast.type!=="root") return
      const svg = ast.children[0]
      svg?.children?.forEach((v, i) => {
        if (v.name === 'defs') {
          svg.children.splice(i,1)
          svg.children.unshift(v)
        }
      })
    }
  })

  return new Promise(resolve => {
    const res = Svgo.optimize(svg, {
      multipass: true,
      plugins
    })
    resolve(res.data);
  });
}

/**
 * remove SVG element.
 * @param {string} svg - An SVG string.
 * @returns {string}
 */
function removeSVGElement (svg) {
  const $ = cheerio.load(svg);
  return $('body').html();
}

/**
 * Process SVG string.
 * @param {string} svg - An SVG string.
 * @param {Promise<string>}
 */
async function processSvg (svg, name) {
  const optimized = await optimize(svg, name)
    // remove semicolon inserted by prettier
    // because prettier thinks it's formatting JSX not HTML
    // .then(svg => svg.replace(/;/g, ''))
    .then(removeSVGElement)
    .then(svg => svg.replace(/([a-z]+)-([a-z]+)=/g, (_, a, b) => `${a}${CamelCase(b)}=`))
    .then(svg => svg.replace(/(fill|stroke)=\"\{([^\"\']*)\|\|([^\"\']*)\}\"/g, (_, a, b, c) => `${a}={String((${b}!=='none'&&${b}) || "${c}")}`)) //替换fill=color 或者 stroke=color 逻辑
    .then(svg => svg.replace(/style=\"([^\"]+)\"/g, (_,a) => `style={${a}}`).replace(/\@\@/g, '"')) //替换style里的逻辑
    .then(svg => svg.replace(/(\"\{)|(\}\")/g, (_,a, b) => a ? '{' : b ? '}':''))  //替换svg里面属性逻辑
    .then(svg => svg.replace(/\<svg([^\>]*)\>/, (_,a) => `<svg${a}{...otherProps}>`))  //给svg 加入 otherprops
    .then(svg => svg.replace(/url\(#([^\)]*)\)/g, (_,a) => `url(#${IdMaps[a]})`))  //给svg 替换新Id  针对 url(#id)
    .then(svg => svg.replace(/href=\"#([^\"]*)\"/g, (_,a) => `href="#${IdMaps[a]}"`))  //给svg 替换新Id  针对 href="#id"
  return optimized;
}

module.exports = processSvg;
