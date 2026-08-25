/**
 * SearchPatternService.js
 * Handles the generation and smoothing of specialized rover search patterns.
 */

const METERS_PER_DEG_LAT = 111320;
const metersPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

export const offsetMetersToLngLat = (originLat, originLon, dx, dy) => {
    return {
        latitude: originLat + dy / METERS_PER_DEG_LAT,
        longitude: originLon + dx / metersPerDegLon(originLat),
    };
};

const distToSegment = (p, a, b) => {
    const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(
        (p.x - (a.x + t * (b.x - a.x))) ** 2 + 
        (p.y - (a.y + t * (b.y - a.y))) ** 2
    );
};

/**
 * Iterates through the path segments to find the absolute nearest distance.
 */
export const nearestDistanceToPath = (sample, path) => {
    let minLineDist = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
        const d = distToSegment(sample, path[i], path[i + 1]);
        if (d < minLineDist) minLineDist = d;
    }
    return minLineDist;
};

const curveVertices = (points, radius = 2, segments = 8) => {
    if (points.length < 3) return points;
    
    const curvedPath = [];
    
    // Iterate through all points, treating the array as a closed loop
    for (let i = 0; i < points.length; i++) {
        // Use modulo to wrap indices for the start/end connection
        const p1 = points[(i - 1 + points.length) % points.length];
        const p2 = points[i];
        const p3 = points[(i + 1) % points.length];

        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const d1 = Math.sqrt(v1.x**2 + v1.y**2);
        const d2 = Math.sqrt(v2.x**2 + v2.y**2);
        
        const cornerDist = Math.min(radius, d1 / 2, d2 / 2);
        
        const q1 = { x: p2.x + v1.x * (cornerDist / d1), y: p2.y + v1.y * (cornerDist / d1) };
        const q2 = { x: p2.x + v2.x * (cornerDist / d2), y: p2.y + v2.y * (cornerDist / d2) };

        for (let t = 0; t <= 1; t += 1 / segments) {
            const x = (1 - t)**2 * q1.x + 2 * (1 - t) * t * p2.x + t**2 * q2.x;
            const y = (1 - t)**2 * q1.y + 2 * (1 - t) * t * p2.y + t**2 * q2.y;
            curvedPath.push({ x, y });
        }
    }
    
    // Close the loop by adding the first point of the curved path at the end
    curvedPath.push(curvedPath[0]);
    return curvedPath;
};

export const generateSearchPattern = (type, radius, spacing) => {
    let rawPts = [];

    if (type === "zigzag") {
        const bulgeDist = 2.5; 
        let rowCount = 0;

        // Iterate from bottom to top with flexible spacing
        for (let y = -radius; y <= radius; y += spacing) {
            const xEdge = Math.sqrt(Math.max(0, radius ** 2 - y ** 2));
            const isRightSide = rowCount % 2 === 0;
            const currentX = isRightSide ? xEdge : -xEdge;

            // 1. Add the entry point for the current line
            rawPts.push({ x: currentX, y: y });

            // 2. If there's another row coming, add the bulge-out points
            if (y + spacing <= radius) {
                const nextY = y + spacing;
                const nextXEdge = Math.sqrt(Math.max(0, radius ** 2 - nextY ** 2));
                
                // Drive outside the circle to widen the turn
                const bulgeX = isRightSide ? currentX + bulgeDist : currentX - bulgeDist;
                
                // Middle of the U-turn arc
                rawPts.push({ x: bulgeX, y: y + (spacing / 2) });
            }
            rowCount++;
        }
    } else if (type === "star") {
        // Pentagram logic (cross-through)
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i * 2) / 5 - Math.PI / 2;
            rawPts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        }
    }

    // Apply high-order curving to the raw "bulge" points
    return curveVertices(rawPts, 3.0); // Increased turning radius for smoother arcs
};