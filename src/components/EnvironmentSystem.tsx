import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { state, getActiveMap } from '../game';
import { useGameStore } from '../store';

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
  
  // Custom Object3D to act as the sunlight's target so shadows point correctly
  const targetObj = useMemo(() => new THREE.Object3D(), []);

  const c1 = useMemo(() => new THREE.Color(), []);
  const c2 = useMemo(() => new THREE.Color(), []);
  const sunPos = useMemo(() => new THREE.Vector3(), []);
  const dirPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (state.gameOver) return;

    // Cycle length is 600m
    const dist = state.distance % 600;
    const currentMap = getActiveMap();

    let s1, s2, progress;

    if (currentMap === 'm2') {
        // Midnight Mode Override
        s1 = s2 = { d: 0, fog: '#06132e', ambient: '#3a5282', dir: '#7b9cff', dirInt: 1.5, ambInt: 1.5 };
        progress = 0;
    } else if (currentMap === 'm3') {
        // Neon Void Override
        s1 = s2 = { d: 0, fog: '#2e0a29', ambient: '#4a0840', dir: '#f024b0', dirInt: 2.0, ambInt: 1.5 };
        progress = 0;
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
    } else {
        // Default Solstice Cycle
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
    }

    // Dynamic Fog
    c1.set(s1.fog);
    c2.set(s2.fog);
    if (!scene.fog) {
        scene.fog = new THREE.Fog('#000000', 30, 90);
    }
    (scene.fog as THREE.Fog).color.lerpColors(c1, c2, progress);

    // Dynamic Ambient Light
    if (ambientLightRef.current) {
        c1.set(s1.ambient);
        c2.set(s2.ambient);
        ambientLightRef.current.color.lerpColors(c1, c2, progress);
        ambientLightRef.current.intensity = THREE.MathUtils.lerp(s1.ambInt, s2.ambInt, progress);
    }

    // Dynamic Directional Light (Sun/Moon specs)
    if (dirLightRef.current) {
        c1.set(s1.dir);
        c2.set(s2.dir);
        dirLightRef.current.color.lerpColors(c1, c2, progress);
        dirLightRef.current.intensity = THREE.MathUtils.lerp(s1.dirInt, s2.dirInt, progress);
    }

    // Visual Sun position for the Sky background
    let sunElevation = 0;
    if (currentMap === 'm2') {
        sunElevation = -40; // Midnight: fully below horizon
    } else if (currentMap === 'm3') {
        sunElevation = 5; // Neon Void: large synthwave sun on horizon
    } else {
        if (dist >= 0 && dist <= 450) {
            const p = dist / 450;
            sunElevation = Math.sin(p * Math.PI) * 75; 
        } else {
            const p = (dist - 450) / 150;
            sunElevation = -Math.sin(p * Math.PI) * 75; 
        }
    }
    
    // Azimuth: Sweep east to west in front of the camera (looking down -Z)
    const azimuthSweep = (currentMap === 'm2' || currentMap === 'm3') ? 0.5 : (dist / 600); 
    const sunTheta = THREE.MathUtils.lerp(Math.PI * 0.6, Math.PI * 1.4, azimuthSweep);
    const sunPhi = THREE.MathUtils.degToRad(90 - sunElevation);
    
    sunPos.setFromSphericalCoords(400000, sunPhi, sunTheta);
    
    // Update the Sky shader uniform without triggering React re-renders!
    const sky = scene.getObjectByName('gameSky');
    if (sky && (sky as any).material && (sky as any).material.uniforms.sunPosition) {
        (sky as any).material.uniforms.sunPosition.value.copy(sunPos);
    }

    // Align the shadow-casting DirectionalLight physically
    const isDay = currentMap === 'm3' ? true : currentMap === 'm2' ? false : (dist >= 0 && dist <= 450);
    if (isDay) {
        // Sun position
        dirPos.copy(sunPos).normalize().multiplyScalar(50);
    } else {
        // Moon position 
        const p = currentMap === 'm2' ? 0.5 : ((dist - 450) / 150);
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
  });

  return (
    <>
      {/* Background dynamic sky shader */}
      <Sky name="gameSky" distance={450000} turbidity={6} rayleigh={2.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
      
      {/* Primary shadow caster spanning the track path */}
      <directionalLight ref={dirLightRef} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005}>
         <orthographicCamera attach="shadow-camera" args={[-30, 30, 60, -60, 0.5, 200]} />
      </directionalLight>
      
      {/* Shadow Target Hook */}
      <primitive object={targetObj} />
      
      {/* Dynamic baselight structure */}
      <ambientLight ref={ambientLightRef} />
    </>
  );
}
