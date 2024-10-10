import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/global.scss';
import FaceMeshComponent from './ar/FaceMeshComponent';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
