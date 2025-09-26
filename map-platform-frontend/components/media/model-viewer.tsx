'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Card } from '@/components/ui/card';
import { useStudioStore } from '@/lib/store';
import { DEFAULT_MODEL_URL } from '@/lib/constants';

export const ModelViewer: React.FC = () => {
  const { modelUrl } = useStudioStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#010409');
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(1.6, 1.6, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 10, 7.5);
    scene.add(ambient, directional);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    let animationFrame: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
      modelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!renderer || !scene) return;

    setIsLoading(true);
    setError(null);

    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.load(
      modelUrl || DEFAULT_MODEL_URL,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((obj) => {
          if ('isMesh' in obj) {
            (obj as THREE.Mesh).castShadow = true;
            (obj as THREE.Mesh).receiveShadow = true;
          }
        });
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);
        const scale = 2.5 / size;
        root.scale.setScalar(scale);
        scene.add(root);
        modelRef.current = root;
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load model', err);
        setError('Could not load model');
        setIsLoading(false);
      }
    );
  }, [modelUrl]);

  return (
    <Card padding="none" className="relative h-[320px]">
      <div ref={containerRef} className="h-full w-full" />
      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">Loading 3D model…</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-red-300">{error}</div>}
    </Card>
  );
};

export default ModelViewer;
