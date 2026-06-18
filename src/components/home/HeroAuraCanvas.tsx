'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface HeroAuraCanvasProps {
  isDark: boolean;
  isReady?: boolean;
  onReady?: () => void;
}

type AuraShaderMaterial = THREE.ShaderMaterial & {
  uTime: number;
  uSeed: number;
  uIntensity: number;
  uSpeed: number;
  uScale: number;
  uDistortion: number;
  uColorA: THREE.Color;
  uColorB: THREE.Color;
  uColorC: THREE.Color;
};

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uSeed;
  uniform float uIntensity;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uDistortion;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= 1.48;

    float t = uTime * uSpeed;
    float n = noise(p * uScale + vec2(t, -t * 0.72));
    vec2 drift = vec2(n - 0.5, noise(p * (uScale + 1.65) - t) - 0.5) * uDistortion;

    float dominant = smoothstep(1.32, 0.08, length(p + drift - vec2(0.42, -0.03)));
    float support = smoothstep(1.18, 0.12, length(p - drift + vec2(0.28, -0.2)));
    float accent = smoothstep(0.68, 0.04, length(p + drift * 0.55 - vec2(0.74, 0.22)));
    float veil = smoothstep(1.25, 0.32, length(p + vec2(-0.52, 0.0))) * 0.32;

    vec3 color = uColorA * dominant;
    color += uColorB * support * 0.64;
    color += uColorC * accent * 0.42;
    color += uColorA * veil * 0.34;

    float grain = noise(vUv * 14.0 + t * 0.2) * 0.035;
    color = pow(color + grain, vec3(0.92)) * uIntensity;

    float alpha = clamp((dominant * 0.62 + support * 0.36 + accent * 0.2 + veil * 0.18) * uIntensity, 0.0, 0.82);
    gl_FragColor = vec4(color, alpha);
  }
`;

const AuraMaterial = shaderMaterial(
  {
    uTime: 0,
    uSeed: 18.7,
    uIntensity: 0.86,
    uSpeed: 0.16,
    uScale: 2.75,
    uDistortion: 0.34,
    uColorA: new THREE.Color('#A8C5E0'),
    uColorB: new THREE.Color('#5BBF8E'),
    uColorC: new THREE.Color('#F0A855'),
  },
  vertexShader,
  fragmentShader,
);

function AuraPlane({ isDark }: HeroAuraCanvasProps) {
  const viewport = useThree((state) => state.viewport);
  const material = useMemo(() => {
    const mat = new AuraMaterial() as AuraShaderMaterial;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.depthTest = false;
    mat.blending = THREE.NormalBlending;
    return mat;
  }, []);

  useEffect(() => {
    material.uColorA = new THREE.Color(isDark ? '#80BFE0' : '#A8C5E0');
    material.uColorB = new THREE.Color(isDark ? '#6FD4A2' : '#5BBF8E');
    material.uColorC = new THREE.Color(isDark ? '#F5BE73' : '#F0A855');
    material.uIntensity = isDark ? 0.74 : 0.9;
  }, [isDark, material]);

  useFrame((state) => {
    material.uTime = state.clock.elapsedTime;
  });

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function HeroAuraCanvas({ isDark, isReady = false, onReady }: HeroAuraCanvasProps) {
  return (
    <Canvas
      className={`hero-aura__canvas ${isReady ? 'hero-aura__canvas--ready' : ''}`}
      gl={{ alpha: true, antialias: false, powerPreference: 'default' }}
      dpr={[1, 1.25]}
      camera={{ position: [0, 0, 1], fov: 50 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        window.requestAnimationFrame(() => {
          window.setTimeout(() => onReady?.(), 120);
        });
      }}
    >
      <AuraPlane isDark={isDark} />
    </Canvas>
  );
}
