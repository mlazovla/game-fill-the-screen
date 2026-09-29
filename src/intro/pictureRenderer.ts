import type { Crop, Transfer } from './pictureAdjust'

const VERTEX_SHADER = `
attribute vec2 position;
uniform vec4 crop;
uniform float mirror;
varying vec2 uv;
void main() {
  vec2 t = position * 0.5 + 0.5;
  t.x = mix(t.x, 1.0 - t.x, mirror);
  uv = vec2(crop.x + t.x * crop.z, 1.0 - (crop.y + (1.0 - t.y) * crop.w));
  gl_Position = vec4(position, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D image;
uniform vec3 transfer;
varying vec2 uv;
void main() {
  float luma = dot(texture2D(image, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(vec3(clamp(transfer.x * pow(max(luma, 0.0001), transfer.y) + transfer.z, 0.0, 1.0)), 1.0);
}`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

export function createPictureRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false })
  if (!gl) return null

  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
  gl.linkProgram(program)
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const cropLocation = gl.getUniformLocation(program, 'crop')
  const mirrorLocation = gl.getUniformLocation(program, 'mirror')
  const transferLocation = gl.getUniformLocation(program, 'transfer')

  return {
    upload(source: TexImageSource) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source)
    },
    draw(crop: Crop, mirrored: boolean, transfer: Transfer) {
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.uniform4f(cropLocation, crop.x, crop.y, crop.width, crop.height)
      gl.uniform1f(mirrorLocation, mirrored ? 1 : 0)
      gl.uniform3f(transferLocation, transfer.amplitude, transfer.exponent, transfer.offset)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
  }
}
