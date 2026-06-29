/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas, useThree } from '@react-three/fiber';
import { Player } from './components/Player';
import { World } from './components/World';
import { UI } from './components/UI';
import { state } from './game';
import { useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { EnvironmentSystem } from './components/EnvironmentSystem';

import { store } from './store';
import { audioManager } from './audio';

let touchStartX = 0;
let touchStartY = 0;

function CameraAdjuster() {
  const { camera, size } = useThree();
  
  useEffect(() => {
    const handleStoreUpdate = () => {
       const settings = store.globalSettings;
       if (camera instanceof THREE.PerspectiveCamera) {
          const aspect = size.width / size.height;
          camera.fov = aspect < 1 ? Math.max(85, settings.fov) : settings.fov;
          camera.position.set(0, settings.cameraY, settings.cameraZ);
          camera.updateProjectionMatrix();
       }
    };
    
    handleStoreUpdate();
    window.addEventListener("store-update", handleStoreUpdate);
    return () => window.removeEventListener("store-update", handleStoreUpdate);
  }, [camera, size]);
  
  return null;
}

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
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

    const handleTouchStart = (e: TouchEvent) => {
      if (state.status !== 'PLAYING') return;
      e.preventDefault();
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (state.status === 'PLAYING') {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (state.status !== 'PLAYING') return;
      e.preventDefault();

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      const minSwipeDistance = 20;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (Math.abs(dx) > minSwipeDistance) {
          if (dx > 0) {
            // Swipe right
            if (state.targetLane < 1) state.targetLane++;
          } else {
            // Swipe left
            if (state.targetLane > -1) state.targetLane--;
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(dy) > minSwipeDistance) {
          if (dy > 0) {
            // Swipe down (slide)
            if (state.y <= 0.1 && !state.isSliding) {
              state.isSliding = true;
              state.slideTimer = 0.8;
              audioManager.playSlide();
            } else if (state.y > 0.1 && !state.isSliding) {
              state.yVel = -40;
              state.isSliding = true;
              state.slideTimer = 1.0;
              audioManager.playSlide();
            }
          } else {
            // Swipe up (jump)
            const canDoubleJump = store.selChar === 'c2';

            if (state.y <= 0.1 && !state.isSliding) {
              state.yVel = 26;
              audioManager.playJump();
            } else if (canDoubleJump && !state.doubleJumped && !state.isSliding) {
              state.yVel = 22;
              state.doubleJumped = true;
              audioManager.playJump();
            }
          }
        }
      }
    };

    // Use capture phase so touch events fire BEFORE R3F Canvas consumes them
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, []);

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-zinc-950 font-sans select-none relative touch-none">
      <Canvas 
        shadows 
        camera={{ position: [0, 4, 8], fov: 60, rotation: [-0.2, 0, 0] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <CameraAdjuster />
          <EnvironmentSystem />

          <Player />
          <World />
        </Suspense>
      </Canvas>

      <UI />
    </div>
  );
}

