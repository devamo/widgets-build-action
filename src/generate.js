const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const rimraf = require('rimraf')
// const sharp = require('sharp')
const zipDir = require('zip-dir')
const dotize = require('./dotize.js')
const { default: axios } = require('axios')

const { resolve: pathResolve } = path
const { copyFileSync, existsSync, readFileSync, writeFileSync } = fs
const { ensureDirSync, copySync } = fse

const generateWidget = async (builderFolder, sourcesFolder, distFolder, outputFolder, opts = {}, removeTmpFolders = true) => {
  const dotizedOpts = dotize.convert(opts)

  // папка с виджетом в билдере
  const builderWidgetFolder = pathResolve(builderFolder, 'widget')

  // папка с виджетом в исходниках
  const sourcesWidgetFolder = pathResolve(sourcesFolder, 'widget')

  // архив бандла
  const distBundleFile = pathResolve(`${outputFolder}/bundle.zip`)

  // папка + архив исходников
  const distSourcesFolder = pathResolve(`${outputFolder}/sources`)
  const distSourcesFile = pathResolve(`${outputFolder}/sources.zip`)

  // папка + архив виджета
  const distWidgetFolder = pathResolve(`${outputFolder}/widget`)
  const distWidgetFile = pathResolve(`${outputFolder}/widget.zip`)

  if (!existsSync(sourcesFolder)) throw new Error('Папка с исходниками не найдена', sourcesFolder)
  if (!existsSync(distFolder)) throw new Error('Папка со сборкой не найдена', sourcesFolder)

  // удаляем зипы и фолдеры если они есть
  if (existsSync(distBundleFile)) rimraf.sync(distBundleFile)
  if (existsSync(distSourcesFolder)) rimraf.sync(distSourcesFolder)
  if (existsSync(distSourcesFile)) rimraf.sync(distSourcesFile)
  if (existsSync(distWidgetFolder)) rimraf.sync(distWidgetFolder)
  if (existsSync(distWidgetFile)) rimraf.sync(distWidgetFile)

  // создаем новыем tmp-фолдеры
  ensureDirSync(outputFolder, parseInt('0777', 8))
  ensureDirSync(distSourcesFolder, parseInt('0777', 8))
  ensureDirSync(distWidgetFolder, parseInt('0777', 8))

  // копируем файлы виджета из архива по-умолчанию (из билдера)
  copySync(builderWidgetFolder, distWidgetFolder, { filter: src => !/DS_Store/.test(src) })

  // копируем файлы бандла
  copySync(distFolder, `${distWidgetFolder}/build`, {
    filter: src => !/DS_Store/.test(src)
  })

  // есть ли логотип в исходниках
  const srcLogotypeExists = opts.logotype && existsSync(`${sourcesWidgetFolder}/${opts.logotype}`)

  // берем логотип
  let logotypeContent = ''
  if (srcLogotypeExists) {
    logotypeContent = readFileSync(`${sourcesWidgetFolder}/${opts.logotype}`)
  } else if (opts.team.logotype) {
    try {
      const { data: logotypeData } = await axios.get(opts.team.logotype, {
        responseType: 'arraybuffer'
      })
      logotypeContent = logotypeData
    } catch (e) {}
  }

  // папки с изображениями (в билдере и исходниках виджета)
  const distWidgetImagesFolder = `${distWidgetFolder}/images`
  const srcWidgetImagesFolder = `${sourcesWidgetFolder}/images`

  const imageFiles = [
    ['logo_dp.png', 174, 109],
    ['logo_main.png', 400, 272],
    ['logo_medium.png', 240, 84],
    ['logo_min.png', 84, 84],
    ['logo_small.png', 108, 108],
    ['logo.png', 130, 100]
  ]

  for (const imageFile of imageFiles) {
    const sourceFile = `${srcWidgetImagesFolder}/${imageFile[0]}`

    // либо берем из сурсов
    if (existsSync(sourceFile)) {
      copySync(sourceFile, `${distWidgetImagesFolder}/${imageFile[0]}`)
    }
    // либо генерим (если указан логотип-исходник)
    // else if (logotypeContent) {
    //   await createLogo(logotypeContent, `${distWidgetImagesFolder}/${imageFile[0]}`, imageFile[1], imageFile[2])
    // }
  }

  // создаем манифест из оптсов
  writeFileSync(`${distWidgetFolder}/manifest.json`, JSON.stringify(opts.manifest || {}, null, 2))

  // создаем локали из оптсов
  if (Object.keys(opts.locales || {}).length) {
    ensureDirSync(`${distWidgetFolder}/i18n`, parseInt('0777', 8))

    for (const locale in opts.locales) {
      writeFileSync(`${distWidgetFolder}/i18n/${locale}.json`, JSON.stringify(opts.locales[locale], null, 2))
    }
  }

  // заменяем переменные в script.js
  const widgetScriptJSExists = existsSync(`${sourcesWidgetFolder}/script.js`)
  let scriptJS = readFileSync(widgetScriptJSExists ? `${sourcesWidgetFolder}/script.js` : `${distWidgetFolder}/script.js`, 'utf8')
  for (const key in dotizedOpts) {
    scriptJS = scriptJS.replace(new RegExp(`{{${key}}}`, 'gim'), dotizedOpts[key])
  }
  writeFileSync(`${distWidgetFolder}/script.js`, scriptJS)
  // end script.js

  // копируем исходники
  copySync(`${sourcesFolder}/src`, `${distSourcesFolder}/src`, {
    filter: src => !/DS_Store/.test(src)
  })

  // копируем из корневой папки исходников файлы (эмуляция сборки, когда-то проверять то начнут)
  const sourcesExtFiles = ['package.json', 'shims.d.ts', 'tsconfig.json', 'vue.config.js']
  for (const sourcesExtFile of sourcesExtFiles) {
    if (existsSync(`${sourcesFolder}/${sourcesExtFile}`)) {
      copyFileSync(`${sourcesFolder}/${sourcesExtFile}`, `${distSourcesFolder}/${sourcesExtFile}`)
    }
  }

  // пакуем бандл
  await new Promise((resolve, reject) => {
    zipDir(`${distFolder}`, { saveTo: distBundleFile }, error => {
      if (error) reject(error)
      else resolve(true)
    })
  })
  // end bundle

  // пакуем сурсы
  await new Promise((resolve, reject) => {
    zipDir(`${distSourcesFolder}`, { saveTo: distSourcesFile }, error => {
      if (error) reject(error)
      else resolve(true)
    })
  })
  // end sources

  // пакуем виджет
  await new Promise((resolve, reject) => {
    zipDir(`${distWidgetFolder}`, { saveTo: distWidgetFile }, error => {
      if (error) reject(error)
      else resolve(true)
    })
  })
  // end archive

  // remove folders
  if (removeTmpFolders) {
    rimraf.sync(distWidgetFolder)
    rimraf.sync(distSourcesFolder)
  }

  return {
    sources: distSourcesFile,
    widget: distWidgetFile,
    bundle: distBundleFile
  }
}

// const createLogo = async (logo, target, width, height, background = `#000000`) => {
//   const maxLogoWidth = 0.8
//   const maxLogoHeight = 0.8

//   const logoFile = sharp(logo)
//   const logoMeta = await logoFile.metadata()

//   logoFile.resize({
//     width: Math.round(Math.min(logoMeta.width, width * maxLogoWidth)),
//     height: Math.round(Math.min(logoMeta.height, height * maxLogoHeight)),
//     fit: sharp.fit.inside,
//     withoutEnlargement: true
//   })

//   const img = sharp({
//     create: {
//       width,
//       height,
//       channels: 4,
//       background
//     }
//   }).png()

//   img.composite([
//     {
//       input: await logoFile.toBuffer(),
//       gravity: 'centre',
//       tile: false
//     }
//   ])

//   await img.toFile(target)

//   return true
// }

module.exports = generateWidget
