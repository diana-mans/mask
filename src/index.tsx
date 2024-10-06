import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/global.scss';
import FaceMeshComponent from './ar/FaceMeshComponent';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<FaceMeshComponent />
	</React.StrictMode>,
);
