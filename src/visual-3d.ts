import {LitElement, html, css} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {vs as sphereVertexShader} from './sphere-shader';
import {backdropVertexShader, backdropFragmentShader} from './backdrop-shader';
import {Analyser} from './analyser';

export class Visual3D {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private sphereCamera: THREE.PerspectiveCamera;
  private backdropMesh: THREE.Mesh;
  private sphere: THREE.Mesh;
  private coreMesh: THREE.Mesh;
  private ringMesh: THREE.Mesh;
  private clock: THREE.Clock;
  private analyser?: Analyser;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // 1. Backdrop Setup
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const backdropGeo = new THREE.PlaneGeometry(2, 2);
    const backdropMat = new THREE.ShaderMaterial({
      vertexShader: backdropVertexShader,
      fragmentShader: backdropFragmentShader,
      uniforms: {
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        time: { value: 0 },
      },
      depthWrite: false,
    });
    this.backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    this.scene.add(this.backdropMesh);

    // 2. Perspective Camera for 3D Orb
    const aspect = (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight);
    this.sphereCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.sphereCamera.position.z = 5.5;

    // 3. Inner Glowing Core Orb
    const coreGeo = new THREE.SphereGeometry(1.05, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.85,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.scene.add(this.coreMesh);

    // 4. Outer Deformation Wireframe Orb
    const sphereGeo = new THREE.SphereGeometry(1.45, 128, 128);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });

    sphereMat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.inputData = { value: new THREE.Vector4(0, 0, 0, 0) };
      shader.uniforms.outputData = { value: new THREE.Vector4(0, 0, 0, 0) };
      shader.vertexShader = sphereVertexShader;
      sphereMat.userData.shader = shader;
    };

    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.scene.add(this.sphere);

    // 5. Arc Reactor Orbit Ring
    const ringGeo = new THREE.TorusGeometry(1.9, 0.025, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = Math.PI / 3;
    this.scene.add(this.ringMesh);

    // 6. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x38bdf8, 3, 50);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x2563eb, 2, 50);
    pointLight2.position.set(-5, -5, 5);
    this.scene.add(pointLight2);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  setAnalyser(analyser: Analyser) {
    this.analyser = analyser;
  }

  public onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    (this.backdropMesh.material as THREE.ShaderMaterial).uniforms.resolution.value.set(width, height);
    this.sphereCamera.aspect = width / height;
    this.sphereCamera.updateProjectionMatrix();
  }

  render(isRecording: boolean, isThinking: boolean) {
    const time = this.clock.getElapsedTime();
    const shader = (this.sphere.material as any).userData.shader;

    // Calculate audio-reactive energy
    let avg = 0;
    if (this.analyser) {
      this.analyser.update();
      const data = this.analyser.data;
      for (let i = 0; i < data.length; i++) avg += data[i];
      avg /= data.length;
    }

    const intensity = isRecording ? (avg / 128) : (avg > 0 ? (avg / 160) : 0);
    const pulse = isThinking ? (0.5 + 0.5 * Math.sin(time * 8)) : 0;

    if (shader) {
      shader.uniforms.time.value = time;
      shader.uniforms.inputData.value.set(intensity, 1.4, 5.0, 0);
      shader.uniforms.outputData.value.set(pulse * 0.25, 1.0, 3.0, 0);
    }

    // Orb rotation and pulsation dynamics
    this.sphere.rotation.y = time * 0.25;
    this.sphere.rotation.z = time * 0.12;

    this.coreMesh.rotation.y = -time * 0.35;
    this.ringMesh.rotation.z = time * 0.4;
    this.ringMesh.rotation.x = Math.PI / 3 + Math.sin(time * 0.5) * 0.1;

    const targetScale = 1.0 + intensity * 0.45 + pulse * 0.12 + Math.sin(time * 2) * 0.03;
    this.sphere.scale.setScalar(targetScale);
    this.coreMesh.scale.setScalar(targetScale * 0.95);

    // Dynamic color pulsing based on active state
    if (isRecording) {
      (this.sphere.material as THREE.MeshStandardMaterial).emissive.setHex(0x38bdf8);
      (this.sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + intensity * 0.5;
    } else if (isThinking) {
      (this.sphere.material as THREE.MeshStandardMaterial).emissive.setHex(0x60a5fa);
      (this.sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + pulse * 0.4;
    } else {
      (this.sphere.material as THREE.MeshStandardMaterial).emissive.setHex(0x0284c7);
      (this.sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
    }

    (this.backdropMesh.material as THREE.ShaderMaterial).uniforms.time.value = time;

    this.renderer.autoClear = false;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.render(this.scene, this.sphereCamera);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}

@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  @property({type: Boolean}) isThinking = false;
  @property({type: Boolean}) isRecording = false;
  @property({attribute: false}) inputNode: AudioNode | null = null;
  @property({attribute: false}) outputNode: AudioNode | null = null;

  @query('canvas') canvas!: HTMLCanvasElement;

  private engine!: Visual3D;
  private inputAnalyser?: Analyser;
  private outputAnalyser?: Analyser;
  private animFrameId?: number;

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      position: absolute;
      inset: 0;
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('inputNode') && this.inputNode) {
      this.inputAnalyser = new Analyser(this.inputNode);
      if (this.engine) {
        this.engine.setAnalyser(this.inputAnalyser);
      }
    }
    if (changedProperties.has('outputNode') && this.outputNode && !this.inputAnalyser) {
      this.outputAnalyser = new Analyser(this.outputNode);
      if (this.engine) {
        this.engine.setAnalyser(this.outputAnalyser);
      }
    }
  }

  firstUpdated() {
    this.engine = new Visual3D(this.canvas);
    if (this.inputNode) {
      this.inputAnalyser = new Analyser(this.inputNode);
      this.engine.setAnalyser(this.inputAnalyser);
    } else if (this.outputNode) {
      this.outputAnalyser = new Analyser(this.outputNode);
      this.engine.setAnalyser(this.outputAnalyser);
    }
    this.tick();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.engine) {
      this.engine.dispose();
    }
  }

  private tick = () => {
    this.animFrameId = requestAnimationFrame(this.tick);
    if (this.engine) {
      // Connect active node analyser
      const activeAnalyser = (this.isRecording ? this.inputAnalyser : this.outputAnalyser) || this.inputAnalyser || this.outputAnalyser;
      if (activeAnalyser) {
        this.engine.setAnalyser(activeAnalyser);
      }
      this.engine.render(this.isRecording, this.isThinking);
    }
  };

  render() {
    return html`<canvas></canvas>`;
  }
}
