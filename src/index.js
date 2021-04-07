const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')
const { cwd } = require('process')

try {
  const githubToken = core.getInput('githubToken')
  console.log(`Github Token: ${githubToken}!`)

  const dir = path.resolve(cwd())
  const cdir = path.resolve(__dirname)

  console.log(github.context, dir, cdir, fs.readdirSync(dir), fs.readdirSync(cdir))
  // const time = new Date().toTimeString()
  // core.setOutput('time', time)
  // const payload = JSON.stringify(github.context.payload, undefined, 2)
  // console.log(`The event payload: ${payload}`)
} catch (error) {
  core.setFailed(error.message)
}
