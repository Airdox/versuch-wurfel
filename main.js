import * as THREE from 'three';
import { gsap } from 'gsap';

document.fonts.ready.then(() => new AirdoxCube());

class AirdoxCube {
  constructor() {
    this.container = document.getElementById('scene-container');
    this.scene = new THREE.Scene();

    this.currentFace = 0;
    this.faceNames = ['IDENTITY', 'ABOUT', 'LIVE SETS', 'GIGS', 'SOCIAL', 'BOOKING'];
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

    this.faceAngles = [
      { x: 0, y: 0 },
      { x: 0, y: -Math.PI / 2 },
      { x: 0, y: -Math.PI },
      { x: 0, y: Math.PI / 2 },
      { x: Math.PI / 2, y: 0 }, // 4: SOCIAL (+Y Face)
      { x: -Math.PI / 2, y: 0 }, // 5: BOOKING (-Y Face)
    ];

    this.tiltX = -0.28;
    this.tiltY = 0.35;

    this.initRenderer();
    this.initCamera();
    this.initLights();
    this.initParticles();
    this.initCube();
    this.initInteraction();
    this.initHamburger();
    this.initCursor();
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
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
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
    const materials = [];
    for (let i = 0; i < 6; i++) {
      materials.push(new THREE.MeshPhysicalMaterial({
        map: this.paintFace(i),
        roughness: 0.15, metalness: 0.6,
        clearcoat: 0.4, clearcoatRoughness: 0.2,
        transparent: true, opacity: 0.97,
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

    this.cube.rotation.x = this.tiltX;
    this.cube.rotation.y = this.tiltY;
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
    const labels = ['IDENTITY', 'ABOUT', 'LIVE SETS', 'GIGS', 'SOCIAL', 'BOOKING'];
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
      case 3: this.drawGigs(ctx, W); break;
      case 4: this.drawSocial(ctx, W); break;
      case 5: this.drawBooking(ctx, W); break;
    }

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
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
  }

  drawAbout(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('About', 64, 170);

    ctx.font = '300 30px Outfit, sans-serif';
    ctx.fillStyle = '#c0c8d8';
    ['AIRDOX navigiert durch die', 'dunklen Korridore von Techno,', 'Industrial und hypnotischen', 'Maschinenrhythmen.', '', 'Keine Labels. Keine Regeln.', 'Nur Frequenzen.'].forEach((l, i) => ctx.fillText(l, 64, 290 + i * 50));

    const stats = [['6+', 'YEARS'], ['138', 'AVG BPM'], ['40+', 'SETS'], ['8', 'CITIES']];
    stats.forEach(([val, lbl], i) => {
      const x = 64 + i * 220;
      ctx.font = '900 52px Orbitron, sans-serif';
      const sg = ctx.createLinearGradient(x, 700, x + 80, 750);
      sg.addColorStop(0, '#00d4ff'); sg.addColorStop(1, '#ff00aa');
      ctx.fillStyle = sg;
      ctx.fillText(val, x, 700);
      ctx.font = '400 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8890a0';
      ctx.fillText(lbl, x, 768);
    });
  }

  drawLiveSets(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#00ffea';
    ctx.fillText('Live Sets', 64, 170);

    const mixes = [
      { name: 'VOID TRANSMISSION 009', meta: '2025  ·  1:58:00' },
      { name: 'DARK MATTER — LIVE', meta: 'Tresor 2024  ·  2:14:30' },
      { name: 'SUBTERRANEAN CURRENTS', meta: '2024  ·  1:42:15' },
      { name: 'FREQUENCY COLLAPSE', meta: '2023  ·  1:28:44' },
      { name: 'AIRDOX @ BERGHAIN', meta: '2023  ·  3:05:00' },
    ];

    mixes.forEach((m, i) => {
      const y = 300 + i * 115;
      ctx.beginPath(); ctx.arc(90, y + 20, 20, 0, Math.PI * 2);
      ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(84, y + 8); ctx.lineTo(84, y + 32); ctx.lineTo(102, y + 20); ctx.closePath();
      ctx.fillStyle = '#00d4ff'; ctx.fill();

      ctx.font = '600 28px Outfit, sans-serif'; ctx.fillStyle = '#e0e4ec'; ctx.fillText(m.name, 130, y);
      ctx.font = '300 20px "JetBrains Mono", monospace'; ctx.fillStyle = '#8890a0'; ctx.fillText(m.meta, 130, y + 38);

      for (let b = 0; b < 18; b++) {
        const bh = Math.random() * 32 + 4;
        ctx.fillStyle = `rgba(0,212,255,${0.2 + Math.random() * 0.4})`;
        ctx.fillRect(760 + b * 13, y + 20 - bh / 2, 5, bh);
      }
      ctx.fillStyle = 'rgba(200,205,216,0.06)'; ctx.fillRect(64, y + 85, W - 128, 1);
    });
  }

  drawGigs(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#ff00aa';
    ctx.fillText('Upcoming', 64, 170);

    const gigs = [
      { date: ['MAI', '02'], venue: 'Berghain', city: 'Berlin, DE' },
      { date: ['MAI', '18'], venue: 'Tresor', city: 'Berlin, DE' },
      { date: ['JUN', '07'], venue: 'De School', city: 'Amsterdam, NL' },
      { date: ['JUN', '21'], venue: 'Fabric', city: 'London, UK' },
    ];

    gigs.forEach((g, i) => {
      const y = 300 + i * 135;
      ctx.fillStyle = 'rgba(255,0,170,0.1)'; ctx.fillRect(64, y - 10, 95, 85);
      ctx.strokeStyle = 'rgba(255,0,170,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(64, y - 10, 95, 85);
      ctx.font = '400 20px "JetBrains Mono", monospace'; ctx.fillStyle = '#ff00aa'; ctx.textAlign = 'center';
      ctx.fillText(g.date[0], 111, y + 8);
      ctx.font = '700 40px Orbitron, sans-serif'; ctx.fillText(g.date[1], 111, y + 46);
      ctx.textAlign = 'left';
      ctx.font = '600 34px Outfit, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(g.venue, 195, y + 8);
      ctx.font = '300 22px "JetBrains Mono", monospace'; ctx.fillStyle = '#8890a0'; ctx.fillText(g.city, 195, y + 52);
      ctx.strokeStyle = 'rgba(200,205,216,0.15)'; ctx.strokeRect(780, y + 8, 170, 48);
      ctx.font = '400 18px "JetBrains Mono", monospace'; ctx.fillStyle = '#8890a0'; ctx.textAlign = 'center';
      ctx.fillText('TICKETS →', 865, y + 26); ctx.textAlign = 'left';
    });
  }

  drawSocial(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#9d00ff';
    ctx.fillText('Follow', 64, 170);

    const socials = [
      { icon: '☁', name: 'SoundCloud', handle: 'soundcloud.com/airdox' },
      { icon: '📷', name: 'Instagram', handle: '@airdox.berlin' },
      { icon: '𝕗', name: 'Facebook', handle: 'fb.com/airdoxberlin' },
      { icon: '🎵', name: 'Mixcloud', handle: 'mixcloud.com/airdox' },
    ];

    socials.forEach((s, i) => {
      const y = 300 + i * 135;
      ctx.fillStyle = 'rgba(200,205,216,0.04)'; ctx.fillRect(64, y - 10, W - 128, 105);
      ctx.strokeStyle = 'rgba(200,205,216,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(64, y - 10, W - 128, 105);
      ctx.font = '36px serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(s.icon, 90, y + 18);
      ctx.font = '600 30px "JetBrains Mono", monospace'; ctx.fillStyle = '#ffffff'; ctx.fillText(s.name, 160, y + 8);
      ctx.font = '300 22px "JetBrains Mono", monospace'; ctx.fillStyle = '#8890a0'; ctx.fillText(s.handle, 160, y + 52);
      ctx.font = '400 30px sans-serif'; ctx.fillStyle = '#9d00ff'; ctx.textAlign = 'right'; ctx.fillText('→', W - 90, y + 22); ctx.textAlign = 'left';
    });
  }

  drawBooking(ctx, W) {
    ctx.font = '700 72px Orbitron, sans-serif';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('Booking', 64, 170);

    const eg = ctx.createLinearGradient(64, 300, 700, 300);
    eg.addColorStop(0, '#00d4ff'); eg.addColorStop(1, '#ff00aa');
    ctx.font = '700 40px Orbitron, sans-serif'; ctx.fillStyle = eg;
    ctx.fillText('booking@airdox.berlin', 64, 300);

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
    this.gotoFace(this.currentFace, true);
  }

  exit2DMode() {
    if (!this.is2DMode) return;
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
      const s = 0.006;
      this.cube.rotation.y += dx * s;
      this.cube.rotation.x += dy * s;
      this.cube.rotation.x = Math.max(-1.4, Math.min(1.4, this.cube.rotation.x));
      this.velocity = { x: dy * s, y: dx * s };
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
      if (wheelLock) return;
      wheelLock = true;
      setTimeout(() => (wheelLock = false), 700);
      if (this.is2DMode) this.exit2DMode();
      this.stepFace(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });

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
      
      // If Live Sets
      if (clickedFace === 2) {
        const uv = intersects[0].uv;
        const texX = uv.x * 1024;
        const texY = (1 - uv.y) * 1024;
        
        for (let i = 0; i < 5; i++) {
          const btnY = 300 + i * 115;
          // Play button area roughly x:60-120, y:btnY..btnY+40
          if (texX > 60 && texX < 140 && texY > btnY && texY < btnY + 40) {
            this.playTrack(i);
            break;
          }
        }
      }
    }
  }

  playTrack(index) {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous";
      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }
    
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    
    if (this.currentTrackIndex === index && !this.audio.paused) {
      this.audio.pause();
      return;
    }
    
    this.currentTrackIndex = index;
    // Royalty Free Platzhalter Audio für den Test
    this.audio.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"; 
    this.audio.play().catch(e => console.log("Audio Play blocked: ", e));
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
  runLoader() {
    const bar = document.getElementById('loaderBar');
    const pct = document.getElementById('loaderPct');
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 14 + 6;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => document.getElementById('loader').classList.add('done'), 400); }
      bar.style.width = p + '%'; pct.textContent = Math.floor(p) + '%';
    }, 60);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ════════════════════════════════════
  //  RENDER LOOP
  // ════════════════════════════════════
  tick() {
    requestAnimationFrame(() => this.tick());
    const t = this.clock.getElapsedTime();

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
    const playing = this.analyser && this.audio && !this.audio.paused;
    
    if (playing) {
      this.analyser.getByteFrequencyData(this.freqData);
      let sum = 0;
      for (let i = 0; i < 6; i++) sum += this.freqData[i];
      bass = (sum / 6) / 255;
      bass = Math.pow(bass, 3) * 1.5; // Enhance kick drum
    } else {
      bass = Math.sin(t * 3) * 0.2 + 0.2; // Idle pulse
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

    if (this.edgeLines) {
        this.edgeLines.material.opacity = (0.15 + bass * 0.2) * this.lightIntensity.point;
    }

    // Progress bar
    const prog = ((this.cube.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    document.getElementById('progress-bar').style.width = (prog / (Math.PI * 2)) * 100 + '%';

    this.renderer.render(this.scene, this.camera);
  }
}
