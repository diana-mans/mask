import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import cls from './FaceMeshComponent.module.scss';
import Webcam from 'react-webcam';

// Массив масок с их характеристиками
const masks = [
	{
		src: 'og.png',
		widthScale: 600,
		heightScale: 400,
		offsetX: 300,
		offsetY: 100,
	},
	{
		src: 'korona.png',
		widthScale: 1200,
		heightScale: 1200,
		offsetX: 600,
		offsetY: 1000,
	},
	{
		src: 'og.png',
		widthScale: 600,
		heightScale: 400,
		offsetX: 300,
		offsetY: 100,
	},
	{
		src: 'korona.png',
		widthScale: 1200,
		heightScale: 1200,
		offsetX: 600,
		offsetY: 1000,
	},
];

const FaceMeshComponent = () => {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [selectedMask, setSelectedMask] = useState(null);
	const maskImage = useRef(new Image());
	const [isPaused, setIsPaused] = useState(false);
	const cameraRef = useRef(null); // Хранение ссылки на Camera для управления
	const [cameraSize, setCameraSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight, // Use a common video aspect ratio, like 16:9
	});

	useEffect(() => {
		const updateCanvasSize = () => {
			setCameraSize({ width: window.innerWidth, height: window.innerHeight });
			const videoElement = videoRef.current;
			const canvasElement = canvasRef.current;

			if (videoElement.videoWidth && videoElement.videoHeight) {
				canvasElement.width = window.innerWidth;
				canvasElement.height = window.innerHeight;
			}
		};

		window.addEventListener('resize', updateCanvasSize);

		return () => window.removeEventListener('resize', updateCanvasSize);
	}, []);

	useEffect(() => {
		if (selectedMask !== null) {
			// Обновляем изображение маски при изменении maskImageSrc
			maskImage.current.src = masks[selectedMask].src;

			// Настраиваем FaceMesh
			const faceMesh = new FaceMesh({
				locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
			});

			faceMesh.setOptions({
				maxNumFaces: 1,
				refineLandmarks: true,
				minDetectionConfidence: 0.5,
				minTrackingConfidence: 0.5,
			});

			faceMesh.onResults(onResults);

			const videoElement = videoRef.current.video;
			const camera = new Camera(videoElement, {
				onFrame: async () => {
					// Камера будет запущена только при active
					await faceMesh.send({ image: videoElement });
				},
			});
			camera.start();
			cameraRef.current = camera; // Сохраняем камеру для управления остановкой и перезапуском

			function onResults(results) {
				if (canvasRef.current) {
					const canvasCtx = canvasRef.current.getContext('2d');
					canvasCtx.clearRect(0, 0, cameraSize.width, cameraSize.height); // Очищаем холст

					if (results.multiFaceLandmarks) {
						for (const landmarks of results.multiFaceLandmarks) {
							// Используем точки лица для позиционирования маски
							const leftEye = landmarks[33];
							const rightEye = landmarks[263];
							const forehead = landmarks[10]; // Верхняя точка лба

							// Вычисляем размеры маски на основе расстояния между глазами
							const eyeDistance = Math.sqrt(
								Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2),
							);

							const { widthScale, heightScale, offsetX, offsetY } = masks[selectedMask];

							// Позиционирование маски
							const x = forehead.x * cameraSize.width - eyeDistance * offsetX; // Центрируем маску
							const y = forehead.y * cameraSize.height - eyeDistance * offsetY;

							// Рисуем маску на Canvas
							canvasCtx.drawImage(
								maskImage.current,
								x,
								y,
								eyeDistance * widthScale,
								eyeDistance * heightScale,
							); // Масштабируем маску
						}
					}
				}
			}

			return () => {
				// Очищаем ресурсы при размонтировании компонента
				if (cameraRef.current) {
					cameraRef.current.stop();
				}
			};
		} else {
			// Настраиваем FaceMesh
			const faceMesh = new FaceMesh({
				locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
			});

			faceMesh.setOptions({
				maxNumFaces: 1,
				refineLandmarks: true,
				minDetectionConfidence: 0.5,
				minTrackingConfidence: 0.5,
			});

			faceMesh.onResults(onResults);

			const videoElement = videoRef.current.video;
			const camera = new Camera(videoElement, {
				onFrame: async () => {
					// Камера будет запущена только при active
					await faceMesh.send({ image: videoElement });
				},
			});
			camera.start();
			cameraRef.current = camera; // Сохраняем камеру для управления остановкой и перезапуском

			function onResults(results) {
				if (canvasRef.current && canvasRef.current.getContext) {
					const canvasCtx = canvasRef.current.getContext('2d');
					canvasCtx.clearRect(0, 0, cameraSize.width, cameraSize.height); // Очищаем холст
				}
			}

			return () => {
				// Очищаем ресурсы при размонтировании компонента
				if (cameraRef.current) {
					cameraRef.current.stop();
				}
			};
		}
	}, [selectedMask]); // Обновляем маску при изменении её источника

	// Функция выбора маски
	const selectMask = (index) => {
		setSelectedMask(index);
	};

	// Функция остановки кадра
	const stopFrame = useCallback(() => {
		cameraRef.current.stop(); // Немедленная остановка захвата камеры
		videoRef.current.video.pause(); // Остановка видео
		setIsPaused(true); // Установить состояние паузы
	}, []);

	// Функция для перезапуска кадра
	const restartFrame = useCallback(() => {
		cameraRef.current.start(); // Перезапуск захвата
		// videoRef.current.play(); // Перезапуск видео
		setIsPaused(false); // Снять паузу
	}, []);

	const firstHalf = masks.slice(0, Math.ceil(masks.length / 2));
	const secondHalf = masks.slice(Math.ceil(masks.length / 2));

	const getContainerX = () => {
		if (selectedMask === 0) {
			return '120px';
		} else if (selectedMask === 1) {
			return '60px';
		} else if (selectedMask === null) {
			return '0px';
		} else if (selectedMask === 2) {
			return '-60px';
		} else if (selectedMask === 3) {
			return '-120px';
		} else {
			return '0px';
		}
	};

	return (
		<div
			className={cls.main_container}
			style={{ width: `${cameraSize.width}px`, height: `${cameraSize.height}px` }}>
			<Webcam
				ref={videoRef}
				width={cameraSize.width}
				height={cameraSize.height}
				style={{
					display: 'block',
					width: `${cameraSize.width}px`,
					height: `${cameraSize.height}px`,
					objectFit: 'cover',
				}} // Скрываем видео, так как оно отображается на холсте
				autoPlay
				videoConstraints={{
					width: { ideal: 720 },
					height: { ideal: 1280 },
					facingMode: 'user',
				}}
				screenshotFormat='image/jpeg'
			/>
			<canvas
				ref={canvasRef}
				width={cameraSize.width}
				height={cameraSize.height}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: `${cameraSize.width}px`,
					height: `${cameraSize.height}px`,
				}}
			/>

			<div className={cls.mask_container} style={{ transform: `translateX(${getContainerX()})` }}>
				{firstHalf.map((el, idx) => (
					<button
						className={`${cls.mask_button} ${selectedMask === idx ? cls.selected : ''}`}
						onClick={() => {
							if (selectedMask === idx) {
								stopFrame();
							} else {
								selectMask(idx);
							}
						}}
						key={idx}>
						<img src={el.src} alt={`Mask ${idx}`} />
					</button>
				))}
				<button
					onClick={() => {
						if (selectedMask === null) {
							stopFrame();
						} else {
							selectMask(null);
						}
					}}
					className={`${cls.camera_button} ${selectedMask === null ? cls.selected : ''}`}
				/>
				{secondHalf.map((el, idx) => (
					<button
						className={`${cls.mask_button} ${
							selectedMask === idx + firstHalf.length ? cls.selected : ''
						}`}
						onClick={() => {
							if (selectedMask === idx + firstHalf.length) {
								stopFrame();
							} else {
								selectMask(idx + firstHalf.length);
							}
						}}
						key={idx + firstHalf.length}>
						<img src={el.src} alt={`Mask ${idx + firstHalf.length}`} />
					</button>
				))}
			</div>

			{/* Кнопка возобновления кадра */}
			{isPaused && (
				<button onClick={restartFrame} className={cls.close_button}>
					✖
				</button>
			)}
		</div>
	);
};

export default FaceMeshComponent;
