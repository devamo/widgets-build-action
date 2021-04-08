const path = require('path')
const core = require('@actions/core')
// const github = require('@actions/github')
const { cwd } = require('process')
const generate = require('./generate')
const { default: axios } = require('axios')

async function run() {
  try {
    const builderFolder = path.resolve(__dirname)
    const repoFolder = path.resolve(cwd())

    const productToken = core ? core.getInput('productToken') : ''
    const productVersion = core ? core.getInput('productVersion') : ''

    const sourcesFolder = path.resolve(repoFolder, core ? core.getInput('sourcesFolder') : '')
    const bundleFolder = path.resolve(repoFolder, core ? core.getInput('bundleFolder') : '/build')

    if (!productToken || !productVersion) {
      throw new Error('Product token and product version are required')
    }

    core.info(`product token: ${productToken}`)
    core.info(`product version: ${productVersion}`)
    core.info(`builder folder: ${builderFolder}`)
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

    const { widget, sources } = await generate(builderFolder, sourcesFolder, bundleFolder, `${sourcesFolder}/artifacts`, {
      ...opts,
      ...amoWidgetOpts
    })

    // todo: send bundle, sources and widget to amodev and create github release

    core.setOutput('sources', sources)
    core.setOutput('widget', widget)
  } catch (error) {
    console.log(error)
    core.setFailed(error.message)
  }
}

run()
