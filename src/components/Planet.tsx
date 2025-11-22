import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { CellData } from '../core/WorldGenerator';
import { ClimateSystem } from '../core/ClimateSystem';

interface PlanetProps {
    data: CellData[];
    seaLevel: number;
    axialTilt: number;
    resolution: number;
    onHover: (cell: CellData | null) => void;
}

const Planet: React.FC<PlanetProps> = ({ data, seaLevel, axialTilt, resolution, onHover }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Calculate scale based on resolution to avoid gaps
    // H3 edge length roughly halves every resolution step.
    // Res 0: ~1100km edge. Res 1: ~418km. Res 2: ~158km.
    // We need a rough heuristic.
    // Res 0: scale ~ 0.25 (relative to radius 10?) No, let's tune.
    // Base scale for Res 2 was 0.5.
    // Let's try: 2.5 / (2 ^ resolution) ?
    // Res 0: 2.5. Res 1: 1.25. Res 2: 0.625. Res 3: 0.3125.
    const scale = useMemo(() => {
        // Tuned values for visual overlap
        const base = 2.8;
        return base / Math.pow(2.2, resolution);
    }, [resolution]);

    useEffect(() => {
        if (!meshRef.current) return;

        // Update instances
        data.forEach((cell, i) => {
            // Convert Lat/Lon to Cartesian
            const r = 10; // Radius of planet
            // Height extrusion
            // If ocean, keep at sea level (or slightly below). If land, extrude based on height.
            // Actually, for H3 cells, we usually map them to a sphere surface.
            // Let's vary the radius slightly by height.

            let h = cell.height;
            if (cell.height <= seaLevel) {
                h = seaLevel; // Flatten ocean
            }

            const radius = r + (h - seaLevel) * 0.5; // Exaggerate terrain

            const phi = (90 - cell.lat) * (Math.PI / 180);
            const theta = (cell.lon + 180) * (Math.PI / 180);

            const x = -(radius * Math.sin(phi) * Math.cos(theta));
            const z = (radius * Math.sin(phi) * Math.sin(theta));
            const y = (radius * Math.cos(phi));

            dummy.position.set(x, y, z);
            dummy.lookAt(0, 0, 0); // Point to center? No, point outwards.
            // lookAt points the positive z-axis.
            // We want the top of the cylinder (y-axis usually) to point outwards.
            // So we look at 0,0,0 then rotate X by -90?
            dummy.lookAt(0, 0, 0);
            dummy.rotateX(Math.PI / 2); // Orient cylinder top to face out

            // Scale based on cell size? H3 cells vary slightly.
            // For now constant scale.
            // const scale = 0.5; // Adjust based on resolution
            dummy.scale.set(scale, 1, scale); // Y is height (thickness)

            dummy.updateMatrix();
            if (meshRef.current) {
                meshRef.current.setMatrixAt(i, dummy.matrix);

                // Color
                const color = new THREE.Color(ClimateSystem.getBiomeColor(cell.biome));
                meshRef.current.setColorAt(i, color);
            }
        });

        if (meshRef.current) {
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

            // Apply axial tilt to the entire planet mesh
            // Tilt is usually around Z axis if Y is up and we want to tilt the "poles"
            // But we generated with Y as up (north).
            // So rotating around Z or X will tilt it.
            // Let's rotate around Z.
            meshRef.current.rotation.z = axialTilt * (Math.PI / 180);
        }

    }, [data, seaLevel, scale, axialTilt, dummy]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, data.length]}
            onPointerMove={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined) {
                    // Only update if the cell actually changed to avoid thrashing
                    // We can't easily check previous state here without refs or causing re-renders anyway
                    // But the parent onHover should handle it or be cheap.
                    // Let's just pass it.
                    onHover(data[e.instanceId]);
                }
            }}
        >
            <cylinderGeometry args={[1, 1, 0.1, 6]} />
            <meshStandardMaterial color="white" />
        </instancedMesh>
    );
};

export default Planet;
