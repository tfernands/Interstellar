import {
  Vector3,
  Vector4,
  Clock
} from 'three'

import Ui from './Ui'

import Player from './Player'
import KeyboardControls from './controls/KeyboardControls'
import MobileDeviceControls from './controls/MobileDeviceControls'
import ControlsManager from './controls/ControlsManager'

import SimulationRenderer from './SimulationRenderer'
import Teleporter from './Teleporter'

class Simulation {

  init () {
    this.config = {
      wormhole: {
        position: new Vector3(10, 0.0, -32),
        radius: 0.8,
        gravityRatio: 0.25
      },

      blackhole: {
        position: new Vector3(0.0, -250.0, 250.0),
        radius: 12.5,

        // Ring definition - xyz is normal going through ring. Its magnitude determines inner radius.
        // w component determines outer radius
        disk: new Vector4(-12, 12, 6, 150.0),
        diskTexture: 'assets/accretion_disk.png'
      },

      saturn: {
        position: new Vector3(-14, 5, -40),
        radius: 8.0,

        // Ring definition - xyz is normal going through ring. Its magnitude determines inner radius.
        // w component determines outer radius
        rings: new Vector4(0, 9.22, 0, 17.1),
        texture: 'assets/saturn.jpg',
        ringsTexture: 'assets/saturnrings.png',
        lightDirection: (new Vector3(-4, 2, 3)).normalize()
      },

      planet: {
        position: new Vector3(7.6, -188.0, 200),
        radius: 0.08,
        diffuse: new Vector3(0.58, 0.85, 0.96),
        specular: new Vector3(0.1, 0.1, 0.1)
      },

      galaxy1: { texture: 'assets/galaxy1.png' },
      galaxy2: { texture: 'assets/galaxy2.png' }
    }

    this.teleportTargets = [
      { position: new Vector3(10, -307, 454), lookAt: this.config.blackhole.position, galaxy: 1 },
      { position: new Vector3(7.2, -188, 199.6), lookAt: this.config.planet.position, galaxy: 1 },
      { position: new Vector3(12.4, 3.3, -35.1), lookAt: this.config.wormhole.position, galaxy: 1 },
      { position: new Vector3(9.8, -4.6, -3.1), lookAt: this.config.wormhole.position, galaxy: 0 }
    ]

    this.initPlayer()
    this.initTeleporter()
    this.initRenderer()
    this.initControls()
  }

  initRenderer () {
    this.renderer = new SimulationRenderer(this.config, this.player)
    this.renderer.onTexturesLoaded = () => {
      Ui.removeLoadingScreen()
      this.inited = true
    }

    this.container = document.getElementById('container')
    this.container.appendChild(this.renderer.domElement)

    Ui.onPixelSizeChange = pixelSize => {
      this.renderer.setPixelSize(pixelSize)
    }

    Ui.onSSAAChange = samples => {
      this.renderer.setSSAA(samples)
    }

    Ui.onScreenshot = () => {
      const samples = Ui.getSelectedSSAA ? Ui.getSelectedSSAA() : 1
      this.renderer.saveScreenshot(samples)
    }

    window.addEventListener(
      'resize', e => {
        this.renderer.setSize(window.innerWidth, window.innerHeight)
      },
      false
    )

    let pixelSize = Ui.getSelectedPixelSize()
    if (!pixelSize) {
      pixelSize = this.getSuggestedPixelSize()
      Ui.setPixelSize(pixelSize)
    }

    const ssaa = Ui.getSelectedSSAA ? Ui.getSelectedSSAA() : 1
    this.renderer.setSSAA(ssaa)

    this.renderer.setSize(window.innerWidth, window.innerHeight, pixelSize)

    window.addEventListener('wheel', e => {
      e.preventDefault()

      const delta = e.delta || (e.deltaX + e.deltaY + e.deltaZ)
      if (delta < 0) {
        this.renderer.setZoom(this.renderer.zoom * 1.06)
      }
      else {
        this.renderer.setZoom(this.renderer.zoom / 1.06)
      }
    }, false)

    Ui.onScreenshotClick = () => {
      const url = this.renderer.captureScreenshot(3)
      const a = document.createElement('a')
      a.href = url
      a.download = 'screenshot.png'
      a.click()
    }

    Ui.onSSAAEnableChange = enabled => {
      this.renderer.setSSAAEnabled(enabled, 3)
    }

    document.addEventListener('keydown', e => {
      if (e.keyCode === 80) { // P
        e.preventDefault()
        Ui.onScreenshotClick && Ui.onScreenshotClick()
      }
    })
  }

  initPlayer () {
    this.player = new Player()
    this.player.lookAt(this.config.wormhole.position)
  }

  initControls () {
    // Add keyboard controls to the player
    this.keyboardControls = new KeyboardControls(this.player, this.container)
    this.keyboardControls.movementSpeed = 1
    this.keyboardControls.rollSpeed = Math.PI / 3
    this.keyboardControls.autoForward = false
    this.keyboardControls.dragToLook = false

    // Add mobile device controls (touch + accelerometer) to the player
    this.mobileDeviceControls = new MobileDeviceControls(this.player, this.container)

    this.controlsManager = new ControlsManager(this.keyboardControls, this.mobileDeviceControls)
    this.controlsManager.onChange = device => {
      if (device !== 'mobile') {
        return
      }

      // The player will probably not be looking with their device in the right direction, so fix that
      requestAnimationFrame(() => {
        this.player.object.quaternion.multiply(this.player.eyes.quaternion.clone().inverse())
      })
    }

    this.controlsManager.start()

    this.player.addController(this.keyboardControls)
    this.player.addController(this.mobileDeviceControls)
  }

  initTeleporter () {
    this.teleporter = new Teleporter(this.player)
    this.teleportTargets.forEach(target => {
      this.teleporter.addTarget(target)
    })

    Ui.onTeleportClick = () => {
      this.teleporter.teleportNext()
    }

    document.addEventListener('keydown', e => {
      if (e.keyCode === 84) {
        e.preventDefault()

        this.teleporter.teleportNext()
      }
      else if (e.keyCode === 80) {
        e.preventDefault()

        const samples = Ui.getSelectedSSAA ? Ui.getSelectedSSAA() : 1
        this.renderer.saveScreenshot(samples)
      }
    })
  }

  step () {
    if (this.inited) {
      this.update()
    }

    this.render()
  }

  start () {
    this.clock = new Clock()

    const animate = () => {
      requestAnimationFrame(animate)

      this.step()
    }

    animate()
  }

  update () {
    const delta = Math.max(0.001, this.clock.getDelta())

    this.player.update(delta)
  }

  render () {
    this.renderer.render()
  }

  getSuggestedPixelSize () {
    const pixelCount = window.innerWidth * window.innerHeight
    let pixelSize = 4
    while (pixelSize > 1) {
      if (pixelCount / (pixelSize * pixelSize) < 512 * 512) {
        pixelSize /= 2
      }
      else {
        break
      }
    }
    return pixelSize
  }

}

export default new Simulation()
