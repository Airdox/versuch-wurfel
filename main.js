import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

document.fonts.ready.then(() => {
  window.airdox = new AirdoxCube();
});

class AirdoxCube {
  constructor() {
    try {
      this.container = document.getElementById('scene-container');
      this.scene = new THREE.Scene();
      this.currentFace = 0;
      this.faceNames = ['IDENTITY', 'ABOUT', 'LIVE SETS', 'STUDIO', 'SOCIAL', 'BOOKING'];
      this.isDragging = false; this.is2DMode = false;
      this.targetMouse = { x: 0, y: 0 };
      this.audioCtx = null; this.analyser = null; this.audio = null;
      this.currentTrackIndex = -1; this.listScrollY = 0; this.targetListScrollY = 0;
      this.stats = this.loadStats();

      const AUDIO_BASE = 'https://pub-c65c35191de241338a08b07b45f1495f.r2.dev/public';
      this.mixes = [
        { id: 'recording_2026_04_12', name: 'REC 12.04.2026', src: `${AUDIO_BASE}/Airdox_REC_2026_04_12.mp3` },
        { id: 'recording_2026_03_15', name: 'REC 15.03.2026', src: `${AUDIO_BASE}/Airdox_REC_2026_03_15.mp3` },
        { id: 'recording_2026_03_09', name: 'KEINEN GRUND HAT', src: `${AUDIO_BASE}/Airdox_REC_2026_03_09.mp3` },
        { id: 'secret_set_2025_12_22', name: 'SECRET SET', src: `${AUDIO_BASE}/Airdox_Secret_Set_Pirate_Studio_22_12_2025_full.mp3` },
        { id: '2', name: 'OVER AND OUT', src: `${AUDIO_BASE}/Over%20and%20OUt_full.mp3` },
        { id: '3', name: '65', src: `${AUDIO_BASE}/65_full.mp3` },
        { id: '4', name: 'TSCHAU MÄRKISCHE', src: `${AUDIO_BASE}/Airdox_tschau_m%C3%A4rkische_full.mp3` }
      ];

      this.faceAngles = [
        { x: 0, y: 0 }, { x: 0, y: -Math.PI / 2 }, { x: 0, y: -Math.PI },
        { x: 0, y: Math.PI / 2 }, { x: Math.PI / 2, y: 0 }, { x: -Math.PI / 2, y: 0 }
      ];
      this.tiltX = -0.15; this.tiltY = 0.25;

      this.initRenderer(); this.initCamera(); this.initLights(); this.initParticles();
      this.initCube(); this.initPostProcessing(); this.initInteraction();
      this.initHamburger(); this.initUI(); this.initCursor(); this.initBgVisualizer();
      this.runLoader(); this.onResize();
      window.addEventListener('resize', () => this.onResize());
      this.clock = new THREE.Clock(); this.tick();
      setTimeout(() => this.gotoFace(0), 1000);
    } catch (e) {
      console.error("Initialization Error:", e);
      this.runLoader(); // Ensure loader disappears even on error
    }
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);
  }

  initCamera() { 
    this.camera = new THREE.PerspectiveCamera(24, this.container.clientWidth / this.container.clientHeight, 0.1, 100); 
    this.camera.position.set(0, 0, 13); 
  }

  initLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.6));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    // FIXED HEX LITERALS BELOW (0x instead of #)
    const lts = [{ c: 0x00d4ff, i: 10, p: [4, 6, 12] }, { c: 0xff00aa, i: 8, p: [-8, -4, 10] }];
    lts.forEach(l => { const p = new THREE.PointLight(l.c, l.i, 40); p.position.set(...l.p); this.scene.add(p); });
  }

  initParticles() {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(500 * 3);
    for (let i = 0; i < 1500; i++) p[i] = (Math.random() - 0.5) * 50;
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.particles = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.02, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
    this.scene.add(this.particles);
  }

  initCube() {
    const s = 2.4;
    const ms = []; for (let i = 0; i < 6; i++) {
        ms.push(new THREE.MeshPhysicalMaterial({ map: this.paintFace(i), roughness: 0.4, metalness: 0, transparent: true, opacity: 0.99 }));
    }
    const ord = [ms[1], ms[3], ms[4], ms[5], ms[0], ms[2]];
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), ord);
    this.scene.add(this.cube);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.cube.geometry), new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 }));
    this.cube.add(edges);

    const fl = new THREE.Mesh(new THREE.PlaneGeometry(30,30), new THREE.MeshPhysicalMaterial({ color: 0x04040a, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.25 }));
    fl.rotation.x = -Math.PI/2; fl.position.y = -3; this.scene.add(fl);
  }

  initUI() {
    document.getElementById('prevBtn').onclick = () => this.prevFace();
    document.getElementById('nextBtn').onclick = () => this.nextFace();
    document.getElementById('faceName').onclick = () => this.is2DMode ? this.gotoFace(this.currentFace) : this.gotoFace(this.currentFace, true);
    document.querySelectorAll('.face-dot').forEach(d => d.onclick = () => this.gotoFace(parseInt(d.dataset.face)));
  }

  initHamburger() {
    const b = document.getElementById('hamburgerBtn'), o = document.getElementById('navOverlay');
    if(b && o) {
        b.onclick = () => { b.classList.toggle('open'); o.classList.toggle('open'); };
        o.querySelectorAll('button').forEach(btn => btn.onclick = () => { this.gotoFace(parseInt(btn.dataset.face), true); b.classList.remove('open'); o.classList.remove('open'); });
    }
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.container.clientWidth, this.container.clientHeight), 0.9, 0.4, 0.9); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
  }

  paintFace(fi) {
    const C = document.createElement('canvas'); C.width = 1024; C.height = 1024; const x = C.getContext('2d');
    x.fillStyle = '#0a0a14'; x.fillRect(0,0,1024,1024);
    x.strokeStyle = 'rgba(255, 255, 255, 0.05)'; x.lineWidth = 1; x.strokeRect(60,60,904,904);

    x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '900 32px Outfit';
    x.fillText(`${fi+1} // ${this.faceNames[fi]}`, 512, 110);
    
    if (fi === 0) { x.font = '900 130px Outfit'; x.fillText('AIRDOX', 512, 530); x.fillStyle='#00d4ff'; x.fillRect(412, 570, 200, 4); }
    else if (fi === 1) { x.font = '300 42px Outfit'; ['Collective Techno Architecture.','Berlin Underground Culture.','Harmonic Minimalism.'].forEach((l,i)=>x.fillText(l,512,420+i*95)); }
    else if (fi === 2) { this.liveCtx = x; this.drawLiveSets(x); }
    else if (fi === 3) { x.font = '300 42px Outfit'; ['Hardware Synthesis Forge.','Analog Signal Flow.','Industrial Engineering.'].forEach((l,i)=>x.fillText(l,512,420+i*95)); }
    else if (fi === 4) { x.font = '900 80px Outfit'; x.fillText('SOCIAL', 512, 340); x.font = '300 42px Outfit'; ['SOUNDCLOUD','INSTAGRAM','MIXCLOUD'].forEach((l,i)=>x.fillText(l, 512, 500+i*130)); }
    else if (fi === 5) { x.font = '900 100px Outfit'; x.fillText('BOOKING', 512, 450); x.font='300 36px Outfit'; x.fillStyle='#00d4ff'; x.fillText('AIRDOX82@GMAIL.COM', 512, 550); }
    
    const t = new THREE.CanvasTexture(C); t.anisotropy = 16; if (fi === 2) this.liveTexture = t; return t;
  }

  drawLiveSets(x) {
    x.save(); x.beginPath(); x.rect(0, 200, 1024, 824); x.clip(); x.translate(0, -this.listScrollY);
    this.mixes.forEach((m, i) => { x.fillStyle = (this.currentTrackIndex===i)?'#00d4ff':'#fff'; x.font='900 45px Outfit'; x.fillText(m.name, 512, 320 + i * 115); });
    x.restore();
  }

  redrawLiveSetsFull() { this.paintFace(2); this.drawTimeline(); }
  drawTimeline() { if (!this.liveCtx || !this.audio) return; const p = this.audio.duration ? this.audio.currentTime/this.audio.duration : 0; this.liveCtx.fillStyle = 'rgba(255,255,255,0.05)'; this.liveCtx.fillRect(312, 920, 400, 12); this.liveCtx.fillStyle = '#00d4ff'; this.liveCtx.fillRect(312, 920, 400*p, 12); if (this.liveTexture) this.liveTexture.needsUpdate = true; }

  initInteraction() {
    const c = this.renderer.domElement; const getP = (e) => e.touches ? e.touches[0] : e;
    const onD = (e) => { if (e.target.closest('button, .nav-overlay')) return; this.isDragging = true; this.dragStart = { x: getP(e).clientX, y: getP(e).clientY }; this.prevPointer = { ...this.dragStart }; };
    const onM = (e) => { if (!this.isDragging) return; const dx = getP(e).clientX - this.prevPointer.x, dy = getP(e).clientY - this.prevPointer.y; if (this.is2DMode && this.currentFace===2) { this.targetListScrollY = Math.max(0, this.targetListScrollY - dy*2); } else { this.cube.rotation.y += dx*0.005; this.cube.rotation.x += dy*0.005; } this.prevPointer = { x: getP(e).clientX, y: getP(e).clientY }; };
    const onU = (e) => { if (!this.isDragging) return; this.isDragging = false; const d = Math.hypot(getP(e).clientX - this.dragStart.x, getP(e).clientY - this.dragStart.y); if (d < 5) this.handleCubeClick(getP(e)); this.gotoFace(this.currentFace); };
    c.addEventListener('mousedown', onD); window.addEventListener('mousemove', onM); window.addEventListener('mouseup', onU);
    c.addEventListener('touchstart', onD, { passive: true }); window.addEventListener('touchmove', onM, { passive: true }); window.addEventListener('touchend', onU);
  }

  handleCubeClick(pt) {
    const rc = new THREE.Raycaster(); const p = new THREE.Vector2((pt.clientX/window.innerWidth)*2-1, -(pt.clientY/window.innerHeight)*2+1); rc.setFromCamera(p, this.camera); const ints = rc.intersectObject(this.cube);
    if (ints.length > 0) {
      const fi = Math.floor(ints[0].faceIndex / 2), fMap = [1,3,4,5,0,2], cf = fMap[fi], tx = ints[0].uv.x*1024, ty = (1-ints[0].uv.y)*1024;
      if (this.currentFace !== cf) { this.gotoFace(cf); return; }
      if (cf === 2) { for (let i=0; i<this.mixes.length; i++) if (ty+this.listScrollY > 260+i*115 && ty+this.listScrollY < 350+i*115) { this.playTrack(i); break; } }
      else if (cf === 4) window.open('https://soundcloud.com/airdox', '_blank');
      else if (cf === 5 && ty > 800) { window.location.href = 'mailto:airdox82@gmail.com'; }
    }
  }

  playTrack(i) {
    if (!this.audio) { this.audio = new Audio(); this.audio.crossOrigin = "anonymous"; this.ctx = new AudioContext(); this.an = this.ctx.createAnalyser(); this.ctx.createMediaElementSource(this.audio).connect(this.an); this.an.connect(this.ctx.destination); }
    if (this.currentTrackIndex === i) { if (this.audio.paused) this.audio.play(); else this.audio.pause(); } else { this.currentTrackIndex = i; this.audio.src = this.mixes[i].src; this.audio.play(); this.stats.totalPlays++; this.saveStats(); }
    this.redrawLiveSetsFull(); this.updateUI();
  }
  initBgVisualizer() { this.bgC = document.getElementById('bg-visualizer'); this.bgX = this.bgC.getContext('2d'); }
  initCursor() { window.onmousemove = (e) => { const c = document.getElementById('cur'); if(c){ c.style.left = e.clientX+'px'; c.style.top = e.clientY+'px'; } this.targetMouse = { x: (e.clientX/window.innerWidth)*2-1, y: -(e.clientY/window.innerHeight)*2+1 }; }; }
  
  onResize() {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix(); if(this.composer) this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  prevFace() { let n = this.currentFace - 1; if(n < 0) n = 5; this.gotoFace(n); }
  nextFace() { let n = this.currentFace + 1; if(n > 5) n = 0; this.gotoFace(n); }
  
  gotoFace(i, a = false) { this.currentFace = i; this.is2DMode = a; const t = this.faceAngles[i]; gsap.to(this.cube.rotation, { x: t.x + (a ? 0 : this.tiltX), y: t.y + (a ? 0 : this.tiltY), duration: 1.5, ease: 'power2.inOut' }); gsap.to(this.camera.position, { z: a ? 6.5 : 13, duration: 1.5, ease: 'power2.inOut' }); this.updateUI(); }
  updateUI() {
    const fn = document.getElementById('faceName'); if(fn) fn.textContent = this.faceNames[this.currentFace];
    const ds = document.querySelectorAll('.face-dot'); ds.forEach((d,i) => { if(i===this.currentFace) d.classList.add('active'); else d.classList.remove('active'); });
    const s = document.getElementById('statsLabel'); if(s) s.textContent = `AIRDOX // PLAYS: ${this.stats.totalPlays}`;
  }

  loadStats() { try { return JSON.parse(localStorage.getItem('airdox_stats')) || { totalPlays: 0 }; } catch(e){ return { totalPlays: 0 }; } }
  saveStats() { localStorage.setItem('airdox_stats', JSON.stringify(this.stats)); }
  runLoader() { setTimeout(() => { const l = document.getElementById('loader'); if(l) l.classList.add('done'); }, 1500); }

  tick() {
    requestAnimationFrame(() => this.tick()); 
    if (Math.abs(this.listScrollY - this.targetListScrollY) > 1) { this.listScrollY += (this.targetListScrollY - this.listScrollY) * 0.1; this.redrawLiveSetsFull(); }
    if (!this.isDragging && !this.is2DMode) { this.cube.rotation.y += 0.0012; this.camera.position.x += (this.targetMouse.x * 0.4 - this.camera.position.x) * 0.02; this.camera.position.y += (this.targetMouse.y * 0.4 - this.camera.position.y) * 0.02; this.camera.lookAt(0,0,0); }
    if (this.an && this.audio && !this.audio.paused) { const d = new Uint8Array(this.an.frequencyBinCount); this.an.getByteFrequencyData(d); this.bgX.clearRect(0,0,this.bgC.width, this.bgC.height); this.bgX.fillStyle='rgba(0,212,255,0.03)'; for(let i=0; i<64; i++) this.bgX.fillRect(i*30, this.bgC.height, 26, -d[i]*1.5); this.bloom.strength = 1.0 + (d[0]/255)*1.2; }
    this.composer.render();
  }
}
