import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

document.fonts.ready.then(() => {
  window.airdox = new AirdoxCube();
});

class AirdoxCube {
  constructor() {
    this.container = document.getElementById('scene-container');
    this.scene = new THREE.Scene();

    this.currentFace = 0;
    this.faceNames = ['IDENTITY', 'ABOUT', 'LIVE SETS', 'STUDIO', 'SOCIAL', 'BOOKING'];
    this.isDragging = false;
    this.is2DMode = false;
    this.dragStart = { x: 0, y: 0, time: 0 };
    this.prevPointer = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.snapAnim = null;
    this.lightIntensity = { ambient: 0.6, point: 1 }; // For 2D transition
    this.targetMouse = { x: 0, y: 0 };
    
    // Audio
    this.audioCtx = null;
    this.analyser = null;
    this.audio = null;
    this.currentTrackIndex = -1;
    this.expandedTrackIndex = -1;
    this.listScrollY = 0;
    this.targetListScrollY = 0;
    const AUDIO_BASE = 'https://pub-c65c35191de241338a08b07b45f1495f.r2.dev/public';
    this.mixes = [
      { id: 'recording_2026_04_12', name: 'REC 12.04.2026', meta: 'APR 2026  ·  2:30:15', src: `${AUDIO_BASE}/Airdox_REC_2026_04_12.mp3`, tracklist: ['01. Intro - Awakening', '02. Industrial Sector', '03. Raw Cyberpunk Tool', '04. Acid 303 Injection', '05. Outro Sequence'] },
      { id: 'recording_2026_03_15', name: 'REC 15.03.2026', meta: 'MAR 2026  ·  1:36:22', src: `${AUDIO_BASE}/Airdox_REC_2026_03_15.mp3`, tracklist: ['01. Deep Space', '02. Berlin Underground', '03. Dark Matter', '04. Hypnotic State'] },
      { id: 'recording_2026_03_09', name: 'KEINEN GRUND HAT', meta: 'MAR 2026  ·  50:23', src: `${AUDIO_BASE}/Airdox_REC_2026_03_09.mp3`, tracklist: ['01. Start', '02. Hard Groove', '03. Peak Time', '04. Fade'] },
      { id: 'secret_set_2025_12_22', name: 'SECRET SET', meta: '22.12.2025  ·  2:46:56', src: `${AUDIO_BASE}/Airdox_Secret_Set_Pirate_Studio_22_12_2025_full.mp3`, tracklist: ['01. Unknown Artist - ID', '02. Airdox - Custom Tool', '03. Basement Jam', '04. Early Morning Vibes'] },
      { id: '0', name: 'PIRATE (17.12.)', meta: '17.12.2025  ·  1:05:00', src: `${AUDIO_BASE}/Airdox%20Pirate%20Studio_17.12.2025.mp3`, tracklist: ['01. Live Jam 1', '02. TR-909 Workout', '03. Modular Chaos'] },
      { id: '1', name: 'PIRATE (OLD)', meta: 'DEC 2025  ·  1:02:34', src: `${AUDIO_BASE}/Airdox%20Pirate-Studio%203_12_2025.mp3`, tracklist: ['01. Classic Set', '02. Detroit Influences'] },
      { id: '2', name: 'OVER AND OUT', meta: 'FEB 2024  ·  58:22', src: `${AUDIO_BASE}/Over%20and%20OUt_full.mp3`, tracklist: ['01. Last Track Initial', '02. Overdrive', '03. Out'] },
      { id: '3', name: '65', meta: 'JAN 2024  ·  1:05:00', src: `${AUDIO_BASE}/65_full.mp3`, tracklist: ['01. 65 Intro', '02. Drumcode Style', '03. Heavy Kicks'] },
      { id: '4', name: 'TSCHAU MÄRKISCHE', meta: 'MAR 2024  ·  45:18', src: `${AUDIO_BASE}/Airdox_tschau_m%C3%A4rkische_full.mp3`, tracklist: ['01. Farewell', '02. Melancholy', '03. The End of an Era'] },
      { id: '5', name: 'OHBOY', meta: 'APR 2024  ·  52:45', src: `${AUDIO_BASE}/ohboy_full.mp3`, tracklist: ['01. Oh Boy', '02. What a Night', '03. Bounce'] },
      { id: '6', name: 'SOLLTE NICHT SEIN', meta: 'FEB 2025  ·  2:49:00', src: `${AUDIO_BASE}/Airdox%20vs%20Jette_sollte%20nicht%20sein_2024_02_full.mp3`, tracklist: ['01. Intro - B2B', '02. Jette Selects', '03. Airdox Push', '04. Closing'] }
    ];

    // Stats & Achievements
    this.stats = this.loadStats();
    
    // Interactive States
    this.gearStates = [false, false, false, false, false];
    this.toastQueue = [];

    this.faceAngles = [
      { x: 0, y: 0 },
      { x: 0, y: -Math.PI / 2 },
      { x: 0, y: -Math.PI },
      { x: 0, y: Math.PI / 2 },
      { x: Math.PI / 2, y: 0 }, // 4: SOCIAL (+Y Face)
      { x: -Math.PI / 2, y: 0 }, // 5: BOOKING (-Y Face)
    ];

    // Tracklist Load States
    this.tracklistCache = {};
    this.loadingIndices = new Set();

    this.tiltX = -0.28;
    this.tiltY = 0.35;

    this.initRenderer();
    this.initCamera();
    this.initLights();
    this.initParticles();
    this.initCube();
    this.initPostProcessing();
    this.initInteraction();
    this.initHamburger();
    this.initCursor();
    this.initBgVisualizer();
    this.initGlobalPlayer();
    this.runLoader();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    this.clock = new THREE.Clock();
    this.tick();
    setTimeout(() => this.gotoFace(0), 600);
  }

