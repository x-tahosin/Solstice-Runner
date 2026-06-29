import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { Sky, Stars, Billboard, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { state, getActiveMap } from '../game';
import { useGameStore } from '../store';

// Custom Shaders for High Quality Celestial Bodies (For Solstice Map)
const SunMaterial = shaderMaterial(
  { uColor: new THREE.Color('#ff7700') },
  /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /*glsl*/ `
    varying vec2 vUv;
    uniform vec3 uColor;
    void main() {
      float dist = distance(vUv, vec2(0.5));
      float core = smoothstep(0.1, 0.0, dist);
      float glow = smoothstep(0.5, 0.1, dist);
      vec3 finalColor = mix(uColor * glow, vec3(1.0, 1.0, 0.8), core);
      gl_FragColor = vec4(finalColor, glow + core);
    }
  `
);

const MoonMaterial = shaderMaterial(
  { uMap: new THREE.Texture(), uColor: new THREE.Color('#5588ff') },
  /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /*glsl*/ `
    varying vec2 vUv;
    uniform sampler2D uMap;
    uniform vec3 uColor;
    void main() {
      float dist = distance(vUv, vec2(0.5));
      float circle = smoothstep(0.2, 0.19, dist);
      float glow = smoothstep(0.5, 0.19, dist) * 0.6;
      vec4 texColor = texture2D(uMap, vUv);
      vec3 moonSurface = texColor.rgb * vec3(0.8, 0.9, 1.0) * circle;
      vec3 glowColor = uColor * glow;
      gl_FragColor = vec4(moonSurface + glowColor, max(circle, glow));
    }
  `
);

extend({ SunMaterial, MoonMaterial });

const skyboxUrl = import.meta.env.BASE_URL + 'textures/skybox.png';
const sunTexUrl = import.meta.env.BASE_URL + 'textures/sun.png';
const moonTexUrl = import.meta.env.BASE_URL + 'textures/moon.png';

// Solstice Custom Colors
const MORNING_COLOR = new THREE.Color('#ffaa66');
const NOON_COLOR = new THREE.Color('#ffffff');
const EVENING_COLOR = new THREE.Color('#ff4400');
const NIGHT_COLOR = new THREE.Color('#1a243d'); 

const MORNING_FOG = new THREE.Color('#ffccaa');
const NOON_FOG = new THREE.Color('#ddeeff');
const EVENING_FOG = new THREE.Color('#ff2200');
const NIGHT_FOG = new THREE.Color('#050811'); 

// Default Map Cycle Colors
const colorStops = [
  { d: 0, fog: '#f97316', ambient: '#7c2d12', dir: '#fdba74', dirInt: 2.5, ambInt: 0.8 }, // Sunrise
  { d: 100, fog: '#38bdf8', ambient: '#bae6fd', dir: '#fef08a', dirInt: 3.5, ambInt: 1.2 }, // Morning
  { d: 225, fog: '#0ea5e9', ambient: '#e0f2fe', dir: '#ffffff', dirInt: 4.5, ambInt: 1.5 }, // Noon
  { d: 350, fog: '#38bdf8', ambient: '#bae6fd', dir: '#fef08a', dirInt: 3.5, ambInt: 1.2 }, // Afternoon
  { d: 450, fog: '#f97316', ambient: '#7c2d12', dir: '#fdba74', dirInt: 2.5, ambInt: 0.8 }, // Sunset
  { d: 480, fog: '#1e1b4b', ambient: '#465b82', dir: '#a5b4fc', dirInt: 1.5, ambInt: 1.2 }, // Dusk
  { d: 520, fog: '#0a1a3f', ambient: '#2b4778', dir: '#7b9cff', dirInt: 1.2, ambInt: 1.0 }, // Night
  { d: 560, fog: '#06132e', ambient: '#1e355e', dir: '#5c80ff', dirInt: 1.0, ambInt: 0.9 }, // Midnight
  { d: 590, fog: '#1e1b4b', ambient: '#465b82', dir: '#a5b4fc', dirInt: 1.5, ambInt: 1.2 }, // Pre-dawn
  { d: 600, fog: '#f97316', ambient: '#7c2d12', dir: '#fdba74', dirInt: 2.5, ambInt: 0.8 }, // Sunrise (loop)
];

export function EnvironmentSystem() {
  const { scene } = useThree();
  const store = useGameStore();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const starsGroupRef = useRef<THREE.Group>(null);
  const skyMeshRef = useRef<THREE.Mesh>(null);
  const defaultSkyRef = useRef<any>(null); // For classic Sky component

  // Custom Object3D to act as the sunlight's target so shadows point correctly
  const targetObj = useMemo(() => new THREE.Object3D(), []);

  const [skyboxTex, setSkyboxTex] = useState<THREE.Texture | null>(null);
  const [sunTex, setSunTex] = useState<THREE.Texture | null>(null);
  const [moonTex, setMoonTex] = useState<THREE.Texture | null>(null);

  const c1 = useMemo(() => new THREE.Color(), []);
  const c2 = useMemo(() => new THREE.Color(), []);
  const sunPos = useMemo(() => new THREE.Vector3(), []);
  const dirPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
      const loader = new THREE.TextureLoader();
      loader.load(skyboxUrl, setSkyboxTex);
      loader.load(sunTexUrl, setSunTex);
      loader.load(moonTexUrl, setMoonTex);
  }, []);

  useFrame((_, delta) => {
    if (state.status === 'GAMEOVER') return;

    const currentMap = getActiveMap();
    const isSolstice = currentMap === 'm2';
    const isGraveyard = currentMap === 'm3';

    // Hide/show respective background elements
    if (defaultSkyRef.current) {
        defaultSkyRef.current.visible = !isSolstice;
    }
    if (skyMeshRef.current) {
        skyMeshRef.current.visible = isSolstice;
        if (isSolstice) skyMeshRef.current.rotation.y += delta * 0.01;
    }

    if (isSolstice) {
        // --- NEW SOLSTICE TIME-BASED CYCLE ---
        const t = state.dayTime;
        let sunAngle = 0;
        let moonAngle = 0;
        let isNight = false;

        const curLightColor = new THREE.Color();
        const curAmbientColor = new THREE.Color();
        const curFogColor = new THREE.Color();
        let lightIntensity = 0;

        if (t < 0.333) {
          const p = t / 0.333;
          sunAngle = p * (Math.PI * 0.4);
          curLightColor.lerpColors(MORNING_COLOR, NOON_COLOR, p); 
          curAmbientColor.set('#331100').lerp(new THREE.Color('#8899aa'), p);
          curFogColor.lerpColors(MORNING_FOG, NOON_FOG, p);
          lightIntensity = 1.0 + p * 1.5;
        } else if (t < 0.666) {
          const p = (t - 0.333) / 0.333;
          sunAngle = (Math.PI * 0.4) + p * (Math.PI * 0.6);
          if (p < 0.5) {
              const subP = p / 0.5;
              curLightColor.lerpColors(NOON_COLOR, MORNING_COLOR, subP);
              curAmbientColor.set('#8899aa').lerp(new THREE.Color('#665544'), subP);
              curFogColor.lerpColors(NOON_FOG, MORNING_FOG, subP);
              lightIntensity = 2.5 - subP * 0.5;
          } else {
              const subP = (p - 0.5) / 0.5;
              curLightColor.lerpColors(MORNING_COLOR, EVENING_COLOR, subP);
              curAmbientColor.set('#665544').lerp(new THREE.Color('#220500'), subP);
              curFogColor.lerpColors(MORNING_FOG, EVENING_FOG, subP);
              lightIntensity = 2.0 - subP * 1.5;
          }
        } else {
          isNight = true;
          const p = (t - 0.666) / 0.334;
          moonAngle = p * Math.PI;
          const moonPhase = Math.sin(p * Math.PI); 
          curLightColor.lerpColors(EVENING_COLOR, NIGHT_COLOR, p * 3.0 > 1.0 ? 1.0 : p * 3.0);
          curAmbientColor.set('#220500').lerp(new THREE.Color('#081020'), Math.min(p * 2.0, 1.0));
          curFogColor.lerpColors(EVENING_FOG, NIGHT_FOG, Math.min(p * 2.0, 1.0));
          lightIntensity = 0.2 + moonPhase * 1.0; 
        }

        if (!scene.fog) scene.fog = new THREE.FogExp2(curFogColor, 0.015);
        else {
            (scene.fog as THREE.FogExp2).color.copy(curFogColor);
            (scene.fog as THREE.FogExp2).density = 0.015;
        }
        scene.background = curFogColor;

        const orbitRadius = 200;
        if (dirLightRef.current) {
            dirLightRef.current.color.copy(curLightColor);
            dirLightRef.current.intensity = lightIntensity;

            if (!isNight) {
                const sx = Math.cos(sunAngle) * orbitRadius;
                const sy = Math.sin(sunAngle) * orbitRadius;
                dirLightRef.current.position.set(sx, sy, -100);
                if (sunMeshRef.current) { sunMeshRef.current.position.set(sx, sy, -100); sunMeshRef.current.visible = true; }
                if (moonMeshRef.current) moonMeshRef.current.visible = false;
            } else {
                const mx = Math.cos(moonAngle) * orbitRadius;
                const my = Math.sin(moonAngle) * orbitRadius;
                dirLightRef.current.position.set(mx, my, -100);
                if (moonMeshRef.current) { moonMeshRef.current.position.set(mx, my, -100); moonMeshRef.current.visible = true; }
                if (sunMeshRef.current) sunMeshRef.current.visible = false;
            }
            dirLightRef.current.target = targetObj;
            targetObj.position.set(0, 0, 0);
        }
        if (ambientLightRef.current) ambientLightRef.current.color.copy(curAmbientColor);
        if (starsGroupRef.current) starsGroupRef.current.visible = (t > 0.6);
        
    } else {
        // --- CLASSIC LIGHTING CYCLE (Default & Graveyard) ---
        if (sunMeshRef.current) sunMeshRef.current.visible = false;
        if (moonMeshRef.current) moonMeshRef.current.visible = false;
        
        const dist = state.distance % 600;
        let s1, s2, progress;

        if (isGraveyard) {
            // Fixed Graveyard (formerly Midnight) lighting
            s1 = s2 = { d: 0, fog: '#06132e', ambient: '#3a5282', dir: '#7b9cff', dirInt: 1.5, ambInt: 1.5 };
            progress = 0;
            if (starsGroupRef.current) starsGroupRef.current.visible = true;
        } else if (currentMap.startsWith('gen-m-')) {
            const cMap = store.customMaps?.find((m: any) => m.id === currentMap);
            s1 = s2 = { 
                d: 0, 
                fog: cMap?.fogColor || '#555555', 
                ambient: cMap?.ambientColor || '#aaaaaa', 
                dir: cMap?.dirColor || '#ffffff', 
                dirInt: 1.5, 
                ambInt: 1.0 
            };
            progress = 0;
            if (starsGroupRef.current) starsGroupRef.current.visible = false;
        } else {
            // Default 600m cycle
            s1 = colorStops[0];
            s2 = colorStops[colorStops.length - 1];
            for (let i = 0; i < colorStops.length - 1; i++) {
              if (dist >= colorStops[i].d && dist <= colorStops[i+1].d) {
                s1 = colorStops[i];
                s2 = colorStops[i+1];
                break;
              }
            }
            progress = (dist - s1.d) / (s2.d - s1.d || 1);
            if (starsGroupRef.current) starsGroupRef.current.visible = (dist > 450 && dist < 590);
        }

        // Apply Fog
        c1.set(s1.fog);
        c2.set(s2.fog);
        if (!scene.fog || (scene.fog as any).isFogExp2) {
            scene.fog = new THREE.Fog('#000000', 30, 90);
        }
        (scene.fog as THREE.Fog).color.lerpColors(c1, c2, progress);
        scene.background = (scene.fog as THREE.Fog).color;

        // Apply Ambient Light
        if (ambientLightRef.current) {
            c1.set(s1.ambient);
            c2.set(s2.ambient);
            ambientLightRef.current.color.lerpColors(c1, c2, progress);
            ambientLightRef.current.intensity = THREE.MathUtils.lerp(s1.ambInt, s2.ambInt, progress);
        }

        // Apply Directional Light
        if (dirLightRef.current) {
            c1.set(s1.dir);
            c2.set(s2.dir);
            dirLightRef.current.color.lerpColors(c1, c2, progress);
            dirLightRef.current.intensity = THREE.MathUtils.lerp(s1.dirInt, s2.dirInt, progress);
        }

        // Visual Sun position for the Sky component
        let sunElevation = 0;
        if (isGraveyard) {
            sunElevation = -40;
        } else {
            if (dist >= 0 && dist <= 450) {
                const p = dist / 450;
                sunElevation = Math.sin(p * Math.PI) * 75; 
            } else {
                const p = (dist - 450) / 150;
                sunElevation = -Math.sin(p * Math.PI) * 75; 
            }
        }
        
        const azimuthSweep = isGraveyard ? 0.5 : (dist / 600); 
        const sunTheta = THREE.MathUtils.lerp(Math.PI * 0.6, Math.PI * 1.4, azimuthSweep);
        const sunPhi = THREE.MathUtils.degToRad(90 - sunElevation);
        sunPos.setFromSphericalCoords(400000, sunPhi, sunTheta);
        
        const sky = scene.getObjectByName('gameSky');
        if (sky && (sky as any).material && (sky as any).material.uniforms.sunPosition) {
            (sky as any).material.uniforms.sunPosition.value.copy(sunPos);
        }

        const isDay = isGraveyard ? false : (dist >= 0 && dist <= 450);
        if (isDay) {
            dirPos.copy(sunPos).normalize().multiplyScalar(50);
        } else {
            const p = isGraveyard ? 0.5 : ((dist - 450) / 150);
            const moonElevation = Math.sin(p * Math.PI) * 60;
            const moonPhi = THREE.MathUtils.degToRad(90 - moonElevation);
            const moonTheta = THREE.MathUtils.lerp(Math.PI * 0.6, Math.PI * 1.4, p);
            dirPos.setFromSphericalCoords(50, moonPhi, moonTheta);
        }
        
        if (dirLightRef.current) {
            dirLightRef.current.position.copy(dirPos);
            dirLightRef.current.target = targetObj;
            targetObj.position.set(0, 0, -30);
        }
    }
  });

  return (
    <>
      {/* Classic Skybox for Default & Graveyard */}
      <Sky ref={defaultSkyRef} name="gameSky" distance={450000} turbidity={6} rayleigh={2.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
      
      {/* Animated AI Skybox for Solstice */}
      {skyboxTex && (
        <mesh ref={skyMeshRef} visible={false}>
           <sphereGeometry args={[450, 32, 32]} />
           <meshBasicMaterial map={skyboxTex} side={THREE.BackSide} fog={false} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      
      <group ref={starsGroupRef} visible={false}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </group>
      
      {/* Custom Solstice Celestial Bodies */}
      <Billboard ref={sunMeshRef} visible={false}>
          <mesh>
             <planeGeometry args={[100, 100]} />
             <sunMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
      </Billboard>
      <Billboard ref={moonMeshRef} visible={false}>
          <mesh>
             <planeGeometry args={[80, 80]} />
             {moonTex && <moonMaterial uMap={moonTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />}
          </mesh>
      </Billboard>
      
      <directionalLight 
        ref={dirLightRef} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
        shadow-bias={-0.0005}
      >
         <orthographicCamera attach="shadow-camera" args={[-40, 40, 60, -60, 0.1, 500]} />
      </directionalLight>
      
      <primitive object={targetObj} />
      <ambientLight ref={ambientLightRef} />
    </>
  );
}
