export interface ClimateParams {
    sunlightIntensity: number; // 0 to 2, default 1
    axialTilt: number; // Degrees, default 23.5
    rotationSpeed: number; // Multiplier, default 1
    seaLevel: number; // 0 to 1, default 0.5
}

export class ClimateSystem {
    static calculateInsolation(lat: number, lon: number, _tilt: number, sunlight: number, rotationPeriod: number, orbitalPeriod: number): number {
        // Tidal Locking Check
        const isTidallyLocked = Math.abs(rotationPeriod - orbitalPeriod) < 0.1;

        if (isTidallyLocked) {
            // Sub-stellar point model (0,0)
            const latRad = lat * Math.PI / 180;
            const lonRad = lon * Math.PI / 180;

            let dot = Math.cos(latRad) * Math.cos(lonRad);
            if (dot < 0) dot = 0;

            return dot * sunlight;
        } else {
            // Standard Latitudinal Model
            const latRad = lat * Math.PI / 180;
            return Math.cos(latRad) * sunlight;
        }
    }

    static calculateTemperature(insolation: number, height: number, seaLevel: number): number {
        // Base temp from insolation
        let temp = -20 + (insolation * 50);

        // Lapse rate
        if (height > seaLevel) {
            const altitude = height - seaLevel;
            temp -= altitude * 80; // Stronger drop with altitude (was 40)
        }

        return temp;
    }

    static calculateMoisture(lat: number, height: number, seaLevel: number, rotationSpeed: number): number {
        // Hadley cells simulation
        const cellWidth = 30 / Math.sqrt(rotationSpeed);
        const latAbs = Math.abs(lat);

        const phase = (latAbs / cellWidth) * Math.PI;
        let baseMoisture = (Math.cos(phase) + 1) / 2; // 0 to 1

        // Bias towards equator generally being wetter
        baseMoisture = baseMoisture * 0.8 + 0.1;

        // Orographic lift: Higher altitude = wetter (up to a point)
        if (height > seaLevel) {
            const altitude = height - seaLevel;
            baseMoisture += altitude * 0.5;
        }

        return Math.min(1, Math.max(0, baseMoisture));
    }

    static determineBiome(temp: number, moisture: number, height: number, seaLevel: number): string {
        if (height <= seaLevel) return 'OCEAN';

        if (temp < -5) return 'ICE';
        if (temp < 5) return 'TUNDRA';

        if (temp > 20) {
            if (moisture > 0.8) return 'TROPICAL_RAINFOREST';
            if (moisture > 0.4) return 'SAVANNA';
            return 'DESERT';
        }

        if (temp > 10) {
            if (moisture > 0.6) return 'TEMPERATE_FOREST';
            if (moisture > 0.3) return 'GRASSLAND';
            return 'DESERT'; // Cold desert
        }

        if (moisture > 0.5) return 'TAIGA';
        return 'TUNDRA';
    }

    static getBiomeColor(biome: string): string {
        switch (biome) {
            case 'OCEAN': return '#1da2d8';
            case 'ICE': return '#ffffff';
            case 'TUNDRA': return '#b7c2c4';
            case 'TROPICAL_RAINFOREST': return '#005c09';
            case 'SAVANNA': return '#a5bd2b';
            case 'DESERT': return '#e0c380';
            case 'TEMPERATE_FOREST': return '#2d8a2d';
            case 'GRASSLAND': return '#6da832';
            case 'TAIGA': return '#5b7c61';
            default: return '#ff00ff';
        }
    }
}