  // ════════════════════════════════════
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 6);
    this.defaultCameraZ = 6;
  }

  initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
    this.blueLight = new THREE.PointLight(0x00d4ff, 3, 14);
    this.blueLight.position.set(3, 2, 5);
    this.scene.add(this.blueLight);
    this.pinkLight = new THREE.PointLight(0xff00aa, 2, 14);
    this.pinkLight.position.set(-3, -2, 5);
    this.scene.add(this.pinkLight);
    this.purpleLight = new THREE.PointLight(0x9d00ff, 1.2, 12);
    this.purpleLight.position.set(0, 4, -4);
    this.scene.add(this.purpleLight);
  }

  // ════════════════════════════════════
  //  PARTICLES
  // ════════════════════════════════════
  initParticles() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    this._particleBasePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      this._particleBasePositions[i * 3] = x;
      this._particleBasePositions[i * 3 + 1] = y;
      this._particleBasePositions[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00d4ff, size: 0.03, transparent: true, opacity: 0.35,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  // ════════════════════════════════════
  //  CUBE — BRIGHTER TEXTURES
  // ════════════════════════════════════
  initCube() {
    const size = 2.2;

    // ── C1: Environment Map (dark nebula HDR-like) ──
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 256; envCanvas.height = 256;
    const ectx = envCanvas.getContext('2d');
    const envGrad = ectx.createRadialGradient(128, 128, 0, 128, 128, 180);
    envGrad.addColorStop(0, '#111122');
    envGrad.addColorStop(0.4, '#080814');
    envGrad.addColorStop(0.7, '#050510');
    envGrad.addColorStop(1, '#020208');
    ectx.fillStyle = envGrad;
    ectx.fillRect(0, 0, 256, 256);
    // Add some faint "stars"
    for (let i = 0; i < 60; i++) {
      ectx.fillStyle = `rgba(${150 + Math.random()*105}, ${180 + Math.random()*75}, 255, ${0.15 + Math.random()*0.25})`;
      ectx.fillRect(Math.random()*256, Math.random()*256, 1, 1);
    }
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;

    const materials = [];
    for (let i = 0; i < 6; i++) {
      materials.push(new THREE.MeshPhysicalMaterial({
        map: this.paintFace(i),
        roughness: 0.12, metalness: 0.7,
        clearcoat: 0.5, clearcoatRoughness: 0.15,
        transparent: true, opacity: 0.97,
        envMap: envTex, envMapIntensity: 0.6,
      }));
    }
    const ordered = [materials[1], materials[3], materials[4], materials[5], materials[0], materials[2]];
    const geo = new THREE.BoxGeometry(size, size, size);
    this.cube = new THREE.Mesh(geo, ordered);
    this.scene.add(this.cube);

    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.25 });
    this.edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    this.cube.add(this.edgeLines);

    // ── A2: Reflection Plane ──
    const planeGeo = new THREE.PlaneGeometry(12, 12);
    const planeMat = new THREE.MeshPhysicalMaterial({
      color: 0x020210,
      roughness: 0.2, metalness: 0.9,
      transparent: true, opacity: 0.4,
      envMap: envTex, envMapIntensity: 0.3,
    });
    this.reflectionPlane = new THREE.Mesh(planeGeo, planeMat);
    this.reflectionPlane.rotation.x = -Math.PI / 2;
    this.reflectionPlane.position.y = -1.5;
    this.scene.add(this.reflectionPlane);

    this.cube.rotation.x = this.tiltX;
    this.cube.rotation.y = this.tiltY;
  }

  // ════════════════════════════════════
  //  A1: POST-PROCESSING (Bloom + Chromatic Aberration)
  // ════════════════════════════════════
  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom — gives neon edges their glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,   // strength (subtle)
      0.6,   // radius
      0.85   // threshold (only bright stuff blooms)
    );
    this.composer.addPass(this.bloomPass);

    // Chromatic Aberration — subtle RGB split
    const chromaticAberrationShader = {
      uniforms: {
        tDiffuse: { value: null },
        uOffset: { value: new THREE.Vector2(0.001, 0.001) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uOffset;
        varying vec2 vUv;
        void main() {
          float r = texture2D(tDiffuse, vUv + uOffset).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv - uOffset).b;
          float a = texture2D(tDiffuse, vUv).a;
          gl_FragColor = vec4(r, g, b, a);
        }
      `,
    };
    this.chromaticPass = new ShaderPass(chromaticAberrationShader);
    this.composer.addPass(this.chromaticPass);

    // C2: Glitch Shader — CRT distortion bursts
    const glitchShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        
        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Horizontal displacement
          float lineJitter = step(0.99, rand(vec2(uTime * 0.1, floor(uv.y * 80.0)))) * uIntensity;
          uv.x += lineJitter * (rand(vec2(uTime, uv.y)) - 0.5) * 0.15;
          
          // Color channel split on glitch
          float splitAmount = uIntensity * 0.02;
          float r = texture2D(tDiffuse, uv + vec2(splitAmount, 0.0)).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - vec2(splitAmount, 0.0)).b;
          
          // Scanline flicker
          float scan = 1.0 - uIntensity * 0.15 * step(0.5, fract(uv.y * 300.0 + uTime * 5.0));
          
          gl_FragColor = vec4(r * scan, g * scan, b * scan, 1.0);
        }
      `,
    };
    this.glitchPass = new ShaderPass(glitchShader);
    this.composer.addPass(this.glitchPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Glitch timing state
    this._glitchTimer = 0;
    this._glitchActive = false;
    this._glitchDuration = 0;
  }

  // ════════════════════════════════════
  //  B1: GLOBAL AUDIO PLAYER (DOM overlay)
  // ════════════════════════════════════
  initGlobalPlayer() {
    const strip = document.createElement('div');
    strip.id = 'global-player';
    strip.innerHTML = `
      <button id="gp-play" aria-label="Play/Pause">▶</button>
      <div id="gp-info">
        <span id="gp-title">No track selected</span>
        <span id="gp-time">00:00 / 00:00</span>
      </div>
      <div id="gp-progress-wrap">
        <div id="gp-progress"></div>
      </div>
    `;
    document.body.appendChild(strip);

    // Play/Pause toggle
    strip.querySelector('#gp-play').addEventListener('click', () => {
      if (!this.audio) return;
      if (this.audio.paused) { this.audio.play(); }
      else { this.audio.pause(); }
      this.updateGlobalPlayer();
      this.redrawLiveSetsFull();
    });

    // Click to seek on progress bar
    strip.querySelector('#gp-progress-wrap').addEventListener('click', (e) => {
      if (!this.audio || !this.audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      this.audio.currentTime = this.audio.duration * Math.max(0, Math.min(1, pct));
    });

    this._gpVisible = false;
  }

  updateGlobalPlayer() {
    const el = document.getElementById('global-player');
    if (!el) return;
    const btn = el.querySelector('#gp-play');
    const title = el.querySelector('#gp-title');
    const time = el.querySelector('#gp-time');
    const prog = el.querySelector('#gp-progress');

    if (this.currentTrackIndex === -1 || !this.audio) {
      if (this._gpVisible) { el.classList.remove('visible'); this._gpVisible = false; }
      return;
    }

    if (!this._gpVisible) { el.classList.add('visible'); this._gpVisible = true; }

    btn.textContent = this.audio.paused ? '▶' : '⏸';
    title.textContent = this.mixes[this.currentTrackIndex].name;

    const fmt = (v) => {
      if (isNaN(v) || !isFinite(v)) return '00:00';
      const m = Math.floor(v / 60);
      const s = Math.floor(v % 60);
      return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    };
    time.textContent = `${fmt(this.audio.currentTime)} / ${fmt(this.audio.duration)}`;
    prog.style.width = ((this.audio.currentTime / (this.audio.duration || 1)) * 100) + '%';
  }

  // ── PAINT FACE — BRIGHTER, MORE READABLE ──
  paintFace(index) {
    const W = 1024;
    const scale = 2; // Power-of-Two (2048x2048) prevents WebGL mipmap blur
    const c = document.createElement('canvas');
    c.width = W * scale; c.height = W * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);

    // Lighter background for better readability
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, W);

    const grad = ctx.createLinearGradient(0, 0, W, W);
    grad.addColorStop(0, 'rgba(0,212,255,0.06)');
    grad.addColorStop(1, 'rgba(255,0,170,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, W);

    // Border
    ctx.strokeStyle = 'rgba(200,205,216,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, W - 64, W - 64);

    // Corner ticks
    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.lineWidth = 1;
    const tl = 40;
    [[32,32,1,1],[W-32,32,-1,1],[32,W-32,1,-1],[W-32,W-32,-1,-1]].forEach(([x,y,dx,dy]) => {
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+tl*dx,y); ctx.moveTo(x,y); ctx.lineTo(x,y+tl*dy); ctx.stroke();
    });

    // Big faded number
    ctx.save(); ctx.globalAlpha = 0.04;
    ctx.font = '900 280px Orbitron, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#c8cdd8';
    ctx.fillText(`0${index + 1}`, W - 60, W - 40);
    ctx.restore();

    // Label header
    const labels = ['IDENTITY', 'ABOUT', 'LIVE SETS', 'STUDIO', 'SOCIAL', 'BOOKING'];
    ctx.font = '400 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00d4ff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`0${index + 1}  ·  ${labels[index]}`, 64, 56);
    ctx.fillStyle = 'rgba(0,212,255,0.4)';
    ctx.fillRect(64, 92, 220, 1);

    ctx.textBaseline = 'top';
    switch (index) {
      case 0: this.drawIdentity(ctx, W); break;
      case 1: this.drawAbout(ctx, W); break;
      case 2: this.drawLiveSets(ctx, W); break;
      case 3: this.drawStudio(ctx, W); break;
      case 4: this.drawSocial(ctx, W); break;
      case 5: this.drawBooking(ctx, W); break;
    }

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    
    if (index === 2) {
      this.liveCtx = ctx;
      this.liveTexture = tex;
    }
    
    return tex;
  }

  drawIdentity(ctx, W) {
    ctx.font = '900 130px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('AIRDOX', 64, 280);

    ctx.font = '400 30px "JetBrains Mono", monospace';
    ctx.fillStyle = '#a0a8b8';
    ctx.fillText('DJ  ·  PRODUCER  ·  BERLIN', 64, 440);

    const bar = ctx.createLinearGradient(64, 0, 600, 0);
    bar.addColorStop(0, '#00d4ff'); bar.addColorStop(0.5, '#ff00aa'); bar.addColorStop(1, '#9d00ff');
    ctx.fillStyle = bar;
    ctx.fillRect(64, 500, 520, 5);

    ctx.font = '300 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#7a8090';
    ctx.fillText('TECHNO / INDUSTRIAL / DARK ELECTRO', 64, 550);
    ctx.fillText('BERGHAIN · TRESOR · ABOUT BLANK', 64, 590);

    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('← →  NAVIGATE', 64, 720);
    ctx.fillStyle = '#ff00aa';
    ctx.fillText('DRAG  TO ROTATE', 64, 760);
    
    // Total Plays
    ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(157, 0, 255, 0.6)';
    ctx.fillText(`PLATFORM PLAYS: ${12400 + (this.stats.totalPlays * 8)}`, 64, 820);
  }

  drawAbout(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('About', 64, 170);

    ctx.font = '500 22px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ['Der Sound AIRDOX steht für puristischen Berliner', 'Underground Techno – ohne Kompromisse. Treibende Rhythmen,', 'die die Tanzfläche stundenlang zum Kochen bringen.'].forEach((l, i) => ctx.fillText(l, 64, 280 + i * 36));

    ctx.font = '300 20px Outfit, sans-serif';
    ctx.fillStyle = '#a0a8b8';
    
    ctx.fillStyle = '#00d4ff'; ctx.font = '700 18px "JetBrains Mono", monospace'; ctx.fillText('DIE PRÄGUNG', 64, 430);
    ctx.fillStyle = '#c0c8d8'; ctx.font = '300 18px Outfit, sans-serif';
    ['Seine musikalische DNA wurde in den legendären Nächten des alten', 'Tresor geschrieben – genauer gesagt in der oberen Etage, im Alten Globus.', 'Nicht der raue Keller-Sound, sondern der cleane, energetische Techno', 'der Leipziger Straße 126A formte seine harte Ästhetik.'].forEach((l, i) => ctx.fillText(l, 64, 460 + i * 26));

    ctx.fillStyle = '#00d4ff'; ctx.font = '700 18px "JetBrains Mono", monospace'; ctx.fillText('DER WEG & DIE VISION', 64, 590);
    ctx.fillStyle = '#c0c8d8'; ctx.font = '300 18px Outfit, sans-serif';
    ['Seit über zwei Jahrzehnten ist AIRDOX Teil der Szene.', 'Heute gilt seine gesamte Kraft der Musik – eine neue,', 'entschlossene Phase seiner Karriere hat begonnen, um', 'den absolut perfekten Moment auf der Tanzfläche zu erschaffen.'].forEach((l, i) => ctx.fillText(l, 64, 620 + i * 26));

    const stats = [['50+', 'LIVE SETS'], ['138', 'AVG BPM'], ['10K+', 'LISTENERS'], ['BERLIN', 'BASED']];
    stats.forEach(([val, lbl], i) => {
      const x = 64 + i * 220;
      ctx.font = '900 48px Orbitron, sans-serif';
      const sg = ctx.createLinearGradient(x, 780, x + 80, 830);
      sg.addColorStop(0, '#00d4ff'); sg.addColorStop(1, '#ff00aa');
      ctx.fillStyle = sg;
      ctx.fillText(val, x, 780);
      ctx.font = '400 16px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8890a0';
      ctx.fillText(lbl, x, 840);
    });
  }

  drawLiveSets(ctx, W) {
    ctx.font = '900 72px Orbitron, sans-serif';
    ctx.fillStyle = '#00ffea';
    ctx.fillText('Live Sets', 64, 170);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 180, 520, 760); // Clip region for sliding playlist
    ctx.clip();
    
    // Virtual Scroll
    ctx.translate(0, -Math.floor(this.listScrollY));
    
    let currentY = 200;

    this.mixes.forEach((m, i) => {
      const isPlaying = (this.currentTrackIndex === i && this.audio && !this.audio.paused);
      const isExpanded = this.expandedTrackIndex === i;
      const xObj = 100; // far left
      
      ctx.beginPath(); ctx.arc(xObj, currentY + 14, 14, 0, Math.PI * 2);
      ctx.strokeStyle = isPlaying ? '#ff00aa' : '#00d4ff'; 
      ctx.lineWidth = 1.5; ctx.stroke();
      
      if (isPlaying) {
         ctx.fillStyle = '#ff00aa'; 
         ctx.fillRect(xObj - 4, currentY + 6, 3, 15);
         ctx.fillRect(xObj + 1, currentY + 6, 3, 15);
      } else {
         ctx.beginPath(); ctx.moveTo(xObj - 3, currentY + 5); ctx.lineTo(xObj - 3, currentY + 23); ctx.lineTo(xObj + 7, currentY + 14); ctx.closePath();
         ctx.fillStyle = '#00d4ff'; ctx.fill();
      }

      ctx.font = isPlaying ? '900 20px Orbitron, sans-serif' : '600 18px Outfit, sans-serif'; 
      ctx.fillStyle = isPlaying ? '#fff' : '#e0e4ec'; 
      ctx.fillText(m.name, xObj + 30, currentY);
      
      ctx.font = '300 14px "JetBrains Mono", monospace'; 
      ctx.fillStyle = isPlaying ? '#ff00aa' : '#8890a0'; 
      ctx.fillText(m.meta, xObj + 30, currentY + 26);
      
      // Draw accordion [+] / [-]
      if (m.tracklist && m.tracklist.length > 0) {
          ctx.font = '700 18px "JetBrains Mono", monospace';
          ctx.fillStyle = isExpanded ? '#ff00aa' : 'rgba(0, 212, 255, 0.4)';
          ctx.fillText(isExpanded ? '[-]' : '[+]', 440, currentY + 12);
      }

      ctx.fillStyle = 'rgba(200,205,216,0.06)'; 
      ctx.fillRect(64, currentY + 48, W - 580, 1); 
      
      currentY += 70;
      
      if (isExpanded && m.tracklist) {
          const isScanning = this.loadingIndices.has(i);
          if (isScanning) {
             ctx.font = 'italic 300 13px "JetBrains Mono", monospace';
             ctx.fillStyle = '#00ffea';
             ctx.fillText('DISCOVERING TRACKLIST...', xObj + 40, currentY + 5);
             currentY += 30;
          } else {
             m.tracklist.forEach((t, tIdx) => {
                ctx.font = '300 13px "JetBrains Mono", monospace';
                const isObj = typeof t === 'object' && t.timestamp;
                const text = isObj ? `[${t.timestamp}] ${t.display}` : t;
                
                ctx.fillStyle = isObj ? '#e0e4ec' : '#8890a0';
                if (isObj && isPlaying) {
                   const isNow = (this.audio.currentTime >= t.time && 
                                  (tIdx === m.tracklist.length - 1 || this.audio.currentTime < m.tracklist[tIdx+1].time));
                   if (isNow) ctx.fillStyle = '#ff00aa'; 
                }
                
                ctx.fillText(text, xObj + 40, currentY + 5);
                currentY += 30;
             });
          }
          currentY += 20;
      }
    });
    
    // Draw scroll indicator line if scrolling needed
    const expandedT = this.expandedTrackIndex !== -1 && this.mixes[this.expandedTrackIndex].tracklist ? this.mixes[this.expandedTrackIndex].tracklist.length * 30 + 20 : 0;
    const maxScroll = Math.max(0, (this.mixes.length * 70) + expandedT - 700);
    
    if (maxScroll > 0) {
       ctx.fillStyle = 'rgba(0,212,255,0.1)';
       ctx.fillRect(72, 190 + this.listScrollY, 2, 600);
       const h = Math.max(50, 600 * (700 / (700 + maxScroll)));
       const yPos = 190 + this.listScrollY + (this.listScrollY / (maxScroll || 1)) * (600 - h);
       ctx.fillStyle = '#00ffea';
       ctx.fillRect(70, yPos, 6, h);
    }
    
    ctx.restore();
  }

  redrawLiveSetsFull() {
    if (!this.liveCtx) return;
    const ctx = this.liveCtx;
    const W = 1024;
    
    // Reset Transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2); // default power of two scale
    
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, W);

    const grad = ctx.createLinearGradient(0, 0, W, W);
    grad.addColorStop(0, 'rgba(0,212,255,0.06)');
    grad.addColorStop(1, 'rgba(255,0,170,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, W);

    ctx.strokeStyle = 'rgba(200,205,216,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, W - 64, W - 64);

    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.lineWidth = 1;
    const tl = 40;
    [[32,32,1,1],[W-32,32,-1,1],[32,W-32,1,-1],[W-32,W-32,-1,-1]].forEach(([x,y,dx,dy]) => {
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+tl*dx,y); ctx.moveTo(x,y); ctx.lineTo(x,y+tl*dy); ctx.stroke();
    });

    ctx.save(); ctx.globalAlpha = 0.04;
    ctx.font = '900 280px Orbitron, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#c8cdd8';
    ctx.fillText(`03`, W - 60, W - 40);
    ctx.restore();

    ctx.font = '400 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00d4ff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`03  ·  LIVE SETS`, 64, 56);
    ctx.fillStyle = 'rgba(0,212,255,0.4)';
    ctx.fillRect(64, 92, 220, 1);

    ctx.textBaseline = 'top';
    this.drawLiveSets(ctx, W);
    
    if (this.currentTrackIndex !== -1) {
       this.drawTimeline();
    }
    
    this.drawLiveSetsStats(ctx, W);

    if (this.liveTexture) this.liveTexture.needsUpdate = true;
  }

  drawLiveSetsStats(ctx, W) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(`SESSION PLAYS: ${this.stats.totalPlays || 0}`, W - 64, 56);
    ctx.restore();
  }


  drawStudio(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#ff00aa';
    ctx.fillText('Gear & Studio', 64, 170);

    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HARDWARE / SYNTHS / DRUM MACHINES', 64, 240);
    
    ctx.fillStyle = 'rgba(255,0,170,0.4)';
    ctx.fillRect(64, 270, 340, 1);

    const gear = [
      { name: 'ROLAND TR-909', desc: 'Analog Drum Synthesizer', type: 'DRUMS' },
      { name: 'ELEKTRON ANALOG RYTM', desc: '8-Voice Drum Machine', type: 'DRUMS' },
      { name: 'MOOG SUB 37', desc: 'Paraphonic Analog Synth', type: 'SYNTH' },
      { name: 'ABLETON PUSH 3', desc: 'Standalone Instrument', type: 'CONTROLLER' },
      { name: 'ALLEN & HEATH XONE:96', desc: 'Analog DJ Mixer', type: 'MIXER' },
    ];

    gear.forEach((g, i) => {
      const isPowered = this.gearStates[i];
      const y = 320 + i * 110;
      
      ctx.fillStyle = isPowered ? 'rgba(255,0,170,0.15)' : 'rgba(255,0,170,0.06)'; 
      ctx.fillRect(64, y - 10, W - 128, 85);
      
      ctx.strokeStyle = isPowered ? '#ff00aa' : 'rgba(255,0,170,0.2)'; 
      ctx.lineWidth = isPowered ? 2 : 1;
      ctx.strokeRect(64, y - 10, W - 128, 85);
      
      ctx.font = '400 16px "JetBrains Mono", monospace'; 
      ctx.fillStyle = isPowered ? '#ffffff' : '#ff00aa';
      ctx.fillText(isPowered ? '[ ONLINE ]' : g.type, 90, y + 25);
      
      ctx.font = '700 32px Orbitron, sans-serif'; 
      ctx.fillStyle = '#ffffff';
      ctx.fillText(g.name, 220, y + 16);
      
      ctx.font = '300 20px Outfit, sans-serif'; ctx.fillStyle = isPowered ? '#fff' : '#8890a0';
      ctx.fillText(g.desc, 220, y + 46);

      if (isPowered) {
          // Add a small "power" light
          ctx.beginPath(); ctx.arc(88, y + 54, 4, 0, Math.PI*2);
          ctx.fillStyle = '#ff00aa'; ctx.fill();
      }
    });
  }

  drawSocial(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#9d00ff';
    ctx.fillText('Follow', 64, 170);

    const socials = [
      { icon: '☁', name: 'SoundCloud', handle: 'soundcloud.com/airdox' },
      { icon: '🎵', name: 'Mixcloud', handle: 'mixcloud.com/Airdox' },
      { icon: '📷', name: 'Instagram', handle: 'instagram.com/airdox_bln' },
      { icon: '✉', name: 'Email', handle: 'airdox82@gmail.com' },
    ];

    socials.forEach((s, i) => {
      const y = 300 + i * 135;
      ctx.fillStyle = 'rgba(200,205,216,0.04)'; ctx.fillRect(64, y - 10, W - 128, 105);
      ctx.strokeStyle = 'rgba(200,205,216,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(64, y - 10, W - 128, 105);
      ctx.font = '36px serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(s.icon, 90, y + 18);
      ctx.font = '600 30px "JetBrains Mono", monospace'; ctx.fillStyle = '#ffffff'; ctx.fillText(s.name, 160, y + 8);
      ctx.font = '300 22px "JetBrains Mono", monospace'; ctx.fillStyle = '#8890a0'; ctx.fillText(s.handle, 160, y + 52);
      ctx.font = '400 30px sans-serif'; ctx.fillStyle = '#9d00ff'; ctx.textAlign = 'right'; ctx.fillText('↗', W - 90, y + 22); ctx.textAlign = 'left';
    });
  }

  drawBooking(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('Booking', 64, 170);

    const eg = ctx.createLinearGradient(64, 300, 700, 300);
    eg.addColorStop(0, '#00d4ff'); eg.addColorStop(1, '#ff00aa');
    ctx.font = '700 40px Orbitron, sans-serif'; ctx.fillStyle = eg;
    ctx.fillText('airdox82@gmail.com', 64, 300);

    const fields = ['NAME / PROMOTER', 'E-MAIL', 'VENUE · DATE', 'MESSAGE'];
    fields.forEach((f, i) => {
      const y = 420 + i * 85;
      ctx.font = '300 24px "JetBrains Mono", monospace'; ctx.fillStyle = '#6a7080'; ctx.fillText(f, 64, y);
      ctx.fillStyle = 'rgba(200,205,216,0.1)'; ctx.fillRect(64, y + 40, W - 128, 1);
    });

    const bg = ctx.createLinearGradient(64, 790, 960, 850);
    bg.addColorStop(0, '#00d4ff'); bg.addColorStop(1, '#ff00aa');
    ctx.fillStyle = bg; ctx.fillRect(64, 790, W - 128, 64);
    ctx.font = '700 24px "JetBrains Mono", monospace'; ctx.fillStyle = '#040408';
    ctx.textAlign = 'center'; ctx.fillText('SEND REQUEST  ↗', W / 2, 812); ctx.textAlign = 'left';
  }

  // ════════════════════════════════════
  //  2D MODE — zoom into face
  // ════════════════════════════════════
  enter2DMode() {
    if (this.is2DMode) return;
    
    // Trigger Glitch Burst
    if (this.glitchPass) {
        this._glitchActive = true;
        this._glitchDuration = 0.4;
    }
    
    this.gotoFace(this.currentFace, true);
  }

  exit2DMode() {
    if (!this.is2DMode) return;
    
    // Trigger Glitch Burst
    if (this.glitchPass) {
        this._glitchActive = true;
        this._glitchDuration = 0.4;
    }
    
    this.is2DMode = false;

    if (this.snapAnim) this.snapAnim.kill();

    // Restore tilt and camera distance
    gsap.to(this.camera.position, {
      z: this.defaultCameraZ,
      duration: 0.8,
      ease: 'power2.out',
    });

    // Restore 3D lighting depth
    gsap.to(this.lightIntensity, {
      ambient: 0.6, point: 1, duration: 0.8, ease: 'power2.out'
    });

    // Re-snap with tilt
    this.gotoFace(this.currentFace);

    document.getElementById('mode-2d-overlay').classList.remove('active');
    document.getElementById('mode2dHint').classList.remove('visible');
    document.getElementById('ui-layer').classList.remove('hidden');
    const hero = document.getElementById('heroTitle');
    if (hero) hero.classList.remove('hidden');
  }

  // ════════════════════════════════════
  //  HAMBURGER MENU
  // ════════════════════════════════════
  initHamburger() {
    const btn = document.getElementById('hamburgerBtn');
    const overlay = document.getElementById('navOverlay');
    let isOpen = false;

    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      btn.classList.toggle('open', isOpen);
      overlay.classList.toggle('open', isOpen);
    });

    overlay.querySelectorAll('button').forEach((navBtn) => {
      navBtn.addEventListener('click', () => {
        const face = parseInt(navBtn.dataset.face);
        this.gotoFace(face, true); // <--- Auto 2D Mode trigger
        // Close menu
        isOpen = false;
        btn.classList.remove('open');
        overlay.classList.remove('open');
      });
    });
  }

  // ════════════════════════════════════
  //  INTERACTION
  // ════════════════════════════════════
  initInteraction() {
    const canvas = this.renderer.domElement;

    const onDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('button, a, input, nav, .nav-overlay')) return;

      if (this.is2DMode) this.exit2DMode();

      this.isDragging = true;
      document.body.classList.add('grabbing');
      const pt = e.touches ? e.touches[0] : e;
      this.dragStart = { x: pt.clientX, y: pt.clientY, time: Date.now() };
      this.prevPointer = { x: pt.clientX, y: pt.clientY };
      this.velocity = { x: 0, y: 0 };
      if (this.snapAnim) this.snapAnim.kill();
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - this.prevPointer.x;
      const dy = pt.clientY - this.prevPointer.y;
      
      if (this.is2DMode && this.faceNames[this.currentFace] === 'LIVE SETS') {
          const expandedHeight = this.expandedTrackIndex !== -1 && this.mixes[this.expandedTrackIndex].tracklist 
                                 ? this.mixes[this.expandedTrackIndex].tracklist.length * 30 + 20 : 0;
          const maxScroll = Math.max(0, (this.mixes.length * 70) + expandedHeight - 700);
          this.targetListScrollY -= dy * 1.5; 
          if (this.targetListScrollY < 0) this.targetListScrollY = 0;
          if (this.targetListScrollY > maxScroll) this.targetListScrollY = maxScroll;
      } else {
          const s = 0.006;
          this.cube.rotation.y += dx * s;
          this.cube.rotation.x += dy * s;
          this.cube.rotation.x = Math.max(-1.4, Math.min(1.4, this.cube.rotation.x));
          this.velocity = { x: dy * s, y: dx * s };
      }
      this.prevPointer = { x: pt.clientX, y: pt.clientY };
    };

    const onUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      document.body.classList.remove('grabbing');
      this.coastThenSnap();
      
      // Detect Clicks (differentiate from drags)
      const pt = e.changedTouches ? e.changedTouches[0] : e;
      const dist = Math.hypot(pt.clientX - this.dragStart.x, pt.clientY - this.dragStart.y);
      const timeDiff = Date.now() - this.dragStart.time;
      if (dist < 10 && timeDiff < 400) {
        this.handleCubeClick(pt);
      }
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);

    // Scroll wheel
    let wheelLock = false;
    window.addEventListener('wheel', (e) => {
      if (this.is2DMode && this.faceNames[this.currentFace] === 'LIVE SETS') {
          const expandedHeight = this.expandedTrackIndex !== -1 && this.mixes[this.expandedTrackIndex].tracklist 
                                 ? this.mixes[this.expandedTrackIndex].tracklist.length * 30 + 20 : 0;
          const maxScroll = Math.max(0, (this.mixes.length * 70) + expandedHeight - 700);
          this.targetListScrollY += e.deltaY;
          if (this.targetListScrollY < 0) this.targetListScrollY = 0;
          if (this.targetListScrollY > maxScroll) this.targetListScrollY = maxScroll;
          e.preventDefault(); 
          return;
      }
      if (wheelLock) return;
      wheelLock = true;
      setTimeout(() => (wheelLock = false), 700);
      if (this.is2DMode) this.exit2DMode();
      this.stepFace(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { if (this.is2DMode) this.exit2DMode(); this.stepFace(1); }
      else if (e.key === 'ArrowLeft') { if (this.is2DMode) this.exit2DMode(); this.stepFace(-1); }
      else if (e.key === 'Escape' && this.is2DMode) this.exit2DMode();
      else if (e.key === 'Enter' && !this.is2DMode) this.enter2DMode();
    });

    // Face dots
    document.querySelectorAll('.face-dot').forEach((dot) => {
      dot.addEventListener('click', () => this.gotoFace(parseInt(dot.dataset.face)));
    });

    // Prev/Next
    document.getElementById('prevBtn').addEventListener('click', () => this.stepFace(-1));
    document.getElementById('nextBtn').addEventListener('click', () => this.stepFace(1));

    // Face name click → 2D mode
    document.getElementById('faceName').addEventListener('click', () => {
      if (this.is2DMode) {
        this.exit2DMode();
      } else {
        this.enter2DMode();
      }
    });
  }

  // ════════════════════════════════════
  //  AUDIO & RAYCASTING
  // ════════════════════════════════════
  handleCubeClick(pt) {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    pointer.x = (pt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(pt.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(pointer, this.camera);
    const intersects = raycaster.intersectObject(this.cube);
    if (intersects.length > 0) {
      const faceIndexBox = Math.floor(intersects[0].faceIndex / 2);
      const boxMap = [1, 3, 4, 5, 0, 2];
      const clickedFace = boxMap[faceIndexBox];
      
      if (clickedFace === 2) {
        const uv = intersects[0].uv;
        const texX = uv.x * 1024;
        const texY = (1 - uv.y) * 1024;
        
        let clickedPlaylist = false;
        let startY = 200;
        for (let i = 0; i < this.mixes.length; i++) {
          const m = this.mixes[i];
          const isExpanded = this.expandedTrackIndex === i;
          const expandedHeight = (isExpanded && m.tracklist) ? m.tracklist.length * 30 + 20 : 0;
          
          if (texX > 80 && texX < 500 && texY >= 180 && texY <= 900) {
            const adjustedTexY = texY + Math.floor(this.listScrollY);
            
            // 1. Header Click (Expand/Play)
            if (adjustedTexY > startY - 20 && adjustedTexY < startY + 50) {
               if (texX >= 430) {
                   this.expandedTrackIndex = isExpanded ? -1 : i;
                   if (this.expandedTrackIndex === i) this.loadRemoteTracklist(i);
                   this.redrawLiveSetsFull();
               } else {
                   this.playTrack(i);
               }
               clickedPlaylist = true;
               break;
            }
            
            // 2. Tracklist Item Click (Seek)
            if (isExpanded && adjustedTexY > startY + 50 && adjustedTexY < startY + 50 + expandedHeight) {
                const itemIdx = Math.floor((adjustedTexY - startY - 50) / 30);
                const track = m.tracklist[itemIdx];
                if (track && typeof track === 'object' && track.time !== undefined) {
                    if (this.currentTrackIndex !== i) this.playTrack(i);
                    this.audio.currentTime = track.time;
                    this.showToast(`Seeking to ${track.timestamp}`);
                    this.paintFace(2);
                }
                clickedPlaylist = true;
                break;
            }
          }
          startY += 70 + expandedHeight;
        }
        
        // Timeline clicks: x: 550 - 950, y: 760 - 840 (moved to right side)
        if (!clickedPlaylist && this.audio && this.currentTrackIndex !== -1) {
          if (texX > 530 && texX < 970 && texY > 760 && texY < 840) {
            const pct = Math.max(0, Math.min(1, (texX - 550) / 400));
            const dur = this.audio.duration;
            if (dur && !isNaN(dur)) {
               this.audio.currentTime = dur * pct;
               if (this.audio.paused) this.playTrack(this.currentTrackIndex);
               this.drawTimeline();
            }
          }
        }
      } else if (clickedFace === 3) { // STUDIO
        const uv = intersects[0].uv;
        const texX = uv.x * 1024;
        const texY = (1 - uv.y) * 1024;
        for (let i = 0; i < 5; i++) {
          const y = 320 + i * 110;
          if (texX > 64 && texX < 960 && texY > y - 10 && texY < y + 75) {
            this.gearStates[i] = !this.gearStates[i];
            this.paintFace(3); 
            this.showToast(`${this.gearStates[i] ? 'Powered on' : 'Powered off'} module ${i+1}`);
            break;
          }
        }
      } else if (clickedFace === 4) { // SOCIAL
        const uv = intersects[0].uv;
        const texX = uv.x * 1024;
        const texY = (1 - uv.y) * 1024;
        const socials = [
          'https://soundcloud.com/airdox',
          'https://mixcloud.com/Airdox',
          'https://instagram.com/airdox_bln',
          'mailto:airdox82@gmail.com'
        ];
        for (let i = 0; i < 4; i++) {
          const y = 300 + i * 135;
          if (texX > 64 && texX < 960 && texY > y - 20 && texY < y + 105) {
            window.open(socials[i], '_blank');
            break;
          }
        }
      } else if (clickedFace === 5) { // BOOKING
        const uv = intersects[0].uv;
        const texX = uv.x * 1024;
        const texY = (1 - uv.y) * 1024;
        // Button area: x: 64 to 960, y: 790 to 854
        if (texX > 64 && texX < 960 && texY > 790 && texY < 854) {
          this.showToast("Request Sending...");
          setTimeout(() => {
            this.showToast("Success! Request Sent.");
            window.location.href = 'mailto:airdox82@gmail.com';
          }, 1200);
        }
      }
    }
  }

  playTrack(index) {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous"; // Important for WebAudio CORS
      this.audio.style.display = 'none';
      document.body.appendChild(this.audio); 
      
      // Setup Analyser
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.source = this.audioCtx.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      }
    }
    
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    
    if (this.currentTrackIndex === index) {
      if (this.audio.paused) {
         this.audio.play().catch(e => console.error("Audio pause toggle blocked:", e));
      } else {
         this.audio.pause();
      }
      this.redrawLiveSetsFull();
      this.renderEqualizer();
      this.updateGlobalPlayer();
      return;
    }
    
    this.currentTrackIndex = index;
    const track = this.mixes[index];
    this.audio.src = track.src; 
    
    // Play immediately so Mobile Safari accepts it as a synchronous user gesture
    this.audio.play()
      .then(() => {
        this.redrawLiveSetsFull();
        this.updateGlobalPlayer();
      })
      .catch(e => console.error("Audio Play blocked:", e));
      
    // Sync with global stats API asynchronously afterwards
    if (track.id) {
      fetch('https://airdox.pages.dev/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: track.id, type: 'play' }),
        mode: 'cors'
      }).catch(err => console.log('Stats sync error:', err));
    }

    this.redrawLiveSetsFull();
    this.updateGlobalPlayer();
    
    // Increment Stats
    this.stats.totalPlays++;
    this.saveStats();
    this.showToast(`Now Playing: ${track.name}`);
  }

  loadStats() {
    const saved = localStorage.getItem('airdox_stats');
    if (saved) return JSON.parse(saved);
    return { totalPlays: 0, completions: 0 };
  }

  saveStats() {
    localStorage.setItem('airdox_stats', JSON.stringify(this.stats));
  }

  showToast(text) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    container.appendChild(toast);
    
    // Reflow
    toast.offsetHeight;
    toast.classList.add('visible');
    
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  async loadRemoteTracklist(index) {
    const mix = this.mixes[index];
    if (!mix || this.loadingIndices.has(index) || (mix.tracklist && mix.tracklist.some(t => typeof t === 'object'))) return;

    this.loadingIndices.add(index);
    this.paintFace(2);

    try {
      // First try local /data/ folder
      const response = await fetch(`./data/tracklist_${mix.id}.json`);
      if (response.ok) {
        const data = await response.json();
        if (data.tracklist) {
          mix.tracklist = data.tracklist;
          this.showToast(`Synced Tracklist for ${mix.name}`);
        }
      } else {
        // Fallback: Check R2 directly? (Assuming public access for JSONs)
        const AUDIO_BASE = 'https://pub-c65c35191de241338a08b07b45f1495f.r2.dev/public';
        const r2Res = await fetch(`${AUDIO_BASE}/tracklist_${mix.id}.json`);
        if (r2Res.ok) {
           const r2Data = await r2Res.json();
           mix.tracklist = r2Data.tracklist;
           this.showToast(`Fetched R2 Tracklist`);
        }
      }
    } catch (e) {
      console.warn("Could not load tracklist sidecar:", e);
    } finally {
      this.loadingIndices.delete(index);
      this.paintFace(2);
    }
  }

  drawTimeline() {
    if (!this.liveCtx || !this.audio || this.currentTrackIndex === -1) return;
    const ctx = this.liveCtx;
    const W = 1024;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2); // default power of two scale

    // Clear local rect on the right side for Visualizer and Timeline
    ctx.clearRect(530, 200, 460, 750);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(530, 200, 460, 750);
    
    const grad = ctx.createLinearGradient(0, 0, W, W);
    grad.addColorStop(0, 'rgba(0,212,255,0.06)');
    grad.addColorStop(1, 'rgba(255,0,170,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(530, 200, 460, 750);

    const x = 550;
    const y = 800; // timeline at bottom of right side
    const w = 400; 
    const h = 8;
    
    const cur = this.audio.currentTime || 0;
    const dur = this.audio.duration || 1;
    const pct = cur / dur;

    // Draw Radial Visualizer On Face
    if (this.freqData) {
      const cx = 750;
      const cy = 480;
      const rBase = 120;
      const numBars = 80;
      const angleStep = (Math.PI * 2) / numBars;
      
      let sumBass = 0;
      for (let i = 0; i < 6; i++) sumBass += this.freqData[i];
      let bassIntensity = Math.pow(sumBass / (6 * 255), 2);
      
      ctx.beginPath();
      ctx.arc(cx, cy, rBase, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 + bassIntensity * 0.3})`;
      ctx.stroke();

      ctx.lineCap = 'round';
      const t = this.clock.getElapsedTime();
      for (let i = 0; i < numBars; i++) {
          const freqIndex = Math.floor(i * (150 / numBars));
          const val = Math.max(0, (this.freqData[freqIndex] - 10) / 245.0); 
          const rStart = rBase + 10;
          const rEnd = rStart + val * 160; 
          const angle = i * angleStep - Math.PI/2 + (t * 0.1); 
          
          ctx.beginPath();
          ctx.moveTo(cx + rStart * Math.cos(angle), cy + rStart * Math.sin(angle));
          ctx.lineTo(cx + rEnd * Math.cos(angle), cy + rEnd * Math.sin(angle));
          
          ctx.lineWidth = 6;
          if (val > 0.8) {
             ctx.strokeStyle = '#00ffea'; 
             ctx.shadowColor = '#00ffea';
          } else if (val > 0.4) {
             ctx.strokeStyle = '#ff00aa'; 
             ctx.shadowColor = '#ff00aa';
          } else {
             ctx.strokeStyle = '#00d4ff'; 
             ctx.shadowColor = '#00d4ff';
          }
          ctx.shadowBlur = 10;
          ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // Track name (centered above timeline)
    ctx.textAlign = 'center';
    ctx.font = '700 24px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.mixes[this.currentTrackIndex].name, 750, y - 40);

    // Background track
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(200,205,216,0.1)';
    ctx.fillRect(x, y, w, h);
    
    // Filled track
    ctx.fillStyle = '#ff00aa';
    ctx.shadowColor = '#ff00aa';
    ctx.shadowBlur = 10;
    ctx.fillRect(x, y, w * pct, h);
    ctx.shadowBlur = 0;
    
    // Handle
    ctx.beginPath();
    ctx.arc(x + w * pct, y + h/2, 10, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Time text
    const format = (t_val) => {
       if (isNaN(t_val) || !isFinite(t_val)) return "00:00";
       let m = Math.floor(t_val / 60);
       let s = Math.floor(t_val % 60);
       return (m < 10 ? '0'+m : m) + ':' + (s < 10 ? '0'+s : s);
    };
    
    ctx.font = '300 18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e0e4ec';
    ctx.fillText(format(cur), x, y + 40);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8890a0';
    ctx.fillText(format(dur), x + w, y + 40);
    
    ctx.restore();
    if (this.liveTexture) this.liveTexture.needsUpdate = true;
  }

  renderEqualizer() {
    if (!this.bgCtx || !this.freqData) return;
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;
    
    // Clear global background
    ctx.clearRect(0, 0, w, h);
    
    // Check if audio is running, otherwise don't draw
    if(!this.audio || this.audio.paused) return;

    const cx = w / 2;
    const cy = h / 2;
    const rBase = Math.min(w, h) * 0.35; // Massive radial centered in background

    ctx.save();
    ctx.translate(cx, cy);

    // freqData already populated in tick() — no duplicate call

    const numBars = 120; // More bars for full background
    const angleStep = (Math.PI * 2) / numBars;

    ctx.lineCap = 'round';
    
    let sumBass = 0;
    for (let i = 0; i < 6; i++) sumBass += this.freqData[i];
    let bassIntensity = Math.pow(sumBass / (6 * 255), 2);

    // Inner glowing ring
    ctx.beginPath();
    ctx.arc(0, 0, rBase, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 + bassIntensity * 0.3})`;
    ctx.stroke();

    for (let i = 0; i < numBars; i++) {
        const freqIndex = Math.floor(i * (150 / numBars));
        const val = Math.max(0, (this.freqData[freqIndex] - 10) / 245.0); 
        
        const rStart = rBase + 10;
        const rEnd = rStart + val * (Math.min(w, h) * 0.35); // Shoot outward towards screen edges
        
        const angle = i * angleStep - Math.PI/2 + (this.clock.getElapsedTime() * 0.1); // Slow rotation
        
        ctx.beginPath();
        ctx.moveTo(rStart * Math.cos(angle), rStart * Math.sin(angle));
        ctx.lineTo(rEnd * Math.cos(angle), rEnd * Math.sin(angle));
        
        ctx.lineWidth = 10;
        if (val > 0.8) {
           ctx.strokeStyle = '#00ffea'; 
           ctx.shadowColor = '#00ffea';
        } else if (val > 0.4) {
           ctx.strokeStyle = '#ff00aa'; 
           ctx.shadowColor = '#ff00aa';
        } else {
           ctx.strokeStyle = '#00d4ff'; 
           ctx.shadowColor = '#00d4ff';
        }
        ctx.shadowBlur = 20;
        ctx.stroke();
    }
    
    ctx.restore();
  }

  coastThenSnap() {
    const coast = { vx: this.velocity.x, vy: this.velocity.y };
    gsap.to(coast, {
      vx: 0, vy: 0, duration: 0.5, ease: 'power2.out',
      onUpdate: () => {
        this.cube.rotation.x += coast.vx;
        this.cube.rotation.y += coast.vy;
        this.cube.rotation.x = Math.max(-1.4, Math.min(1.4, this.cube.rotation.x));
      },
      onComplete: () => this.snapToNearest(),
    });
  }

  stepFace(dir) {
    let next = this.currentFace + dir;
    if (next < 0) next = 5;
    if (next > 5) next = 0;
    this.gotoFace(next);
  }

  gotoFace(index, auto2d = false) {
    this.currentFace = index;
    const target = this.faceAngles[index];

    // Shortest path to plain rotation angle
    let diff = target.y - this.cube.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    let baseTy = this.cube.rotation.y + diff;

    if (this.snapAnim) this.snapAnim.kill();
    
    if (auto2d) {
      this.is2DMode = true;
      this.snapAnim = gsap.timeline();
      this.snapAnim.to(this.cube.rotation, { x: target.x, y: baseTy, duration: 1.2, ease: 'expo.out' }, 0);
      this.snapAnim.to(this.camera.position, { z: 3.2, duration: 1.2, ease: 'expo.out' }, 0);
      
      gsap.to(this.lightIntensity, { ambient: 2.2, point: 0, duration: 1.2, ease: 'expo.out' });
      
      document.getElementById('mode-2d-overlay').classList.add('active');
      document.getElementById('mode2dHint').classList.add('visible');
      document.getElementById('ui-layer').classList.add('hidden');
      const hero = document.getElementById('heroTitle');
      if (hero) hero.classList.add('hidden');
    } else {
      const tx = target.x + this.tiltX;
      const ty = baseTy + this.tiltY;
      this.snapAnim = gsap.to(this.cube.rotation, {
        x: tx, y: ty, duration: 1.2, ease: 'expo.out',
      });
    }

    this.updateUI(index);
  }

  updateUI(index) {
    document.getElementById('faceName').textContent = this.faceNames[index];
    document.querySelectorAll('.face-dot').forEach((dot) => {
      dot.classList.toggle('active', parseInt(dot.dataset.face) === index);
    });
    document.querySelectorAll('.nav-overlay button').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.face) === index);
    });
  }

  snapToNearest() {
    let best = 0, bestDist = Infinity;
    const rx = this.cube.rotation.x - this.tiltX;
    const ry = this.cube.rotation.y - this.tiltY;
    this.faceAngles.forEach((a, i) => {
      let dy = ry - a.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const dx = rx - a.x;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = i; }
    });
    this.gotoFace(best);
  }

  // ════════════════════════════════════
  //  CURSOR
  // ════════════════════════════════════
  initCursor() {
    const cur = document.getElementById('cur');
    const ring = document.getElementById('cur-ring');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + 'px'; cur.style.top = my + 'px';
      this.targetMouse = { 
        x: (mx / window.innerWidth) * 2 - 1, 
        y: -(my / window.innerHeight) * 2 + 1 
      };
    });

    const followRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(followRing);
    };
    followRing();

    document.querySelectorAll('button, a').forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
    });
  }

  // ════════════════════════════════════
  //  LOADER
  // ════════════════════════════════════
  // ════════════════════════════════════
  //  C4: CINEMATIC INTRO ANIMATION
  // ════════════════════════════════════
  runLoader() {
    const bar = document.getElementById('loaderBar');
    const pct = document.getElementById('loaderPct');
    
    // Hide cube during intro
    this.cube.visible = false;
    if (this.reflectionPlane) this.reflectionPlane.visible = false;
    if (this.edgeLines) this.edgeLines.visible = false;
    this.camera.position.set(0, 0, 20); // Start far away
    
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 14 + 6;
      if (p >= 100) {
        p = 100; clearInterval(iv);
        
        // Phase 1: Fade out loader
        setTimeout(() => {
          document.getElementById('loader').classList.add('done');
          
          // Phase 2: Reveal cube with cinematic entrance
          setTimeout(() => this.playCinematicIntro(), 300);
        }, 400);
      }
      bar.style.width = p + '%'; pct.textContent = Math.floor(p) + '%';
    }, 60);
  }

  playCinematicIntro() {
    // Make cube visible but tiny
    this.cube.visible = true;
    if (this.reflectionPlane) this.reflectionPlane.visible = true;
    if (this.edgeLines) this.edgeLines.visible = true;
    
    this.cube.scale.set(0, 0, 0);
    this.cube.rotation.set(Math.PI * 2, Math.PI * 4, 0);
    
    // Particles burst outward
    if (this.particles) {
      this.particles.material.opacity = 0;
      gsap.to(this.particles.material, { opacity: 0.35, duration: 2, ease: 'power2.inOut' });
    }
    
    // Edge lines glow during intro
    if (this.edgeLines) {
      this.edgeLines.material.opacity = 1;
      gsap.to(this.edgeLines.material, { opacity: 0.25, duration: 2.5, delay: 0.5, ease: 'power2.out' });
    }
    
    // Dynamic bloom spike during entrance  
    if (this.bloomPass) {
      this.bloomPass.strength = 2.0;
      gsap.to(this.bloomPass, { strength: 0.4, duration: 2.5, ease: 'power3.out' });
    }
    
    // Main timeline: cube materializes
    const tl = gsap.timeline();
    
    // Camera swoops in from far away
    tl.to(this.camera.position, {
      z: this.defaultCameraZ, duration: 2.5, ease: 'expo.out'
    }, 0);
    
    // Cube scales up and rotates into position
    tl.to(this.cube.scale, {
      x: 1, y: 1, z: 1, duration: 2, ease: 'elastic.out(1, 0.6)'
    }, 0.2);
    
    tl.to(this.cube.rotation, {
      x: this.tiltX, y: this.tiltY, duration: 2.5, ease: 'expo.out'
    }, 0.1);
    
    // Reflection plane fades in
    if (this.reflectionPlane) {
      this.reflectionPlane.material.opacity = 0;
      tl.to(this.reflectionPlane.material, {
        opacity: 0.4, duration: 1.5, ease: 'power2.inOut'
      }, 0.8);
    }
    
    // Trigger a final glitch burst at end of intro
    tl.call(() => {
      if (this.glitchPass) {
        this._glitchActive = true;
        this._glitchDuration = 0.3;
      }
    }, null, 1.8);
  }

  initBgVisualizer() {
    this.bgCanvas = document.getElementById('bg-visualizer');
    if(this.bgCanvas) {
      this.bgCtx = this.bgCanvas.getContext('2d');
      this.bgCanvas.width = window.innerWidth;
      this.bgCanvas.height = window.innerHeight;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    if(this.bgCanvas) {
      this.bgCanvas.width = Math.floor(window.innerWidth * 0.5);
      this.bgCanvas.height = Math.floor(window.innerHeight * 0.5);
    }
  }

  // ════════════════════════════════════
  //  RENDER LOOP
  // ════════════════════════════════════
  tick() {
    requestAnimationFrame(() => this.tick());
    const t = this.clock.getElapsedTime();

    // Smooth Canvas Scrolling
    if (Math.abs(this.listScrollY - this.targetListScrollY) > 0.5) {
       this.listScrollY += (this.targetListScrollY - this.listScrollY) * 0.1;
       if (this.is2DMode && this.faceNames[this.currentFace] === 'LIVE SETS') {
           this.redrawLiveSetsFull();
       }
    }

    // Idle drift & Parallax (only in 3D mode)
    if (!this.isDragging && !this.is2DMode && !(this.snapAnim && this.snapAnim.isActive())) {
      this.cube.rotation.y += 0.0006;
      
      // Camera parallax
      this.camera.position.x += (this.targetMouse.x * 0.4 - this.camera.position.x) * 0.05;
      this.camera.position.y += (this.targetMouse.y * 0.4 - this.camera.position.y) * 0.05;
      this.camera.lookAt(0, 0, 0);
    }
    
    // Ambient Background Parallax
    const amb = document.querySelector('.ambient');
    if (amb) amb.style.transform = `translate(${this.targetMouse.x * -25}px, ${this.targetMouse.y * -25}px)`;

    // Particles Parallax
    if (this.particles) {
      this.particles.rotation.y = t * 0.02 + this.targetMouse.x * 0.15;
      this.particles.rotation.x = Math.sin(t * 0.1) * 0.1 - this.targetMouse.y * 0.15;
    }

    // Audio-mock light pulse & lighting transition
    let bass = 0;
    const playing = this.audio && !this.audio.paused;
    
    if (playing) {
      // Get Real Frequency Data
      if (this.analyser) {
          this.analyser.getByteFrequencyData(this.freqData);
      } else {
          // Fallback to mock if analyser failed to init
          for(let i = 0; i < this.freqData.length; i++) {
              this.freqData[i] = (Math.sin(t * 8 + i * 0.2) * 0.5 + 0.5) * 128 + (Math.random() * 80);
          }
      }
      
      this.renderEqualizer(); // Background Fullscreen Visualizer
      
      let sum = 0;
      for (let i = 0; i < 6; i++) sum += this.freqData[i];
      bass = (sum / 6) / 255;
      bass = Math.pow(bass, 3) * 1.5; 
      
      this.updateGlobalPlayer(); // Keep UI in sync
      if (this.currentFace === 2 && this.is2DMode) {
          this.drawTimeline();
      }
    } else {
      bass = Math.sin(t * 3) * 0.2 + 0.2; // Idle pulse
    }

    // Update global player strip
    if (playing) this.updateGlobalPlayer();

    // Dynamic bloom on bass
    if (this.bloomPass) {
      this.bloomPass.strength = playing ? 0.3 + bass * 1.2 : 0.4;
    }
    
    if (this.ambientLight) {
        this.ambientLight.intensity = this.lightIntensity.ambient;
    }
    
    if (playing) {
      // Disco Lights: Color changing
      const hue1 = (t * 0.2) % 1;
      const hue2 = (t * 0.2 + 0.3) % 1;
      const hue3 = (t * 0.2 + 0.6) % 1;
      this.blueLight.color.setHSL(hue1, 1, 0.5);
      this.pinkLight.color.setHSL(hue2, 1, 0.5);
      this.purpleLight.color.setHSL(hue3, 1, 0.5);
      
      this.blueLight.intensity = (1.5 + bass * 5) * this.lightIntensity.point;
      this.pinkLight.intensity = (1.0 + bass * 4) * this.lightIntensity.point;
      this.purpleLight.intensity = (1.0 + bass * 3) * this.lightIntensity.point;
    } else {
      // Cyberpunk default lights
      this.blueLight.color.setHex(0x00d4ff);
      this.pinkLight.color.setHex(0xff00aa);
      this.purpleLight.color.setHex(0x9d00ff);
      
      this.blueLight.intensity = (2.5 + bass * 2) * this.lightIntensity.point;
      this.pinkLight.intensity = (1.5 + (0.4 - bass) * 1.5) * this.lightIntensity.point;
      this.purpleLight.intensity = 1.2 * this.lightIntensity.point;
    }

    // C3: Bass-reactive particles
    if (this.particles && this._particleBasePositions) {
      const positions = this.particles.geometry.attributes.position.array;
      const base = this._particleBasePositions;
      const expand = playing ? 1.0 + bass * 0.8 : 1.0;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = base[i * 3] * expand;
        positions[i * 3 + 1] = base[i * 3 + 1] * expand;
        positions[i * 3 + 2] = base[i * 3 + 2] * expand;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.material.size = playing ? 0.03 + bass * 0.06 : 0.03;
      this.particles.material.opacity = playing ? 0.25 + bass * 0.5 : 0.35;
    }

    // C2: Glitch timing — random bursts every 5-8 seconds
    if (this.glitchPass) {
      const dt = this.clock.getDelta ? 1/60 : 1/60; // approximate
      this.glitchPass.uniforms.uTime.value = t;
      
      if (this._glitchActive) {
        this._glitchDuration -= 0.016;
        const intensity = Math.max(0, this._glitchDuration / 0.3);
        this.glitchPass.uniforms.uIntensity.value = intensity * (0.5 + Math.random() * 0.5);
        if (this._glitchDuration <= 0) {
          this._glitchActive = false;
          this.glitchPass.uniforms.uIntensity.value = 0;
          this._glitchTimer = 5 + Math.random() * 3; // Next glitch in 5-8s
        }
      } else {
        this._glitchTimer -= 0.016;
        if (this._glitchTimer <= 0) {
          this._glitchActive = true;
          this._glitchDuration = 0.15 + Math.random() * 0.2; // 150-350ms burst
        }
      }
    }

    if (this.edgeLines) {
        this.edgeLines.material.opacity = (0.15 + bass * 0.2) * this.lightIntensity.point;
    }

    // Progress bar
    const prog = ((this.cube.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    document.getElementById('progress-bar').style.width = (prog / (Math.PI * 2)) * 100 + '%';

    this.composer.render();
  }
}
