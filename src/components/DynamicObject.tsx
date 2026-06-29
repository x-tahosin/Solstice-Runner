import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface AI3DPart {
  shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'dodecahedron';
  color: string;
  pos: [number, number, number];
  scale: [number, number, number];
  rot: [number, number, number];
  material?: 'standard' | 'glow' | 'wireframe';
  anim?: 'spinY' | 'spinX' | 'float' | 'pulse' | 'none';
}

function DynamicPart({ part }: { part: AI3DPart }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const initialY = part.pos ? part.pos[1] : 0;
    
    useFrame((threeState) => {
        if (!meshRef.current) return;
        const time = threeState.clock.elapsedTime;
        
        if (part.anim === 'spinY') {
            meshRef.current.rotation.y += 0.05;
        } else if (part.anim === 'spinX') {
            meshRef.current.rotation.x += 0.05;
        } else if (part.anim === 'float') {
            meshRef.current.position.y = initialY + Math.sin(time * 2) * 0.2;
        } else if (part.anim === 'pulse') {
            const baseScale = part.scale || [1,1,1];
            const s = 1.0 + Math.sin(time * 4) * 0.1;
            meshRef.current.scale.set(baseScale[0]*s, baseScale[1]*s, baseScale[2]*s);
        }
    });

    let geometry = null;
    switch(part.shape) {
        case 'box': geometry = <boxGeometry args={[1,1,1]} />; break;
        case 'sphere': geometry = <sphereGeometry args={[0.5, 32, 32]} />; break;
        case 'cylinder': geometry = <cylinderGeometry args={[0.5, 0.5, 1, 16]} />; break;
        case 'cone': geometry = <coneGeometry args={[0.5, 1, 16]} />; break;
        case 'torus': geometry = <torusGeometry args={[0.4, 0.1, 16, 32]} />; break;
        case 'dodecahedron': geometry = <dodecahedronGeometry args={[0.5]} />; break;
        default: geometry = <boxGeometry args={[1,1,1]} />;
    }

    const isGlow = part.material === 'glow';
    const isWireframe = part.material === 'wireframe';

    return (
        <mesh 
            ref={meshRef} 
            position={part.pos || [0,0,0]} 
            rotation={part.rot || [0,0,0]} 
            scale={part.scale || [1,1,1]}
            castShadow
            receiveShadow
        >
            {geometry}
            <meshStandardMaterial 
                color={part.color || "#ffffff"} 
                emissive={isGlow ? (part.color || "#ffffff") : '#000000'}
                emissiveIntensity={isGlow ? 2 : 0}
                wireframe={isWireframe}
                roughness={isGlow ? 0.2 : 0.8}
            />
        </mesh>
    );
}

export function DynamicObject({ parts, center = false }: { parts: AI3DPart[], center?: boolean }) {
    if (!parts || !Array.isArray(parts) || parts.length === 0) return null;

    let cx = 0;
    let cz = 0;
    if (center) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        parts.forEach(p => {
            const x = p.pos ? p.pos[0] : 0;
            const z = p.pos ? p.pos[2] : 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        });
        if (minX !== Infinity) {
            cx = (minX + maxX) / 2;
            cz = (minZ + maxZ) / 2;
        }
    }

    return (
        <group position={[-cx, 0, -cz]}>
            {parts.map((p, i) => <DynamicPart key={i} part={p} />)}
        </group>
    );
}
