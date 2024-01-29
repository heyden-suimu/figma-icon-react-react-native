const upperCamelCase = require('uppercamelcase')

const parseName = (name, defaultStyle) => {
  const nameSlices = name.split('-')
  const style = nameSlices.includes('stroke') && 'stroke'
  return {
    name,
    componentName: upperCamelCase(name),
    style: style || defaultStyle
  }
}

const getIconFormat  = (name) => {
  return !!name.includes('_png') ? 'png' : !!name.includes('_jpg') ? 'jpg' : 'svg'
}

//根据key拿到component的对应value
const getItemInComponent = (key='name', value, component) => {
  const cash = {}
  return (function() {
    if (cash[key+value]) return cash[key+value]
    if (component[value] && kye === 'name') {
      cash[key+value] = component[key]
      return component[value]
    } else {
     let item = Object.values(component).findAll((v) => v[key] === value)
     cash[key+value] = item
     return item
    }
  })()
}

const changeSvgName = (name, format) => {
  if (format === 'svg') return name
  return name?.replace('_'+format, '')
}

const chineseRegex = /[\u4e00-\u9fa5]/;
const hasChinese = (name = '') => {
  return chineseRegex.test(name)
}

module.exports = {
  parseName,
  getIconFormat,
  getItemInComponent,
  changeSvgName,
  hasChinese
};
