// WebGL2 post-processing: lighting composite, bloom, chromatic fringe, colour grade, vignette, grain.
// Inputs are three 2D canvases: the lit scene, an emissive layer (added after lighting, so glows
// stay bright in the dark), and a light map (ambient plus additive lights).
export interface Grade {
  tint: [number, number, number]; // multiplies the final colour
  lift: [number, number, number]; // added to the shadows
  saturation: number; contrast: number; exposure: number;
  bloom: number; bloomThreshold: number;
  vignette: number; grain: number; aberration: number;
  fade: number; // 0..1 to black
  flash: [number, number, number, number]; // rgb + strength
}
export const DEFAULT_GRADE: Grade = {
  tint: [1, 1, 1], lift: [0.0, 0.01, 0.03], saturation: 1.05, contrast: 1.06, exposure: 1,
  bloom: 0.55, bloomThreshold: 0.72, vignette: 0.55, grain: 0.035, aberration: 0.0016, fade: 0, flash: [1, 1, 1, 0],
};

const VS = `#version 300 es
out vec2 uv; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); uv = p; gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`;
const COMP = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D sc, em, li;
void main(){ vec2 t = vec2(uv.x, 1.0-uv.y); vec3 s = texture(sc,t).rgb; vec4 e = texture(em,t); vec3 l = texture(li,t).rgb;
  o = vec4(s * l * 2.0 + e.rgb * e.a, 1.0); }`;
const BRIGHT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform float thr; uniform vec2 px;
void main(){ vec3 c = vec3(0.0);
  c += texture(src, uv + px*vec2(-1.0,-1.0)).rgb; c += texture(src, uv + px*vec2(1.0,-1.0)).rgb;
  c += texture(src, uv + px*vec2(-1.0,1.0)).rgb; c += texture(src, uv + px*vec2(1.0,1.0)).rgb; c *= 0.25;
  float b = max(max(c.r,c.g),c.b); float k = smoothstep(thr, thr + 0.35, b); o = vec4(c * k, 1.0); }`;
const BLUR = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src; uniform vec2 dir;
void main(){ vec3 c = texture(src,uv).rgb * 0.227027;
  c += texture(src, uv + dir*1.3846153846).rgb * 0.3162162162; c += texture(src, uv - dir*1.3846153846).rgb * 0.3162162162;
  c += texture(src, uv + dir*3.2307692308).rgb * 0.0702702703; c += texture(src, uv - dir*3.2307692308).rgb * 0.0702702703;
  o = vec4(c,1.0); }`;
const FINAL = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D comp, bloomA, bloomB; uniform float bloom, sat, con, expo, vig, grain, ab, fade, time; uniform vec3 tint, lift; uniform vec4 flash; uniform vec2 res;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 d = uv - 0.5; float r2 = dot(d,d);
  vec3 c; c.r = texture(comp, uv - d*ab*(1.0+r2*4.0)).r; c.g = texture(comp, uv).g; c.b = texture(comp, uv + d*ab*(1.0+r2*4.0)).b;
  vec3 b = texture(bloomA, uv).rgb * 0.6 + texture(bloomB, uv).rgb * 0.8;
  c += b * bloom;
  c *= expo;
  c = (1.0 - exp(-c * 1.35)) * 1.06;              // filmic shoulder: highlights roll off instead of clipping
  c = (c - 0.5) * con + 0.5;
  float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, sat);
  c = c * tint + lift * (1.0 - l);
  c *= 1.0 - vig * smoothstep(0.08, 0.62, r2 * 1.6);
  c += (h(uv*res + time*61.0) - 0.5) * grain;
  c = mix(c, flash.rgb, flash.a);
  c *= 1.0 - fade;
  o = vec4(clamp(c, 0.0, 1.0), 1.0); }`;

type FB = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

