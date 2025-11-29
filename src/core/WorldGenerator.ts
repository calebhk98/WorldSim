import { cellToLatLng, cellToChildren, getRes0Cells, gridDisk } from 'h3-js';
import { createNoise3D } from 'simplex-noise';
import { ClimateSystem } from './ClimateSystem';

export interface CellData {
    h3Index: string;
    lat: number;
    lon: number;
    height: number;
    temperature: number;
    moisture: number;
    biome: string;
    isRiver?: boolean;
}

export class WorldGenerator {
    private noise3D: (x: number, y: number, z: number) => number;
    private heightMapContext: CanvasRenderingContext2D | null = null;
    private heightMapWidth: number = 0;
    private heightMapHeight: number = 0;

    constructor(seed: string = 'world-sim') {
        this.noise3D = createNoise3D(() => {
            let h = 0x811c9dc5;
            for (let i = 0; i < seed.length; i++) {
                h ^= seed.charCodeAt(i);
                h = Math.imul(h, 0x01000193);
            }
            return (h >>> 0) / 4294967296;
        });
    }

    setSeed(seed: string) {
        this.noise3D = createNoise3D(() => {
            let h = 0x811c9dc5;
            for (let i = 0; i < seed.length; i++) {
                h ^= seed.charCodeAt(i);
                h = Math.imul(h, 0x01000193);
            }
            return (h >>> 0) / 4294967296;
        });
    }

