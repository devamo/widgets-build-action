const path = require('path')
const core = require('@actions/core')
// const github = require('@actions/github')
const { cwd } = require('process')
const generate = require('./generate')
const { default: axios } = require('axios')
const { existsSync, createReadStream } = require('fs')
const FormData = require('form-data')

async function run() {
  try {
    const builderFolder = path.resolve(__dirname, '..')
    const repoFolder = path.resolve(cwd())

    let env = {}
    if (existsSync(path.resolve(__dirname, '../defaults.js'))) {
      env = require(path.resolve(__dirname, '../defaults.js'))
    }

    const productToken = env.productToken || core.getInput('productToken') || ''
    const productVersion = env.productVersion || core.getInput('productVersion') || ''

    const sourcesFolder = env.sourcesFolder || path.resolve(repoFolder, core.getInput('sourcesFolder') || '') || ''
    const bundleFolder = env.bundleFolder || path.resolve(repoFolder, core.getInput('bundleFolder') || 'build') || ''

    if (!productToken || !productVersion) {
      throw new Error('Product token and product version are required')
    }

    core.info(`product token: ${productToken}`)
    core.info(`product version: ${productVersion}`)
    core.info(`builder folder: ${builderFolder}`)
    core.info(`repo folder: ${repoFolder}`)
    core.info(`sources folder: ${sourcesFolder}`)
    core.info(`bundle folder: ${bundleFolder}`)

    // request data from amodev
    const { data } = await axios.request({
      url: 'https://api.amodev.ru/products/github-push',
      method: 'POST',
      headers: {
        product: productToken
      },
      data: {
        version: productVersion
      }
    })

    const opts = {
      team: data.team,
      product: data.product,
      productVersion: data.productVersion
    }

    let amoWidgetOpts = {}
    if (productVersion.amoWidget) {
      try {
        amoWidgetOpts = productVersion.amoWidget
      } catch (e) {}
    }

    const { widget, sources, bundle } = await generate(builderFolder, sourcesFolder, bundleFolder, `${sourcesFolder}/artifacts`, {
      ...opts,
      ...amoWidgetOpts
    })

    // todo: send bundle, sources and widget to amodev and create github release
    core.setOutput('sources', sources)
    core.setOutput('widget', widget)
    core.setOutput('bundle', bundle)

    // create release & upload archives
    const form = new FormData()
    form.append('version', productVersion)
    form.append('sources', createReadStream(sources), { filename: 'sources.zip' })
    form.append('widget', createReadStream(widget), { filename: 'widget.zip' })
    form.append('bundle', createReadStream(bundle), { filename: 'bundle.zip' })

    await axios.request({
      url: 'https://api.amodev.ru/products/github-release',
      method: 'POST',
      headers: {
        product: productToken,
        ...form.getHeaders()
      },
      data: form
    })
  } catch (error) {
    console.log(error)
    core.setFailed(error.message)
  }
}

run()
