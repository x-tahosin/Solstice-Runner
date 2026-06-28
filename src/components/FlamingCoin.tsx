import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Billboard } from '@react-three/drei';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float time;
varying vec2 vUv;

// Noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 uv) {
    float f = 0.0;
    float w = 0.5;
    for(int i = 0; i < 4; i++) {
        f += w * snoise(uv);
        uv *= 2.0;
        w *= 0.5;
    }
    return f;
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    float t = time * 2.0;
    
    // --- 1. The 8-Pointed Star ---
    float p1 = smoothstep(0.025, 0.0, abs(uv.y)) * smoothstep(0.4, 0.05, abs(uv.x)); // Horizontal
    float p2 = smoothstep(0.025, 0.0, abs(uv.x)) * smoothstep(0.4, 0.05, abs(uv.y)); // Vertical
    
    vec2 uvRot = vec2(uv.x * 0.7071 - uv.y * 0.7071, uv.x * 0.7071 + uv.y * 0.7071);
    float p3 = smoothstep(0.02, 0.0, abs(uvRot.y)) * smoothstep(0.3, 0.05, abs(uvRot.x)); // Diag 1
    float p4 = smoothstep(0.02, 0.0, abs(uvRot.x)) * smoothstep(0.3, 0.05, abs(uvRot.y)); // Diag 2
    
    float star = max(max(p1, p2), max(p3, p4));
    
    // --- 2. Coin Rings ---
    float innerRing = smoothstep(0.015, 0.0, abs(r - 0.22));
    float outerRing = smoothstep(0.02, 0.0, abs(r - 0.43));
    float baseMask = smoothstep(0.46, 0.44, r);
    
    // --- 3. Fire Aura ---
    vec2 fireUv = vec2(angle * 2.0, r * 2.0 - t);
    float noise1 = fbm(fireUv);
    float noise2 = fbm(fireUv * 2.0 + vec2(t * 0.5));
    
    float fireAlpha = smoothstep(0.3, 0.45, r) * smoothstep(1.0, 0.45, r);
    float fireFlames = (noise1 * 0.7 + noise2 * 0.3) * fireAlpha;
    fireFlames = pow(fireFlames, 1.2) * 3.5;
    
    // --- 4. Colors ---
    vec3 cFireOuter = vec3(1.0, 0.1, 0.0);
    vec3 cFireInner = vec3(1.0, 0.6, 0.0);
    vec3 cFireCore  = vec3(1.0, 0.9, 0.5);
    
    vec3 fireColor = mix(cFireOuter, cFireInner, smoothstep(0.1, 0.5, fireFlames));
    fireColor = mix(fireColor, cFireCore, smoothstep(0.5, 1.0, fireFlames));
    
    vec3 cCoinBase = vec3(0.4, 0.1, 0.0) * (0.5 + 0.5 * snoise(uv * 5.0)); // Dark metallic orange
    vec3 finalCol = cCoinBase * baseMask; 
    finalCol += fireColor * fireFlames; 
    
    float metalGlow = max(innerRing, outerRing) * 0.6 + star * 0.9 + smoothstep(0.12, 0.0, r) * 1.5;
    vec3 emissive = mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.9, 0.5), metalGlow) * metalGlow * 1.5;
    
    finalCol += emissive;
    finalCol *= 1.0 + 0.1 * sin(time * 10.0); // Flicker
    
    float finalAlpha = max(fireFlames, baseMask);
    finalAlpha = smoothstep(0.0, 0.1, finalAlpha);
    
    // Output with premultiplied alpha for additive blending
    gl_FragColor = vec4(finalCol * finalAlpha, finalAlpha);
}
`;

export function FlamingCoin() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
      <mesh>
        <planeGeometry args={[2.2, 2.2]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{ time: { value: 0 } }}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Billboard>
  );
}
