import { useState } from 'react';
import FaceMeshComponent from './ar/FaceMeshComponent';
import ThreeDMaskComponent from './ar/ThreeDMaskComponent';

export const App = () => {
	const [is3D, set3D] = useState(false);
	return (
		<div className='App'>
			{is3D ? <ThreeDMaskComponent /> : <FaceMeshComponent />}
			<button className='toggle' onClick={() => set3D((act) => !act)}>
				{is3D ? 'Toggle to 2D' : 'Toggle to 3D'}
			</button>
		</div>
	);
};
