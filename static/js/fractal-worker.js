/**
 * Web Worker for processing fractal frames
 * Handles CPU-intensive fractal processing off the main thread
 */

// Main worker entry point - receives data and processes it
self.onmessage = function(e) {
    const startTime = performance.now();
    
    try {
        const { data, patternType, parameters, timeInfo } = e.data;
        
        if (!data || !data.length) {
            throw new Error('No data provided to worker');
        }
        
        // Process the data based on type and parameters
        const processedData = processFrame(data, patternType, parameters, timeInfo);
        const dataSize = data.length;
        
        // Send the processed data back to the main thread
        const processingTime = performance.now() - startTime;
        
        self.postMessage({
            processedData,
            processingTime,
            dataSize
        });
    } catch (error) {
        self.postMessage({
            error: error.message || 'Unknown error in worker'
        });
    }
};

// Process a single frame - similar to main thread but optimized
function processFrame(data, patternType, params, timeInfo) {
    if (!data) return null;
    
    const size = data.length;
    const processed = Array(size).fill().map(() => Array(size).fill(0));
    
    // Destructure parameters
    const { complexity = 5, turbulence = 3, symmetry = 0, distortionFactor = 5 } = params || {};
    const { timeFactor = 0 } = timeInfo || {};
    
    // Normalize advanced parameters for use in calculations
    const complexityFactor = complexity / 5; // 5 is baseline
    const turbulenceFactor = turbulence / 5; // 5 is baseline
    const symmetryFactor = symmetry / 10; // 0-1 range
    
    // Process fractal - similar logic to main thread but optimized for worker
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let value = 0;
            
            // Calculate symmetry coordinates if needed
            let symI = i, symJ = j;
            if (symmetryFactor > 0) {
                // Apply different symmetry modes based on symmetry value
                if (symmetryFactor <= 0.33) {
                    // Horizontal symmetry
                    symI = i;
                    symJ = size - 1 - j;
                } else if (symmetryFactor <= 0.66) {
                    // Vertical symmetry
                    symI = size - 1 - i;
                    symJ = j;
                } else {
                    // Diagonal symmetry
                    symI = j;
                    symJ = i;
                }
            }
            
            // Generate different pattern types
            switch(patternType) {
                case 'wave':
                    // Enhanced wave patterns with complexity control
                    const wave1 = 0.5 + 0.5 * Math.sin(timeFactor * 0.2 * complexityFactor + (i+j)/size * Math.PI);
                    const wave2 = 0.3 + 0.3 * Math.sin(timeFactor * 1.0 * complexityFactor + i/(size*0.5) * Math.PI);
                    const wave3 = 0.2 + 0.2 * Math.cos(timeFactor * 1.5 * complexityFactor + j/(size*0.5) * Math.PI);
                    
                    // Add interference patterns affected by turbulence
                    const interference = 0.8 + 0.2 * Math.sin(i/(5/turbulenceFactor)) * Math.cos(j/(5/turbulenceFactor) + timeFactor);
                    
                    // Generate pattern by combining waves
                    value = data[i][j] * (wave1 + wave2 + wave3) * interference;
                    break;
                    
                case 'cellular':
                    // Cellular automata style with more neighborhood influence
                    // Get neighbors with wrap-around
                    const n1 = (i > 0) ? data[i-1][j] : data[size-1][j];
                    const n2 = (j > 0) ? data[i][j-1] : data[i][size-1];
                    const n3 = (i < size-1) ? data[i+1][j] : data[0][j];
                    const n4 = (j < size-1) ? data[i][j+1] : data[i][0];
                    
                    // Get diagonal neighbors for more complex patterns
                    const d1 = (i > 0 && j > 0) ? data[i-1][j-1] : data[(i-1+size)%size][(j-1+size)%size];
                    const d2 = (i > 0 && j < size-1) ? data[i-1][j+1] : data[(i-1+size)%size][(j+1)%size];
                    const d3 = (i < size-1 && j > 0) ? data[i+1][j-1] : data[(i+1)%size][(j-1+size)%size];
                    const d4 = (i < size-1 && j < size-1) ? data[i+1][j+1] : data[(i+1)%size][(j+1)%size];
                    
                    // Calculate neighbor influence based on complexity
                    const orthoWeight = 0.7 * complexityFactor;
                    const diagWeight = 0.3 * complexityFactor;
                    
                    // Weight adjustment based on turbulence
                    const randomFactor = turbulenceFactor * 0.1 * (Math.random() - 0.5);
                    
                    // Apply cellular rule
                    const neighborEffect = (
                        (n1 + n2 + n3 + n4) * orthoWeight +
                        (d1 + d2 + d3 + d4) * diagWeight
                    ) / (4 * orthoWeight + 4 * diagWeight);
                    
                    value = data[i][j] * (1 - orthoWeight - diagWeight) + neighborEffect + randomFactor;
                    break;
                    
                case 'spiral':
                    // Spiral pattern with rotating wave effect - adaptive to complexity
                    // Calculate distance from center (normalized 0-1)
                    const centerX = size / 2;
                    const centerY = size / 2;
                    const dx = i - centerX;
                    const dy = j - centerY;
                    const distanceFromCenter = Math.sqrt(dx*dx + dy*dy) / (size/2); // 0-1 range
                    
                    // Calculate angle from center (in radians)
                    let angle = Math.atan2(dy, dx);
                    
                    // Create spiral effect - combination of angle and distance
                    const spiralFactor = (angle + distanceFromCenter / (0.1 / complexityFactor) + timeFactor * 0.2) % (Math.PI * 2);
                    
                    // Create spiral wave 
                    const spiralWave = 0.5 + 0.5 * Math.sin(spiralFactor * 5 * complexityFactor);
                    
                    // Apply turbulence 
                    const spiralNoise = turbulenceFactor > 0 ? (Math.random() - 0.5) * 0.2 * turbulenceFactor : 0;
                    
                    value = data[i][j] * spiralWave + spiralNoise;
                    break;
                    
                case 'mandelbrot':
                    // Mandelbrot-inspired visualization - uses complex number operations
                    // Remap coordinates to Mandelbrot space
                    const x0 = (j / size) * 3.5 - 2.5; // -2.5 to 1
                    const y0 = (i / size) * 3 - 1.5;  // -1.5 to 1.5
                    
                    // Add time-based modulation
                    const offsetX = 0.1 * Math.sin(timeFactor * 0.1);
                    const offsetY = 0.1 * Math.cos(timeFactor * 0.1);
                    
                    // Apply Mandelbrot iteration with dynamic scaling
                    let x = 0, y = 0;
                    let iteration = 0;
                    const maxIterations = 20 * complexityFactor;
                    
                    while (x*x + y*y < 4 && iteration < maxIterations) {
                        // z = z^2 + c  (complex number operations)
                        const xTemp = x*x - y*y + x0 + offsetX;
                        y = 2*x*y + y0 + offsetY;
                        x = xTemp;
                        iteration++;
                    }
                    
                    // Normalize result and add randomness based on turbulence
                    const iterationRatio = iteration / maxIterations;
                    const randomness = turbulenceFactor > 0 ? (Math.random() - 0.5) * 0.1 * turbulenceFactor : 0;
                    
                    value = (data[i][j] * 0.3) + (iterationRatio * 0.7) + randomness;
                    break;
                    
                default: // 'chaotic' - default pattern
                    // Apply time-based modulation - normalized to maintain similar frequency across sizes
                    const timeMod = 0.5 + 0.5 * Math.sin(timeFactor * (0.5 + complexityFactor * 0.5) + 
                                                (Math.sqrt((i-size/2)*(i-size/2) + (j-size/2)*(j-size/2))/(size/2)) * 
                                                5 * complexityFactor);
                    
                    // Apply spatial distortion
                    const distortionAmount = distortionFactor / 10;
                    let distortI = i;
                    let distortJ = j;
                    
                    if (symmetryFactor > 0) {
                        distortI = symI;
                        distortJ = symJ;
                    }
                    
                    const distortX = Math.sin(distortI/size * 6.28318 * turbulenceFactor + timeFactor * 0.5) * distortionAmount;
                    const distortY = Math.cos(distortJ/size * 6.28318 * turbulenceFactor + timeFactor * 0.5) * distortionAmount;
                    
                    // Calculate distorted indices
                    let di = Math.floor(i + distortX * size);
                    let dj = Math.floor(j + distortY * size);
                    
                    // Ensure indices stay in bounds with wrap-around
                    di = (di + size) % size;
                    dj = (dj + size) % size;
                    
                    // Apply turbulence
                    const turbulence = turbulenceFactor > 0 ? 
                        (Math.random() - 0.5) * 0.2 * turbulenceFactor : 0;
                    
                    // Mix the base value with time modulation and distortions
                    value = data[di][dj] * timeMod + turbulence;
            }
            
            // Clamp value to valid range and store
            processed[i][j] = Math.max(0, Math.min(1, value));
        }
    }
    
    return processed;
}