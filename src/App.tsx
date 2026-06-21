/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas } from '@react-three/fiber';
import { Player } from './components/Player';
import { World } from './components/World';
import { UI } from './components/UI';
import { state } from './game';
import { useEffect } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { EnvironmentSystem } from './components/EnvironmentSystem';

import { store } from './store';
import { audioManager } from './audio';

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (state.status !== 'PLAYING') return;
      
      const key = e.key.toLowerCase();
      
      // Map arrow keys and WASD
      if (key === 'arrowleft' || key === 'a') {
        if (state.targetLane > -1) state.targetLane--;
      }
      
      if (key === 'arrowright' || key === 'd') {
        if (state.targetLane < 1) state.targetLane++;
      }
      
      if (key === 'arrowup' || key === 'w' || key === ' ') {
        // Only jump if grounded or slightly above, or if capable of double jump
        const canDoubleJump = store.selChar === 'c2';

        if (state.y <= 0.1 && !state.isSliding) {
          state.yVel = 26; // Jump velocity
          audioManager.playJump();
        } else if (canDoubleJump && !state.doubleJumped && !state.isSliding) {
          state.yVel = 22; // Double jump slightly weaker
          state.doubleJumped = true;
          audioManager.playJump();
        }
      }
      
      if (key === 'arrowdown' || key === 's') {
        if (state.y <= 0.1 && !state.isSliding) {
          // Normal slide
          state.isSliding = true;
          state.slideTimer = 0.8;
          audioManager.playSlide();
        } else if (state.y > 0.1 && !state.isSliding) {
          // Dive bomb to slide
          state.yVel = -40;
          state.isSliding = true;
          state.slideTimer = 1.0;
          audioManager.playSlide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none relative">
      <Canvas 
        shadows 
        camera={{ position: [0, 4, 8], fov: 60, rotation: [-0.2, 0, 0] }}
        gl={{ antialias: true }}
      >
        <EnvironmentSystem />

        <Player />
        <World />
      </Canvas>
      <UI />
    </div>
  );
}

