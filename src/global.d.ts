declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

import { Object3DNode, MaterialNode } from '@react-three/fiber';

declare module '@react-three/fiber' {
  interface ThreeElements {
    sunMaterial: MaterialNode<any, typeof THREE.ShaderMaterial>;
    moonMaterial: MaterialNode<any, typeof THREE.ShaderMaterial>;
  }
}
