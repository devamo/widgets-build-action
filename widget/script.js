window['{{product.alias}}-version'] = localStorage['{{product.alias}}-version'] || '{{productVersion.version}}' || '1.0'

window['{{product.alias}}-bundle'] = localStorage['{{product.alias}}-bundle']
  ? localStorage['{{product.alias}}-bundle']
  : '{{productVersion.prodBundleUrl}}'

define([`${window['{{product.alias}}-bundle']}?v=${window['{{product.alias}}-version']}`], Widget => {
  return function () {
    try {
      const widget = new Widget({
        alias: '{{product.alias}}',
        productId: '{{product.uuid}}',
        amoWidget: this
      })

      if (window.amdv) {
        window.amdv.widgets.push(widget)
      } else {
        window.amdvPreload = window.amdvPreload || []
        window.amdvPreload.push(widget)
      }
    } catch (e) {
      console.error('Ошибка при инициализации интеграции "{{product.alias}}"')
      console.log(e)
    }

    return this
  }
})
