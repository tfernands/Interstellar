class UiController {

  constructor () {
    this.initUiToggle()
    this.initTeleportButton()
    this.initFullscreenButton()
    this.initRadioButtons()
    this.initScreenshotButton()
  }

  initUiToggle () {
    const uiToggle = document.querySelector('.ui-toggle input')

    const onUIToggle = () => {
      if (uiToggle.checked) {
        document.body.classList.add('no-ui')
      }
      else {
        document.body.classList.remove('no-ui')
      }
      uiToggle.blur()
    }

    uiToggle.addEventListener('change', onUIToggle)

    onUIToggle()
  }

  initTeleportButton () {
    document.querySelector('#teleport')
      .addEventListener('touchstart', () => {
        this.onTeleportClick && this.onTeleportClick()
      }, false)
  }

  initFullscreenButton () {
    const button = document.querySelector('#fullscreen')
    if (!button) {
      return
    }

    const toggleFullscreen = () => {
      const doc = document
      const el = doc.documentElement

      if (!doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement) {
        const request = el.requestFullscreen ||
          el.mozRequestFullScreen ||
          el.webkitRequestFullscreen ||
          el.msRequestFullscreen
        request && request.call(el)
      }
      else {
        const exit = doc.exitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.webkitExitFullscreen ||
          doc.msExitFullscreen
        exit && exit.call(doc)
      }

      button.blur()
    }

    button.addEventListener('click', toggleFullscreen, false)
  }

  initRadioButtons () {
    document.querySelector('#resolution')
      .addEventListener('change', event => {
        event.target.blur()

        const pixelSize = this.getSelectedPixelSize()
        this.onPixelSizeChange && this.onPixelSizeChange(pixelSize)
      }, false)
  }

  initScreenshotButton () {
    const button = document.getElementById('screenshot')
    if (!button) {
      return
    }
    button.addEventListener('click', () => {
      this.onScreenshot && this.onScreenshot()
      button.blur()
    }, false)
  }

  setPixelSize (value) {
    document.querySelector(`[name=resolution][value="${value}"]`).checked = true
  }

  getSelectedPixelSize () {
    const element = document.querySelector('[name=resolution]:checked')

    if (!element) {
      return null
    }

    return parseFloat(element.value)
  }

  showWebGLError () {
    document.querySelector('#webgl-error').style.display = 'block'
    this.removeLoadingScreen()
  }

  removeLoadingScreen () {
    const el = document.getElementById('loading')
    el.parentElement.removeChild(el)
  }

  setUiForDesktop () {
    document.body.classList.remove('mobile-device')
  }

  setUiForMobile () {
    document.body.classList.add('mobile-device')
  }

}

export default new UiController()
