'use client';

import React, { useEffect, useRef } from 'react';

/*
 * WebGL stage for a photograph (three.js, loaded on demand).
 *  - mode "hero": the landing scenery photo with soft parallax and drifting light. Decorative only.
 *  - mode "read": the user's own photo while it is being read. The photo is NOT distorted: one
 *    uniform band of light passes evenly over the whole frame, marking nothing and locating nothing.
 * It sits over a normal <img>, which stays as the fallback (no WebGL, reduced motion, data saver,
 * or any failure). The canvas only fades in after its first frame has drawn.
 */
type Mode = 'hero' | 'read';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uScale;     // uv scale for fit
uniform vec2 uOffset;    // uv offset for fit
uniform float uTime;
uniform vec2 uMouse;     // -1..1
uniform float uScroll;   // 0..1
uniform float uMode;     // 0 hero, 1 read
uniform float uContain;  // 1 = letterbox (transparent outside photo)

void main(){
  vec2 uv = vUv * uScale + uOffset;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec3 col;
  if (uMode < 0.5) {
    // Parallax: bright (near) parts shift more than dark (far) parts. Decorative scenery only.
    vec3 base = texture2D(uTex, clamp(uv, 0.0, 1.0)).rgb;
    float depth = dot(base, vec3(0.299, 0.587, 0.114));
    vec2 shift = (uMouse * vec2(0.02, 0.012) + vec2(0.0, (uScroll - 0.5) * 0.02)) * (depth - 0.35);
    col = texture2D(uTex, clamp(uv + shift, 0.0, 1.0)).rgb;
    // Slow light shafts drifting across the frame.
    float d = vUv.x * 0.8 - vUv.y * 0.6 + uTime * 0.03;
    float shaft = smoothstep(0.0, 0.5, sin(d * 6.2831 * 1.3) * 0.5 + 0.5);
    col += vec3(1.0, 0.95, 0.75) * shaft * 0.1 * (0.4 + depth);
    col *= 0.92 + 0.08 * sin(uTime * 0.4);
  } else {
    col = texture2D(uTex, clamp(uv, 0.0, 1.0)).rgb;
    // One uniform vertical band, same across the full height, marks nothing.
    float x = fract(uTime * 0.32);
    float pos = -0.25 + x * 1.5;
    float band = smoothstep(0.22, 0.0, abs(vUv.x - pos));
    col *= 0.84;
    col += band * 0.20 * vec3(0.96, 0.95, 0.85);
    col *= 1.0 + band * 0.12;
  }
  float a = uContain > 0.5 ? inside : 1.0;
  gl_FragColor = vec4(col, a);
}
`;

export function PhotoScene({
  src, mode, className = '', onActive, focus = [0.6, 0.4],
}: { src: string; mode: Mode; className?: string; onActive?: (on: boolean) => void; focus?: [number, number] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (reduce || nav.connection?.saveData) return;
    let probe: WebGL2RenderingContext | WebGLRenderingContext | null = null;
    try { const c = document.createElement('canvas'); probe = c.getContext('webgl2') || c.getContext('webgl'); } catch { probe = null; }
    if (!probe) return;

    let disposed = false;
    let cleanup = () => {};
    const start = async () => {
      try {
        const { WebGLRenderer, TextureLoader, SRGBColorSpace, LinearFilter, Scene, Camera, Vector2, ShaderMaterial, Mesh, PlaneGeometry } = await import('three');
        if (disposed || !host.current) return;
        const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x000000, 0);
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .6s ease;pointer-events:none;';
        el.appendChild(canvas);
        cleanup = () => { renderer.dispose(); canvas.remove(); }; // until the full scene exists

        const tex = await new TextureLoader().loadAsync(src);
        if (disposed) { tex.dispose(); renderer.dispose(); canvas.remove(); return; }
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearFilter; tex.generateMipmaps = false;
        const img = tex.image as { width: number; height: number };

        const scene = new Scene();
        const cam = new Camera();
        const uniforms = {
          uTex: { value: tex }, uScale: { value: new Vector2(1, 1) }, uOffset: { value: new Vector2(0, 0) },
          uTime: { value: 0 }, uMouse: { value: new Vector2(0, 0) }, uScroll: { value: 0 },
          uMode: { value: mode === 'hero' ? 0 : 1 }, uContain: { value: 0 },
        };
        const mat = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true });
        scene.add(new Mesh(new PlaneGeometry(2, 2), mat));

        const fit = () => {
          const w = el.clientWidth, h = el.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h, false);
          const ca = w / h, ia = img.width / img.height;
          // object-cover on wide screens; whole photo (contain, top-aligned) on phones in read mode.
          const contain = mode === 'read' && w < 640;
          uniforms.uContain.value = contain ? 1 : 0;
          let sx: number, sy: number, ox: number, oy: number;
          if (contain) {
            if (ca > ia) { sy = 1; sx = ca / ia; ox = (1 - sx) / 2; oy = 0; }
            else { sx = 1; sy = ia / ca; ox = 0; oy = 1 - sy; }
          } else if (ca > ia) { sx = 1; sy = ia / ca; ox = 0; oy = (1 - sy) * (1 - focus[1]); }
          else { sy = 1; sx = ca / ia; oy = 0; ox = (1 - sx) * focus[0]; }
          uniforms.uScale.value.set(sx, sy); uniforms.uOffset.value.set(ox, oy);
        };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(el);

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          uniforms.uMouse.value.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
        };
        if (mode === 'hero') window.addEventListener('pointermove', onMove, { passive: true });

        let visible = true;
        const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 });
        io.observe(el);
        let raf = 0; const t0 = performance.now(); let first = true; let sm = [0, 0];
        let last = t0, slow = 0, n = 0; const force = location.search.includes('glforce');
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          if (!visible || document.hidden) return;
          // Adaptive guard: a weak device that cannot hold ~25fps drops back to the plain photo.
          n++; if (now - last > 40) slow++; last = now;
          if (!force && n === 90 && slow > 40) { cleanup(); return; }
          uniforms.uTime.value = (now - t0) / 1000;
          sm = [sm[0] + (uniforms.uMouse.value.x - sm[0]) * 0.05, sm[1] + (uniforms.uMouse.value.y - sm[1]) * 0.05];
          uniforms.uScroll.value = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
          renderer.render(scene, cam);
          if (first) { first = false; canvas.style.opacity = '1'; onActive?.(true); }
        };
        raf = requestAnimationFrame(frame);

        cleanup = () => {
          cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
          window.removeEventListener('pointermove', onMove);
          tex.dispose(); mat.dispose(); renderer.dispose(); canvas.remove(); onActive?.(false);
        };
        if (disposed) cleanup();
      } catch { cleanup(); /* fall back to the plain image */ }
    };
    start();
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, mode]);

  return <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}
