/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-template */
const path = require('path')
const fs = require('fs')
const format = require('prettier-eslint')
const processSvg = require('./processSvg')
const { parseName, getIconFormat, changeSvgName } = require('./utils')
const defaultStyle = process.env.npm_package_config_style || 'stroke'
const { getAttrs, getElementCodeSvg, getElementCodePng } = require('./template')
const icons = require('../src/data.json')

const rootDir = path.join(__dirname, '..')

// where icons code in
const srcDir = path.join(rootDir, 'src')
const iconsDir = path.join(rootDir, 'src/icons')
const iconsDirReactNatvie = path.join(rootDir, 'src/icons/react-native')

const formatComp = (component) => {
  return format({
    text: component,
    eslintConfig: {
      extends: 'airbnb',
    },
    prettierOptions: {
      bracketSpacing: true,
      singleQuote: true,
      parser: 'flow',
    },
  });
}

// generate icons.js and icons.d.ts file
const generateIconsIndex = () => {
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir)
    fs.mkdirSync(iconsDir)
  }
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir)
  }
  if (!fs.existsSync(iconsDirReactNatvie)) {
    fs.mkdirSync(iconsDirReactNatvie)
  }

  const initialTypeDefinitions = `/// <reference types="react" />
  import { ComponentType, SVGAttributes } from 'react';

  interface Props extends SVGAttributes<SVGElement> {
    color?: string;
    size?: string | number;
    fillColor?: string;
  }

  type Icon = ComponentType<Props>;
  `;

  fs.writeFileSync(path.join(rootDir, 'src', 'icons.js'), '', 'utf-8');
  fs.writeFileSync(path.join(rootDir, 'src', 'iconsRn.js'), '', 'utf-8');
  fs.writeFileSync(
    path.join(rootDir, 'src', 'icons.d.ts'),
    initialTypeDefinitions,
    'utf-8',
  );
  fs.writeFileSync(
    path.join(rootDir, 'src', 'iconsRn.d.ts'),
    initialTypeDefinitions,
    'utf-8',
  );
}

// generate attributes code
const attrKeys = ['width', 'height', 'fill', 'stroke']
const attrsToString = (attrs) => {
  return Object.keys(attrs).map((key) => {
    // should distinguish fill or stroke
    if (attrKeys.includes(key)) {
      return key + '={' + attrs[key] + '}';
    }
    if (key === 'otherProps') {
      return '{...otherProps}';
    }
    return key + '="' + attrs[key] + '"';
  }).join(' ');
};

// generate icon code separately
const generateIconCode = async ({name}) => {
  const names = parseName(name, defaultStyle)
  const format = getIconFormat(name)
  const svgName = changeSvgName(name, format)
  const location = path.join(rootDir, `src/${format}`, `${svgName}.${format}`)
  const destinationSvg = path.join(iconsDir, `${name}.js`)
  const destinationSvgReactNa =path.join(iconsDirReactNatvie, `${name}.js`)
  let code = '' 
  let svgCode= ''
  const ComponentName = names.componentName
  if (format === 'svg') {
    code = fs.readFileSync(location)
    svgCode = await processSvg(code, name)
  }

  let result =  []
  const attarParams = {
    width: icons[name].width,
    height: icons[name].height,
  }


  //判断是否svg的code，还是png的base64
  const element = format === 'svg' ? getElementCodeSvg(ComponentName, attrsToString(getAttrs(attarParams)), svgCode) : getElementCodePng(ComponentName, names.name)

  // svgcode 逻辑
  if (element instanceof Object) {
    reactComponent = formatComp(element.react)
    reactNativeComponent = formatComp(element.reactNative)

    fs.writeFileSync(destinationSvg, reactComponent, 'utf-8');
    fs.writeFileSync(destinationSvgReactNa, reactNativeComponent, 'utf-8');
  } else {
    const component = formatComp(element)
    fs.writeFileSync(destinationSvg, component, 'utf-8');
  }

  result.push({ComponentName, name: names.name})
  console.log('Successfully built', ComponentName);

  return result
}

// append export code to icons.js
const appendToIconsIndex = ({ComponentName, name}) => {
  
  const _exportString = (name) => `export { default as Icon${ComponentName} } from './icons/${name}';\r\n`;
  const exportString = _exportString(name)
  const exportStringRn = _exportString(`react-native/${name}`)
  const exportTypeString = `export const Icon${ComponentName}: Icon;\n`;

  fs.appendFileSync(
    path.join(rootDir, 'src', 'icons.js'),
    exportString,
    'utf-8',
  );

  fs.appendFileSync(
    path.join(rootDir, 'src', 'iconsRn.js'),
    exportStringRn,
    'utf-8',
  );

  fs.appendFileSync(
    path.join(rootDir, 'src', 'icons.d.ts'),
    exportTypeString,
    'utf-8',
  );

  fs.appendFileSync(
    path.join(rootDir, 'src', 'iconsRn.d.ts'),
    exportTypeString,
    'utf-8',
  );
}

generateIconsIndex()

const {_idsFormatMapAdd, ...iconList} = icons
Object
  .keys(iconList)
  .map(key => icons[key])
  .forEach(({name}) => {
    generateIconCode({name})
      .then((arr) => {
        arr.forEach(v => appendToIconsIndex({ComponentName: v.ComponentName, name: v.name}))
      })
  })