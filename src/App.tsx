import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Planet from './components/Planet';
import Controls from './components/Controls';
import { WorldGenerator } from './core/WorldGenerator';
import type { CellData } from './core/WorldGenerator';
import './App.css';

function App() {
  const [params, setParams] = useState({
    seaLevel: 0.5,
    resolution: 2,
    axialTilt: 23.5,
    sunlight: 1,
    rotationSpeed: 1,
    rotationPeriod: 1,
    orbitalPeriod: 365
  });

  const [worldData, setWorldData] = useState<CellData[]>([]);
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);
  const generator = useMemo(() => new WorldGenerator(), []);

  const generate = () => {
    const data = generator.generateWorld(
      params.resolution,
      params.seaLevel,
      params.sunlight,
      params.axialTilt,
      params.rotationSpeed,
      params.rotationPeriod,
      params.orbitalPeriod
    );
    setWorldData(data);
  };

  const handleFileChange = async (file: File) => {
    await generator.loadHeightMap(file);
    generate();
  };

  const handleRandomize = () => {
    const seed = Math.random().toString(36).substring(7);
    generator.setSeed(seed);
    generate();
  };

  // Generate on mount and when resolution changes (optional, maybe manual only for perf)
  useEffect(() => {
    generate();
  }, [params.resolution]); // Only auto-regen on resolution change to avoid lag on slider drag

  useEffect(() => {
    generate();
  }, [params.seaLevel]);

  return (
    <div className="App">
      <Canvas camera={{ position: [0, 0, 25], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[50, 50, 50]} intensity={1} />
        <Stars />
        <OrbitControls enablePan={false} minDistance={15} maxDistance={50} />
        <Planet
          data={worldData}
          seaLevel={params.seaLevel}
          axialTilt={params.axialTilt}
          resolution={params.resolution}
          onHover={(cell) => {
            setHoveredCell(prev => {
              if (prev === cell) return prev;
              if (prev && cell && prev.h3Index === cell.h3Index) return prev;
              return cell;
            });
          }}
        />
      </Canvas>

      {hoveredCell && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontFamily: 'sans-serif',
          pointerEvents: 'none'
        }}>
          <h4>Cell Details</h4>
          <p>Biome: {hoveredCell.biome}</p>
          <p>Temp: {hoveredCell.temperature.toFixed(1)}°C</p>
          <p>Moisture: {(hoveredCell.moisture * 100).toFixed(0)}%</p>
          <p>Height: {hoveredCell.height.toFixed(2)}</p>
          <p>Lat/Lon: {hoveredCell.lat.toFixed(1)}, {hoveredCell.lon.toFixed(1)}</p>
        </div>
      )}

      <Controls
        params={params}
        setParams={setParams}
        onRegenerate={generate}
        onFileChange={handleFileChange}
        onRandomize={handleRandomize}
      />
    </div>
  );
}

export default App;
