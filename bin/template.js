const { getIconFormat } = require("./utils")

const getAttrs = ({ width, height}) => {

  const baseAttrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 'size',
    height: 'size',
    viewBox: `0 0 ${width} ${height}`,
    fill: 'fillColor',
    stroke: 'color',
    otherProps: '...otherProps'
  }

  return Object.assign({}, baseAttrs)
}

//移除 attrs
const getElementCodeSvgReact = (ComponentName, attrs, svgCode) => `
  import React from 'react';
  import PropTypes from 'prop-types';

  const ${ComponentName} = (props) => {
    let { color, size, fillColor, ...otherProps } = props;
    
    return (
      ${svgCode}
    )
  };

  ${ComponentName}.propTypes = {
    color: PropTypes.string,
    size: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    fillColor: PropTypes.string,
  }

  ${ComponentName}.defaultProps = {
    color: 'none',
    fillColor: 'none',
    size: '24',
  }

  export default ${ComponentName}
`
const getElementCodeSvgReactNative = (ComponentName,attrs, svgCode) => {
  const tagArrSet = new Set()
  const tagArrUp = []
  svgCode = svgCode.replace(/<filter\b[^>]*>.*?<\/filter>/g, '')
  let svgCodeRn = svgCode.replace(/\<([a-zA-Z]*)([\s\>])/g, (_, a, b) => {
    tagArrSet.add(a)
    return `<${a.charAt(0).toUpperCase() + a.slice(1)}${b}`
  })

  const tarArr =[...tagArrSet]
  tarArr.forEach(v => {
    const r =  v.charAt(0).toUpperCase() + v.slice(1);
    tagArrUp.push(r)
    const regex = new RegExp(`</${v}`, "g")
    svgCodeRn = svgCodeRn.replace(regex, `</${r}`)
  })

  return `
  import React from 'react';
  import { ${tagArrUp.join(', ')} } from 'react-native-svg';

  
  const ${ComponentName} = (props) => {
    let { color='none', size='24', fillColor='none', ...otherProps } = props;

    return (
      ${svgCodeRn}
    );
  };
  
  export default ${ComponentName};
  `
}
const getElementCodeSvg =  (ComponentName,attrs, svgCode) =>({
  react: getElementCodeSvgReact(ComponentName,attrs, svgCode),
  reactNative: getElementCodeSvgReactNative(ComponentName,attrs, svgCode),
})

const getElementCodePng = (ComponentName, name) => {
  const fomart = getIconFormat(name)
  return `
  import source from '../png/${name}.${fomart}'
  export default source
  `
}

module.exports = { getAttrs, getElementCodeSvg, getElementCodePng }
