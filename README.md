# Icon Automation Workflow Using Figma

It's a repository for [Figma Icon Automation Plugin](https://github.com/leadream/figma-icon-automation).

## 使用组件
yarn add @xt/react-icon

import { ICONTest } from '@xt/react-icon'



### fetch SVG file
Run `yarn fetch` to fetch SVG files from Figma file. This will pull your SVGs in `./src/svg/`.

### generate React components for icons
Run `yarn generate` to generate component files from SVG files. This will pull your component files in `./src/icons/`.

### Develop in local
Run `yarn dev` to develop the application in which you can see all icons.

### Develop in local
Run `yarn build` to build Pages.

### 删除/更新老图标流程
直接在src/data.json中删除对应的老icon name即可，就会获取figma上最新的icon
