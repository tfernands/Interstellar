import {
  WebGLRenderTarget,
  LinearFilter,
  RGBAFormat,
  ShaderMaterial,
  AdditiveBlending,
  UniformsUtils,
  OrthographicCamera,
  Scene,
  Mesh,
  PlaneBufferGeometry
} from 'three'

import Pass from './Pass'
import CopyShader from './CopyShader'

export default class SSAARenderPass extends Pass {

  constructor (scene, camera, clearColor = 0x000000, clearAlpha = 0) {
    super()

    this.scene = scene
    this.camera = camera

    this.sampleLevel = 4 // 2^4 = 16 samples by default
    this.unbiased = true

    this.clearColor = clearColor
    this.clearAlpha = clearAlpha

    this.copyUniforms = UniformsUtils.clone(CopyShader.uniforms)
    this.copyMaterial = new ShaderMaterial({
      uniforms: this.copyUniforms,
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      premultipliedAlpha: true,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false
    })

    this.camera2 = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.scene2 = new Scene()
    this.quad2 = new Mesh(new PlaneBufferGeometry(2, 2), this.copyMaterial)
    this.quad2.frustumCulled = false
    this.scene2.add(this.quad2)
  }

  dispose () {
    if (this.sampleRenderTarget) {
      this.sampleRenderTarget.dispose()
      this.sampleRenderTarget = null
    }
  }

  setSize (width, height) {
    if (this.sampleRenderTarget) {
      this.sampleRenderTarget.setSize(width, height)
    }
  }

  render (renderer, writeBuffer, readBuffer) {
    if (!this.sampleRenderTarget) {
      this.sampleRenderTarget = new WebGLRenderTarget(readBuffer.width, readBuffer.height, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat
      })
      this.sampleRenderTarget.texture.name = 'SSAARenderPass.sample'
    }

    const jitterOffsets = SSAARenderPass.JitterVectors[Math.max(0, Math.min(this.sampleLevel, 5))]

    const autoClear = renderer.autoClear
    renderer.autoClear = false

    const oldClearColor = renderer.getClearColor().getHex()
    const oldClearAlpha = renderer.getClearAlpha()

    const baseSampleWeight = 1.0 / jitterOffsets.length
    const roundingRange = 1 / 32
    this.copyUniforms.tDiffuse.value = this.sampleRenderTarget.texture

    const width = readBuffer.width
    const height = readBuffer.height

    for (let i = 0; i < jitterOffsets.length; i++) {
      const jitterOffset = jitterOffsets[i]

      if (this.camera.setViewOffset) {
        this.camera.setViewOffset(width, height,
          jitterOffset[0] * 0.0625, jitterOffset[1] * 0.0625,
          width, height)
      }

      let sampleWeight = baseSampleWeight
      if (this.unbiased) {
        const uniformCenteredDistribution = (-0.5 + (i + 0.5) / jitterOffsets.length)
        sampleWeight += roundingRange * uniformCenteredDistribution
      }

      this.copyUniforms.opacity.value = sampleWeight
      renderer.setClearColor(this.clearColor, this.clearAlpha)
      renderer.render(this.scene, this.camera, this.sampleRenderTarget, true)

      if (i === 0) {
        renderer.setClearColor(0x000000, 0.0)
      }

      renderer.render(this.scene2, this.camera2, this.renderToScreen ? null : writeBuffer, (i === 0))
    }

    if (this.camera.clearViewOffset) this.camera.clearViewOffset()

    renderer.autoClear = autoClear
    renderer.setClearColor(oldClearColor, oldClearAlpha)
  }

}

SSAARenderPass.JitterVectors = [
  [
    [0, 0]
  ],
  [
    [4, 4], [-4, -4]
  ],
  [
    [-2, -6], [6, -2], [-6, 2], [2, 6]
  ],
  [
    [1, -3], [-1, 3], [5, 1], [-3, -5],
    [-5, 5], [-7, -1], [3, 7], [7, -7]
  ],
  [
    [1, 1], [-1, -3], [-3, 2], [4, -1],
    [-5, -2], [2, 5], [5, 3], [3, -5],
    [-2, 6], [0, -7], [-4, -6], [-6, 4],
    [-8, 0], [7, -4], [6, 7], [-7, -8]
  ],
  [
    [-4, -7], [-7, -5], [-3, -5], [-5, -4],
    [-1, -4], [-2, -2], [-6, -1], [-4, 0],
    [-7, 1], [-1, 2], [-6, 3], [-3, 3],
    [-7, 6], [-3, 6], [-5, 7], [-1, 7],
    [5, -7], [1, -6], [6, -5], [4, -4],
    [2, -3], [7, -2], [1, -1], [4, -1],
    [2, 1], [6, 2], [0, 4], [4, 4],
    [2, 5], [7, 5], [5, 6], [3, 7]
  ]
]
