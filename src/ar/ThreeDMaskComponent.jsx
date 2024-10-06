import React, { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import cls from './FaceMeshComponent.module.scss';

const cameraSize = {
	width: window.innerWidth,
	height: window.innerHeight,
};

const ThreeDMaskComponent = () => {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const maskRef = useRef(null); // Ссылка на загруженную модель очков

	useEffect(() => {
		if (!videoRef.current || !canvasRef.current) return;

		// Инициализация FaceMesh
		const faceMesh = new FaceMesh({
			locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
		});

		faceMesh.setOptions({
			maxNumFaces: 1,
			refineLandmarks: true,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5,
			useWorldLandmarks: true, // Включаем мировые координаты
		});

		faceMesh.onResults(onResults);

		// Инициализация Three.js
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, cameraSize.width / cameraSize.height, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
		renderer.setSize(cameraSize.width, cameraSize.height);

		// Настройка камеры Three.js
		camera.position.z = 5;

		// Добавляем освещение
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Мягкий свет
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Направленный свет
		directionalLight.position.set(0, 1, 1).normalize();
		scene.add(directionalLight);

		// Загрузка 3D-модели очков
		const loader = new GLTFLoader();
		loader.load('mask.glb', (gltf) => {
			const sunglasses = gltf.scene;
			sunglasses.scale.set(1, 1, 1); // Настройка масштаба модели
			scene.add(sunglasses);
			maskRef.current = sunglasses;
		});

		// Функция для обработки результатов FaceMesh
		function onResults(results) {
			if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && maskRef.current) {
				const landmarks = results.multiFaceLandmarks[0];

				// Точки на глазах
				const leftEye = landmarks[33]; // Левая сторона очков (глаз)
				const rightEye = landmarks[263]; // Правая сторона очков (глаз)

				// Рассчитываем центр между глазами для позиции очков
				const midPoint = {
					x: (leftEye.x + rightEye.x) / 2,
					y: (leftEye.y + rightEye.y) / 2,
					z: (leftEye.z + rightEye.z) / 2,
				};

				// Масштабируем очки в зависимости от расстояния между глазами
				const eyeDistance = Math.sqrt(
					Math.pow(rightEye.x - leftEye.x, 2) +
						Math.pow(rightEye.y - leftEye.y, 2) +
						Math.pow(rightEye.z - leftEye.z, 2),
				);

				const scale = 4;

				// Преобразование координат из диапазона [0,1] в координаты Three.js
				const x = (midPoint.x - 0.49) * cameraSize.width;
				const y = -(midPoint.y - 0.5) * cameraSize.height - 1230 * eyeDistance; // Смещение очков ниже для естественного положения
				const z = (midPoint.z + 100) * scale; // Используем масштаб для корректного позиционирования по оси Z

				// Применяем позицию для 3D-модели
				maskRef.current.position.set(x / scale, y / scale, -z / scale);

				// Рассчитываем углы для поворота модели
				const deltaX = rightEye.x - leftEye.x;
				const deltaY = rightEye.y - leftEye.y;

				// Поворот головы (влево/вправо) на основе глаз (отвечает за поворот головы)
				const rotationY = Math.atan2(rightEye.z - leftEye.z, deltaX);

				// Поворот по оси Z (наклон головы влево/вправо)
				const rotationZ = Math.atan2(deltaY, deltaX);

				// Применяем повороты по осям Y и Z
				maskRef.current.rotation.set(0, rotationY, -rotationZ);

				// Настройка масштаба очков в зависимости от расстояния между глазами
				const scaleFactor = eyeDistance * scale; // Увеличиваем масштаб для правильного размера очков
				maskRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);

				// Обновляем рендеринг Three.js
				renderer.render(scene, camera);
			} else if (maskRef.current) {
				// Если лицо не обнаружено, скрываем очки
				maskRef.current.visible = false;
			}
		}

		// Инициализация камеры
		const videoCamera = new Camera(videoRef.current, {
			onFrame: async () => {
				await faceMesh.send({ image: videoRef.current });
			},
			width: cameraSize.width,
			height: cameraSize.height,
		});
		videoCamera.start();

		// Анимация
		const animate = () => {
			requestAnimationFrame(animate);
			if (maskRef.current) {
				maskRef.current.visible = true; // Очки видны, если лицо обнаружено
			}
			renderer.render(scene, camera);
		};
		animate();
	}, []);

	return (
		<div
			className={cls.main_container}
			style={{
				display: 'block',
				width: `${cameraSize.width}px`,
				height: `${cameraSize.height}px`,
			}}>
			<video
				ref={videoRef}
				style={{
					display: 'block',
					width: `${cameraSize.width}px`,
					height: `${cameraSize.height}px`,
				}}
				autoPlay
				playsInline></video>
			<canvas
				ref={canvasRef}
				style={{
					position: 'absolute',
					zIndex: '20',
					top: '0px',
					width: `${cameraSize.width}px`,
					height: `${cameraSize.height}px`,
				}}></canvas>
		</div>
	);
};

export default ThreeDMaskComponent;
