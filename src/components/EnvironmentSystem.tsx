import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { state } from '../game';
import { useState, useEffect } from 'react';

const skyboxUrl = import.meta.env.BASE_URL + 'textures/skybox.png';
console.log('SKYBOX URL:', skyboxUrl);

const DAY_COLOR = new THREE.Color('#ffccaa');
const EVENING_COLOR = new THREE.Color('#ff5500');
const NIGHT_COLOR = new THREE.Color('#051025');

const DAY_FOG = new THREE.Color('#ffebcc');
const EVENING_FOG = new THREE.Color('#ff4400');
const NIGHT_FOG = new THREE.Color('#0a0510');

export function EnvironmentSystem() {
  const { scene } = useThree();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const starsGroupRef = useRef<THREE.Group>(null);
  const skyRef = useRef<any>(null); // For Sky component material
  
  const skyMeshRef = useRef<THREE.Mesh>(null);

  // Custom Object3D to act as the sunlight's target so shadows point correctly
  const targetObj = useMemo(() => new THREE.Object3D(), []);

  const [skyboxTex, setSkyboxTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
      new THREE.TextureLoader().load(skyboxUrl, (tex) => {
          setSkyboxTex(tex);
      });
  }, []);

  useFrame((_, delta) => {
    if (state.status === 'GAMEOVER') return;

    if (skyMeshRef.current) {
        skyMeshRef.current.rotation.y += delta * 0.01; // Slow rotation animation for the background
    }

    const t = state.dayTime; // 0.0 to 1.0

    // Calculate phases:
    // 0.0 - 0.5: Day
    // 0.5 - 0.75: Evening
    // 0.75 - 1.0: Night

    let sunAngle = 0;
    let moonAngle = 0;
    
    let isNight = false;

    // Current interpolated colors
    const curLightColor = new THREE.Color();
    const curAmbientColor = new THREE.Color();
    const curFogColor = new THREE.Color();
    let lightIntensity = 0;

    if (t < 0.5) {
      // Day
      const p = t / 0.5;
      sunAngle = p * (Math.PI * 0.6); // Sun goes up to slightly past zenith
      curLightColor.lerpColors(EVENING_COLOR, DAY_COLOR, Math.sin(p * Math.PI)); // Starts evening, goes to day, then back
      curAmbientColor.set('#553311').lerp(new THREE.Color('#aaaaaa'), Math.sin(p * Math.PI));
      curFogColor.lerpColors(EVENING_FOG, DAY_FOG, Math.sin(p * Math.PI));
      lightIntensity = 2.0 + Math.sin(p * Math.PI) * 1.0;
    } else if (t < 0.75) {
      // Evening
      const p = (t - 0.5) / 0.25;
      sunAngle = (Math.PI * 0.6) + p * (Math.PI * 0.4); // Sun sets
      curLightColor.lerpColors(DAY_COLOR, EVENING_COLOR, p);
      curAmbientColor.set('#aaaaaa').lerp(new THREE.Color('#331100'), p);
      curFogColor.lerpColors(DAY_FOG, EVENING_FOG, p);
      lightIntensity = 2.0 - p * 1.5;
    } else {
      // Night
      isNight = true;
      const p = (t - 0.75) / 0.25;
      moonAngle = p * Math.PI; // Moon travels across
      curLightColor.lerpColors(EVENING_COLOR, NIGHT_COLOR, p * 2.0 > 1.0 ? 1.0 : p * 2.0);
      curAmbientColor.set('#331100').lerp(new THREE.Color('#051025'), Math.min(p * 2.0, 1.0));
      curFogColor.lerpColors(EVENING_FOG, NIGHT_FOG, Math.min(p * 2.0, 1.0));
      lightIntensity = 0.5 + Math.sin(p * Math.PI) * 1.0; // Moon gives slight light
    }

    // Update Fog
    if (!scene.fog) {
        scene.fog = new THREE.FogExp2(curFogColor, 0.015);
    } else {
        (scene.fog as THREE.FogExp2).color.copy(curFogColor);
        (scene.fog as THREE.FogExp2).density = 0.015;
    }
    
    // Update Scene Background to match fog for seamless horizon
    scene.background = curFogColor;

    const orbitRadius = 200;

    // Update Celestial Bodies & Light
    if (dirLightRef.current) {
        dirLightRef.current.color.copy(curLightColor);
        dirLightRef.current.intensity = lightIntensity;

        if (!isNight) {
            // Sun is light source
            const sx = Math.cos(sunAngle) * orbitRadius;
            const sy = Math.sin(sunAngle) * orbitRadius;
            const sz = -100; 
            dirLightRef.current.position.set(sx, sy, sz);
            
            if (sunMeshRef.current) {
                sunMeshRef.current.position.set(sx, sy, sz);
                sunMeshRef.current.visible = true;
            }
            if (moonMeshRef.current) moonMeshRef.current.visible = false;
        } else {
            // Moon is light source
            const mx = Math.cos(moonAngle) * orbitRadius;
            const my = Math.sin(moonAngle) * orbitRadius;
            const mz = -100;
            dirLightRef.current.position.set(mx, my, mz);
            
            if (moonMeshRef.current) {
                moonMeshRef.current.position.set(mx, my, mz);
                moonMeshRef.current.visible = true;
            }
            if (sunMeshRef.current) sunMeshRef.current.visible = false;
        }
        
        dirLightRef.current.target = targetObj;
        targetObj.position.set(0, 0, 0);
    }
    
    if (ambientLightRef.current) {
        ambientLightRef.current.color.copy(curAmbientColor);
    }
    
    // Stars visibility
    if (starsGroupRef.current) {
        // Show stars in evening and night
        if (t > 0.6) {
            starsGroupRef.current.visible = true;
        } else {
            starsGroupRef.current.visible = false;
        }
    }
  });

  return (
    <>
      <Sky ref={skyRef} distance={450000} sunPosition={dirLightRef.current ? dirLightRef.current.position : new THREE.Vector3(0, 1, 0)} inclination={0} azimuth={0.25} />
      
      <group ref={starsGroupRef} visible={false}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </group>
      
      {/* Animated AI Skybox Background */}
      {skyboxTex && (
        <mesh ref={skyMeshRef}>
           <sphereGeometry args={[450, 32, 32]} />
           <meshBasicMaterial map={skyboxTex} side={THREE.BackSide} fog={false} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      
      {/* Sun Mesh */}
      <mesh ref={sunMeshRef} visible={false}>
          <sphereGeometry args={[15, 32, 32]} />
          <meshBasicMaterial color="#ffffaa" />
          {/* Outer Glow */}
          <mesh>
              <sphereGeometry args={[18, 32, 32]} />
              <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} />
          </mesh>
      </mesh>
      
      {/* Moon Mesh */}
      <mesh ref={moonMeshRef} visible={false}>
          <sphereGeometry args={[10, 32, 32]} />
          <meshBasicMaterial color="#ccccff" />
          {/* Moon Glow */}
          <mesh>
              <sphereGeometry args={[12, 32, 32]} />
              <meshBasicMaterial color="#8888ff" transparent opacity={0.3} />
          </mesh>
      </mesh>
      
      <directionalLight 
        ref={dirLightRef} 
        color="#ff6600" 
        intensity={3} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
        shadow-bias={-0.001}
      >
         <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.5, 400]} />
      </directionalLight>
      
      <primitive object={targetObj} />
      
      <ambientLight ref={ambientLightRef} color="#330a00" intensity={0.5} />
    </>
  );
}
