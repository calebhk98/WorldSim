import React from 'react';

interface ControlsProps {
    params: {
        seaLevel: number;
        resolution: number;
        axialTilt: number;
        sunlight: number;
        rotationSpeed: number;
        rotationPeriod: number;
        orbitalPeriod: number;
        generationMethod: 'noise' | 'tectonic';
        heightScale: number;
    };
    setParams: React.Dispatch<React.SetStateAction<{
        seaLevel: number;
        resolution: number;
        axialTilt: number;
        sunlight: number;
        rotationSpeed: number;
        rotationPeriod: number;
        orbitalPeriod: number;
        generationMethod: 'noise' | 'tectonic';
        heightScale: number;
    }>>;
    onRegenerate: () => void;
    onFileChange: (file: File) => void;
    onRandomize: () => void;
}

const Controls: React.FC<ControlsProps> = ({ params, setParams, onRegenerate, onFileChange, onRandomize }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: name === 'generationMethod' ? value : parseFloat(value)
        }));
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileChange(e.target.files[0]);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '300px',
            fontFamily: 'sans-serif',
            maxHeight: '90vh',
            overflowY: 'auto'
        }}>
            <h3>World Controls</h3>

            <div style={{ marginBottom: '10px' }}>
                <label>Generation Method</label>
                <select
                    name="generationMethod"
                    value={params.generationMethod}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                >
                    <option value="noise">Simplex Noise</option>
                    <option value="tectonic">Tectonic Plates</option>
                </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Height Scale (Exaggeration)</label>
                <input
                    type="range"
                    name="heightScale"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={params.heightScale}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.heightScale}x</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Resolution (0-6)</label>
                <input
                    type="range"
                    name="resolution"
                    min="0"
                    max="6"
                    step="1"
                    value={params.resolution}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.resolution}</span>
                {params.resolution > 4 && (
                    <div style={{ color: 'orange', fontSize: '0.8em' }}>
                        Warning: High resolution may cause lag!
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Sea Level</label>
                <input
                    type="range"
                    name="seaLevel"
                    min="0"
                    max="1"
                    step="0.05"
                    value={params.seaLevel}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.seaLevel}</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Axial Tilt</label>
                <input
                    type="range"
                    name="axialTilt"
                    min="0"
                    max="90"
                    step="1"
                    value={params.axialTilt}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.axialTilt}°</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Sunlight Intensity</label>
                <input
                    type="range"
                    name="sunlight"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={params.sunlight}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.sunlight}x</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Rotation Speed (Coriolis)</label>
                <input
                    type="range"
                    name="rotationSpeed"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={params.rotationSpeed}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.rotationSpeed}x</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Rotation Period (Days)</label>
                <input
                    type="range"
                    name="rotationPeriod"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={params.rotationPeriod}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.rotationPeriod}</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Orbital Period (Days)</label>
                <input
                    type="range"
                    name="orbitalPeriod"
                    min="1"
                    max="365"
                    step="1"
                    value={params.orbitalPeriod}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
                <span>{params.orbitalPeriod}</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>Height Map (Image)</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    style={{ width: '100%', marginTop: '5px' }}
                />
            </div>

            <button
                onClick={onRandomize}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    marginBottom: '5px'
                }}
            >
                Randomize World
            </button>

            <button
                onClick={onRegenerate}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '5px'
                }}
            >
                Regenerate World
            </button>
        </div>
    );
};

export default Controls;