    async loadHeightMap(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                this.heightMapContext = ctx;
                this.heightMapWidth = img.width;
                this.heightMapHeight = img.height;
                resolve();
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    generateWorld(
        resolution: number,
        seaLevel: number = 0.5,
        sunlight: number = 1,
        axialTilt: number = 23.5,
        rotationSpeed: number = 1,
        rotationPeriod: number = 1,
        orbitalPeriod: number = 365,
        generationMethod: 'noise' | 'tectonic' = 'noise'
    ): CellData[] {
        const res0 = getRes0Cells();
        let allCells: string[] = [];

        // Expand to target resolution
        if (resolution === 0) {
            allCells = res0;
        } else {
            res0.forEach(c => {
                const children = cellToChildren(c, resolution);
                allCells.push(...children);
            });
        }

        // Tectonic Generation State
        let tectonicHeights: Map<string, number> | null = null;
        if (generationMethod === 'tectonic') {
            tectonicHeights = this.generateTectonicPlates(allCells);
        }

        // First pass: Calculate heights
        let cellInfos = allCells.map(h3Index => {
            const [lat, lon] = cellToLatLng(h3Index);
            let heightVal = 0;

            if (this.heightMapContext) {
                const x = ((lon + 180) / 360) * this.heightMapWidth;
                const y = ((90 - lat) / 180) * this.heightMapHeight;
                const safeX = Math.max(0, Math.min(this.heightMapWidth - 1, Math.floor(x)));
                const safeY = Math.max(0, Math.min(this.heightMapHeight - 1, Math.floor(y)));
                const pixel = this.heightMapContext.getImageData(safeX, safeY, 1, 1).data;
                heightVal = pixel[0] / 255;
            } else if (generationMethod === 'tectonic' && tectonicHeights) {
                heightVal = tectonicHeights.get(h3Index) || 0;
                // Add some noise for detail
                const detail = this.getNoise(lat, lon) * 0.1;
                heightVal = Math.min(1, Math.max(0, heightVal + detail));
            } else {
                // Default Noise
                let noiseVal = this.getNoise(lat, lon);
                heightVal = (noiseVal + 1) / 2;
            }

            return { h3Index, lat, lon, height: heightVal };
        });

        // River Simulation
        const rivers = this.simulateRivers(cellInfos, seaLevel);

        // Final Pass: Climate & Biomes
        const worldData: CellData[] = cellInfos.map((info) => {
            const { h3Index, lat, lon, height } = info;
            const isRiver = rivers.has(h3Index);

            // Climate
            const insolation = ClimateSystem.calculateInsolation(lat, lon, axialTilt, sunlight, rotationPeriod, orbitalPeriod);
            const temp = ClimateSystem.calculateTemperature(insolation, height, seaLevel);
            let moisture = ClimateSystem.calculateMoisture(lat, height, seaLevel, rotationSpeed);

            // Rivers make things wetter
            if (isRiver) moisture += 0.3;

            let biome = ClimateSystem.determineBiome(temp, moisture, height, seaLevel);
            if (isRiver && height > seaLevel) biome = 'RIVER'; // Special biome for visualization

            return {
                h3Index,
                lat,
                lon,
                height,
                temperature: temp,
                moisture,
                biome,
                isRiver
            };
        });

        return worldData;
    }

    generateTectonicPlates(cells: string[]): Map<string, number> {
        const numPlates = 8 + Math.floor(Math.random() * 5);
        const centers = [];
        for (let i = 0; i < numPlates; i++) {
            centers.push(cells[Math.floor(Math.random() * cells.length)]);
        }

        const plateMap = new Map<string, number>(); // cell -> plateIndex
        const heightMap = new Map<string, number>();

        // 1. Assign plates (Voronoi)
        const centerCoords = centers.map(c => cellToLatLng(c));

        // Pre-calculate lat/lon for all cells to avoid repeated calls
        const cellCoords = cells.map(c => {
            const [lat, lon] = cellToLatLng(c);
            return { id: c, lat, lon };
        });

        cellCoords.forEach(c => {
            let minDist = Infinity;
            let plateId = 0;

            centerCoords.forEach((center, pid) => {
                const dLat = c.lat - center[0];
                const dLon = c.lon - center[1];
                const dist = dLat * dLat + dLon * dLon;
                if (dist < minDist) {
                    minDist = dist;
                    plateId = pid;
                }
            });
            plateMap.set(c.id, plateId);
        });

        // 2. Plate Interactions
        const plateHeights = centers.map(() => Math.random() * 0.8 + 0.1);

        cellCoords.forEach(c => {
            const pid = plateMap.get(c.id)!;
            let baseH = plateHeights[pid];
            heightMap.set(c.id, baseH);
        });

        return heightMap;
    }

    simulateRivers(cells: { h3Index: string, lat: number, lon: number, height: number }[], seaLevel: number): Set<string> {
        const rivers = new Set<string>();
        const numRivers = 50;

        // Map for quick lookup
        const heightMap = new Map<string, number>();
        cells.forEach(c => heightMap.set(c.h3Index, c.height));

        // Start random rivers at high altitude
        const candidates = cells.filter(c => c.height > seaLevel + 0.3);

        for (let i = 0; i < numRivers; i++) {
            if (candidates.length === 0) break;
            let current = candidates[Math.floor(Math.random() * candidates.length)];

            let pathLength = 0;
            while (current.height > seaLevel && pathLength < 100) {
                rivers.add(current.h3Index);

                // Find lower neighbor
                const neighbors = gridDisk(current.h3Index, 1);
                let bestNeighbor = null;
                let lowestHeight = current.height;

                for (const n of neighbors) {
                    if (n === current.h3Index) continue;
                    const h = heightMap.get(n);
                    if (h !== undefined && h < lowestHeight) {
                        lowestHeight = h;
                        bestNeighbor = n;
                    }
                }

                if (bestNeighbor) {
                    current = { h3Index: bestNeighbor, height: lowestHeight, lat: 0, lon: 0 };
                    pathLength++;
                } else {
                    break;
                }
            }
        }

        return rivers;
    }

    // 3D Noise generation on a sphere
    getNoise(lat: number, lon: number): number {
        const r = 1;
        const cosLat = Math.cos(lat * Math.PI / 180);
        const sinLat = Math.sin(lat * Math.PI / 180);
        const cosLon = Math.cos(lon * Math.PI / 180);
        const sinLon = Math.sin(lon * Math.PI / 180);

        const x = r * cosLat * cosLon;
        const y = r * cosLat * sinLon;
        const z = r * sinLat;

        // Octaves
        let v = 0;
        v += this.noise3D(x, y, z) * 1.0;
        v += this.noise3D(x * 2, y * 2, z * 2) * 0.5;
        v += this.noise3D(x * 4, y * 4, z * 4) * 0.25;

        // Normalize roughly
        return v / 1.75;
    }
}
