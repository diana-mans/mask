import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import cls from './FaceMeshComponent.module.scss';

// Массив масок с их характеристиками
const masks = [
	{
		src: 'og.png',
		widthScale: 300,
		heightScale: 200,
		offsetX: 150,
		offsetY: 100,
	},
	{
		src: 'korona.png',
		widthScale: 600,
		heightScale: 600,
		offsetX: 300,
		offsetY: 550,
	},
	{
		src: 'og.png',
		widthScale: 300,
		heightScale: 200,
		offsetX: 150,
		offsetY: 100,
	},
	{
		src: 'korona.png',
		widthScale: 600,
		heightScale: 600,
		offsetX: 300,
		offsetY: 550,
	},
];

const cameraSize = {
	width: window.innerWidth,
	height: window.innerHeight,
};

const FaceMeshComponent = () => {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [selectedMask, setSelectedMask] = useState(null);
	const maskImage = useRef(new Image());
	const [isPaused, setIsPaused] = useState(false);
	const cameraRef = useRef(null); // Хранение ссылки на Camera для управления

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

			const videoElement = videoRef.current;
			const camera = new Camera(videoElement, {
				onFrame: async () => {
					// Камера будет запущена только при active
					await faceMesh.send({ image: videoElement });
				},
				width: cameraSize.width,
				height: cameraSize.height,
			});
			camera.start();
			cameraRef.current = camera; // Сохраняем камеру для управления остановкой и перезапуском

			function onResults(results) {
				const canvasCtx = canvasRef.current.getContext('2d');
				canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Очищаем холст
				canvasCtx.drawImage(videoElement, 0, 0, canvasRef.current.width, canvasRef.current.height); // Отображаем видеопоток

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
						const x = forehead.x * canvasRef.current.width - eyeDistance * offsetX; // Центрируем маску
						const y = forehead.y * canvasRef.current.height - eyeDistance * offsetY;

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

			const videoElement = videoRef.current;
			const camera = new Camera(videoElement, {
				onFrame: async () => {
					// Камера будет запущена только при active
					await faceMesh.send({ image: videoElement });
				},
				width: cameraSize.width,
				height: cameraSize.height,
			});
			camera.start();
			cameraRef.current = camera; // Сохраняем камеру для управления остановкой и перезапуском

			function onResults(results) {
				const canvasCtx = canvasRef.current.getContext('2d');
				canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Очищаем холст
				canvasCtx.drawImage(videoElement, 0, 0, canvasRef.current.width, canvasRef.current.height); // Отображаем видеопоток
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
		videoRef.current.pause(); // Остановка видео
		setIsPaused(true); // Установить состояние паузы
	}, []);

	// Функция для перезапуска кадра
	const restartFrame = useCallback(() => {
		cameraRef.current.start(); // Перезапуск захвата
		videoRef.current.play(); // Перезапуск видео
		setIsPaused(false); // Снять паузу
	}, []);

	const firstHalf = masks.slice(0, Math.ceil(masks.length / 2));
	const secondHalf = masks.slice(Math.ceil(masks.length / 2));

	const getContainerX = () => {
		console.log(selectedMask);
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
		<div className={cls.main_container}>
			<video
				ref={videoRef}
				style={{ display: 'none' }} // Скрываем видео, так как оно отображается на холсте
				autoPlay
			/>
			<canvas
				ref={canvasRef}
				width={cameraSize.width}
				height={cameraSize.height}
				style={{ position: 'absolute', top: 0, left: 0 }}
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
