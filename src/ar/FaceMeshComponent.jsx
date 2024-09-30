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
];

const cameraSize = {
	width: 375,
	height: 667,
};

const FaceMeshComponent = () => {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [selectedMask, setSelectedMask] = useState(0);
	const maskImage = useRef(new Image());
	const [isPaused, setIsPaused] = useState(false);
	const cameraRef = useRef(null); // Хранение ссылки на Camera для управления

	useEffect(() => {
		// Обновляем изображение маски при изменении maskImageSrc
		maskImage.current.src = masks[selectedMask].src;

		console.log(maskImage.current.src);

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
			{/* Кнопка остановки кадра */}
			<button onClick={stopFrame} className={cls.camera_button} />

			{/* Кнопки выбора масок */}
			<div className={cls.mask_container}>
				{masks.map((el, idx) => {
					return (
						<button className={cls.mask_button} onClick={() => selectMask(idx)}>
							<img src={el.src} />
						</button>
					);
				})}
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