export class Post {
  gl: WebGL2RenderingContext;
  private progs: Record<string, { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }> = {};
  private srcTex: WebGLTexture[] = [];
  private comp!: FB; private q1!: FB; private q2!: FB; private e1!: FB; private e2!: FB;
  private w = 0; private h = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const mk = (name: string, fs: string, uniforms: string[]) => {
      const p = gl.createProgram()!;
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]] as const) {
        const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(name + ': ' + gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ': ' + gl.getProgramInfoLog(p));
      const u: Record<string, WebGLUniformLocation | null> = {}; for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
      this.progs[name] = { p, u };
    };
    mk('comp', COMP, ['sc', 'em', 'li']);
    mk('bright', BRIGHT, ['src', 'thr', 'px']);
    mk('blur', BLUR, ['src', 'dir']);
    mk('final', FINAL, ['comp', 'bloomA', 'bloomB', 'bloom', 'sat', 'con', 'expo', 'vig', 'grain', 'ab', 'fade', 'time', 'tint', 'lift', 'flash', 'res']);
    for (let i = 0; i < 3; i++) this.srcTex.push(this.texture());
    gl.bindVertexArray(gl.createVertexArray());
  }
  private texture() {
    const gl = this.gl, t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  private fbo(w: number, h: number): FB {
    const gl = this.gl, tex = this.texture(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }
  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return; this.w = w; this.h = h;
    const gl = this.gl; gl.canvas.width = w; gl.canvas.height = h;
    this.comp = this.fbo(w, h);
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2), ew = Math.max(1, w >> 3), eh = Math.max(1, h >> 3);
    this.q1 = this.fbo(qw, qh); this.q2 = this.fbo(qw, qh); this.e1 = this.fbo(ew, eh); this.e2 = this.fbo(ew, eh);
  }
  private use(name: string, target: FB | null) {
    const gl = this.gl, pr = this.progs[name]; gl.useProgram(pr.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null); gl.viewport(0, 0, target ? target.w : this.w, target ? target.h : this.h);
    return pr.u;
  }
  private bind(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); }
  private draw() { this.gl.drawArrays(this.gl.TRIANGLES, 0, 3); }

  render(scene: HTMLCanvasElement, emissive: HTMLCanvasElement, light: HTMLCanvasElement, g: Grade, time: number) {
    const gl = this.gl;
    [scene, emissive, light].forEach((c, i) => { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); });
    let u = this.use('comp', this.comp); this.bind(0, this.srcTex[0], u.sc); this.bind(1, this.srcTex[1], u.em); this.bind(2, this.srcTex[2], u.li); this.draw();
    u = this.use('bright', this.q1); this.bind(0, this.comp.tex, u.src); gl.uniform1f(u.thr, g.bloomThreshold); gl.uniform2f(u.px, 1 / this.w, 1 / this.h); this.draw();
    const blur = (a: FB, b: FB, r: number) => {
      let v = this.use('blur', b); this.bind(0, a.tex, v.src); gl.uniform2f(v.dir, r / a.w, 0); this.draw();
      v = this.use('blur', a); this.bind(0, b.tex, v.src); gl.uniform2f(v.dir, 0, r / a.h); this.draw();
    };
    blur(this.q1, this.q2, 1); blur(this.q1, this.q2, 2);
    u = this.use('bright', this.e1); this.bind(0, this.q1.tex, u.src); gl.uniform1f(u.thr, 0); gl.uniform2f(u.px, 1 / this.q1.w, 1 / this.q1.h); this.draw();
    blur(this.e1, this.e2, 1.5); blur(this.e1, this.e2, 3);
    u = this.use('final', null);
    this.bind(0, this.comp.tex, u.comp); this.bind(1, this.q1.tex, u.bloomA); this.bind(2, this.e1.tex, u.bloomB);
    gl.uniform1f(u.bloom, g.bloom); gl.uniform1f(u.sat, g.saturation); gl.uniform1f(u.con, g.contrast); gl.uniform1f(u.expo, g.exposure);
    gl.uniform1f(u.vig, g.vignette); gl.uniform1f(u.grain, g.grain); gl.uniform1f(u.ab, g.aberration); gl.uniform1f(u.fade, g.fade); gl.uniform1f(u.time, time % 100);
    gl.uniform3fv(u.tint, g.tint); gl.uniform3fv(u.lift, g.lift); gl.uniform4fv(u.flash, g.flash); gl.uniform2f(u.res, this.w, this.h);
    this.draw();
  }
}
