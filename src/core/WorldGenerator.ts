import { cellToLatLng, cellToChildren, getRes0Cells } from 'h3-js';
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
        orbitalPeriod: number = 365
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

        const worldData: CellData[] = allCells.map(h3Index => {
            const [lat, lon] = cellToLatLng(h3Index);

            let heightVal = 0;

            if (this.heightMapContext) {
                // Sample from image
                // Map Lat (-90 to 90) to Y (height to 0)
                // Map Lon (-180 to 180) to X (0 to width)

                // Simple Equirectangular projection
                // lat: 90 -> 0, -90 -> height
                // lon: -180 -> 0, 180 -> width

                const x = ((lon + 180) / 360) * this.heightMapWidth;
                const y = ((90 - lat) / 180) * this.heightMapHeight;

                // Clamp
                const safeX = Math.max(0, Math.min(this.heightMapWidth - 1, Math.floor(x)));
                const safeY = Math.max(0, Math.min(this.heightMapHeight - 1, Math.floor(y)));

                const pixel = this.heightMapContext.getImageData(safeX, safeY, 1, 1).data;
                // Grayscale assumption: r=g=b
                heightVal = pixel[0] / 255;
            } else {
                // Generate procedural height
                let noiseVal = this.getNoise(lat, lon);
                heightVal = (noiseVal + 1) / 2; // 0 to 1
            }

            // Climate
            const insolation = ClimateSystem.calculateInsolation(lat, lon, axialTilt, sunlight, rotationPeriod, orbitalPeriod);
            const temp = ClimateSystem.calculateTemperature(insolation, heightVal, seaLevel);
            const moisture = ClimateSystem.calculateMoisture(lat, heightVal, seaLevel, rotationSpeed);
            const biome = ClimateSystem.determineBiome(temp, moisture, heightVal, seaLevel);

            return {
                h3Index,
                lat,
                lon,
                height: heightVal,
                temperature: temp,
                moisture,
                biome
            };
        });

        return worldData;
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
