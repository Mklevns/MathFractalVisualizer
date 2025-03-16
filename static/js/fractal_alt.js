document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const canvas = document.getElementById('fractalCanvas');
    const ctx = canvas.getContext('2d');
    
    // WebGL renderer
    let webglRenderer = null;
    let useWebGL = false;  // Default to Canvas, enable WebGL on successful init
    let useLOD = true;     // Use Level of Detail optimization by default
    
    // Try to initialize WebGL renderer with robust fallback
    try {
        // Only try initialize after scripts are loaded
        setTimeout(() => {
            try {
                // Check for WebGL support first
                const testCanvas = document.createElement('canvas');
                const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
                
                if (!gl) {
                    throw new Error('WebGL not supported by this browser');
                }
                
                // If WebGL is supported, initialize the renderer
                webglRenderer = new FractalWebGLRenderer(canvas);
                if (webglRenderer && webglRenderer.initialized) {
                    useWebGL = true;
                    console.log('WebGL renderer successfully initialized');
                    
                    // Update UI if elements are already created
                    if (typeof updateRendererInfo === 'function') {
                        updateRendererInfo();
                    }
                    
                    // Re-render with WebGL if available
                    if (baseData) {
                        renderCurrentFrame();
                    }
                } else {
                    throw new Error('WebGL renderer could not be initialized');
                }
            } catch (error) {
                console.error('WebGL initialization failed, falling back to canvas rendering:', error);
                useWebGL = false;
                
                // Update UI to show fallback mode is active
                if (typeof updateRendererInfo === 'function') {
                    updateRendererInfo();
                }
                
                // After a delay, show notification to user
                setTimeout(() => {
                    if (typeof showNotification === 'function') {
                        showNotification(
                            'WebGL Not Available',
                            'Using Canvas renderer with limited 3D features.',
                            'warning'
                        );
                    }
                }, 1000);
                
                // Add warning icon to renderer indicator
                setTimeout(() => {
                    const rendererInfo = document.getElementById('rendererInfo');
                    if (rendererInfo) {
                        rendererInfo.innerHTML += ' <i class="fas fa-exclamation-triangle text-warning"></i>';
                    }
                    
                    // Disable WebGL toggle
                    const webglToggle = document.getElementById('webglToggle');
                    if (webglToggle) {
                        webglToggle.disabled = true;
                        webglToggle.checked = false;
                        webglToggle.parentElement.title = 'WebGL not supported by your browser';
                    }
                    
                    // Force '3d' rendering style to something Canvas-compatible
                    const renderingStyleSelect = document.getElementById('renderingStyle');
                    if (renderingStyleSelect && renderingStyleSelect.value === '3d') {
                        renderingStyleSelect.value = 'blocks';
                        if (typeof renderCurrentFrame === 'function') {
                            renderCurrentFrame();
                        }
                    }
                }, 500);
            }
        }, 200); // Increased delay for better reliability
    } catch (error) {
        console.error('WebGL setup error:', error);
        useWebGL = false;
    }
    
    // Buttons
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const randomizeBtn = document.getElementById('randomizeBtn');
    const applyBtn = document.getElementById('applyBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    // Fullscreen container
    const fractalContainer = document.getElementById('fractalContainer');
    
    // Basic controls
    const colorSchemeSelect = document.getElementById('colorScheme');
    const sizeRange = document.getElementById('sizeRange');
    const iterationsRange = document.getElementById('iterationsRange');
    const speedRange = document.getElementById('speedRange');
    const sizeValue = document.getElementById('sizeValue');
    const iterationsValue = document.getElementById('iterationsValue');
    const speedValue = document.getElementById('speedValue');
    
    // Advanced controls
    const complexityRange = document.getElementById('complexityRange');
    const turbulenceRange = document.getElementById('turbulenceRange');
    const symmetryRange = document.getElementById('symmetryRange');
    const waveSpeedRange = document.getElementById('waveSpeedRange');
    const patternTypeSelect = document.getElementById('patternType');
    const complexityValue = document.getElementById('complexityValue');
    const turbulenceValue = document.getElementById('turbulenceValue');
    const symmetryValue = document.getElementById('symmetryValue');
    const waveSpeedValue = document.getElementById('waveSpeedValue');
    
    // Display elements
    const seedDisplay = document.getElementById('seedDisplay');
    const fpsDisplay = document.getElementById('fpsDisplay');
    const timeFactorDisplay = document.getElementById('timeFactorDisplay');
    const distortionDisplay = document.getElementById('distortionDisplay');
    
    // Fractal parameters - simple configuration
    let size = 40;
    let iterations = 50;
    let seed = Math.floor(Math.random() * 1000);
    let animationSpeed = 50;
    let timeFactor = 0.0;
    let distortionFactor = 5.0;
    let animationRunning = false;
    let baseData = null;  // Store the original fractal data
    let lastFrameTime = 0;
    let fps = 0;
    let frameCount = 0;  // Counter for frame-skipping logic
    let currentColorScheme = 'blue'; // Default color scheme
    
    // Advanced fractal parameters
    let complexity = 5;         // Controls wave complexity
    let turbulence = 3;         // Controls randomness/chaos
    let symmetry = 0;           // Controls symmetry (0 = none, 10 = perfect)
    let waveSpeed = 5;          // Controls wave animation speed
    let patternType = 'chaotic'; // Current pattern algorithm type
    
    // Rendering style and effects
    let renderingStyle = 'blocks'; // 'blocks', 'points', 'lines', 'areas', '3d'
    let postProcessingEffect = 'none'; // 'none', 'glow', 'blur', 'edge'
    let effectIntensity = 5; // 1-10 scale for effect intensity
    let interactiveMode = false; // whether interactive mode is enabled
    let interactiveStrength = 0.8; // strength of interactive modifications
    
    // Rendering control elements
    const renderingStyleSelect = document.getElementById('renderingStyle');
    const postProcessingEffectSelect = document.getElementById('postProcessingEffect');
    const effectIntensityRange = document.getElementById('effectIntensityRange');
    const effectIntensityValue = document.getElementById('effectIntensityValue');
    
    // Update display values
    function updateDisplayValues() {
        // Basic parameters
        sizeValue.textContent = size;
        iterationsValue.textContent = iterations;
        speedValue.textContent = animationSpeed;
        seedDisplay.textContent = seed;
        timeFactorDisplay.textContent = timeFactor.toFixed(2);
        distortionDisplay.textContent = distortionFactor.toFixed(2);
        
        // Advanced parameters
        complexityValue.textContent = complexity;
        turbulenceValue.textContent = turbulence;
        symmetryValue.textContent = symmetry;
        waveSpeedValue.textContent = waveSpeed;
        
        // Rendering parameters
        effectIntensityValue.textContent = effectIntensity;
        
        // Update selectors and sliders to match values
        complexityRange.value = complexity;
        turbulenceRange.value = turbulence;
        symmetryRange.value = symmetry;
        waveSpeedRange.value = waveSpeed;
        patternTypeSelect.value = patternType;
        renderingStyleSelect.value = renderingStyle;
        postProcessingEffectSelect.value = postProcessingEffect;
        effectIntensityRange.value = effectIntensity;
    }
    
    // Resize canvas to fit container
    function resizeCanvas() {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        
        // Handle fullscreen mode differently
        if (fractalContainer.classList.contains('fullscreen-mode')) {
            // In fullscreen mode, use the entire viewport's smaller dimension (vmin)
            const maxSize = Math.min(window.innerWidth, window.innerHeight);
            canvas.width = maxSize;
            canvas.height = maxSize;
            
            // Make sure the canvas container fills the screen properly
            fractalContainer.style.width = '100vw';
            fractalContainer.style.height = '100vh';
        } else {
            // Normal mode - use container width for both dimensions
            canvas.width = containerWidth;
            canvas.height = containerWidth;
            
            // Reset any inline styles
            fractalContainer.style.width = '';
            fractalContainer.style.height = '';
        }
        
        // Update WebGL renderer viewport if available
        if (webglRenderer) {
            webglRenderer.resize();
        }
        
        // Re-render the current frame with the new canvas size
        if (baseData) {
            renderCurrentFrame();
        }
    }
    
    // Initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Add keyboard event listener for Escape key to exit fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && fractalContainer.classList.contains('fullscreen-mode')) {
            toggleFullscreen();
        }
    });
    
    updateDisplayValues();
    
    // ======== FRACTAL GENERATION ========
    
    // One-time initialization to fetch fractal data
    async function initFractalData() {
        console.log("Fetching initial fractal data...");
        try {
            // Show loading indicator for larger sizes
            if (size > 60) {
                showLoadingIndicator();
            }
            
            const startTime = performance.now();
            const response = await fetch(`/generate_fractal/${size}/${iterations}/${seed}`);
            if (!response.ok) throw new Error("Failed to fetch fractal data");
            
            const result = await response.json();
            baseData = result.data;
            
            // Store generation time for performance monitoring
            const fetchTime = performance.now() - startTime;
            if (result.generation_time) {
                // Log generation metrics with optimization info if available
                let optimizationInfo = result.optimization ? ` (${result.optimization} optimization)` : '';
                console.log(`Server generation: ${result.generation_time.toFixed(3)}s${optimizationInfo}, transfer: ${(fetchTime/1000 - result.generation_time).toFixed(3)}s`);
            }
            
            hideLoadingIndicator();
            console.log(`Initial fractal data loaded in ${fetchTime.toFixed(0)}ms`);
            return baseData;
        } catch (error) {
            hideLoadingIndicator();
            console.error("Error fetching fractal data:", error);
            return null;
        }
    }
    
    // Show a loading indicator during heavy computation
    function showLoadingIndicator() {
        // Create loading indicator if it doesn't exist
        if (!document.getElementById('loadingIndicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'loadingIndicator';
            indicator.style.position = 'absolute';
            indicator.style.top = '50%';
            indicator.style.left = '50%';
            indicator.style.transform = 'translate(-50%, -50%)';
            indicator.style.background = 'rgba(0,0,0,0.7)';
            indicator.style.color = 'white';
            indicator.style.padding = '20px';
            indicator.style.borderRadius = '10px';
            indicator.style.zIndex = 1000;
            indicator.innerHTML = 'Generating fractal data...<br><div class="spinner-border text-light mt-2" role="status"></div>';
            document.body.appendChild(indicator);
        } else {
            document.getElementById('loadingIndicator').style.display = 'block';
        }
    }
    
    // Hide the loading indicator
    function hideLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    // Generate a new fractal with current parameters
    async function generateNewFractal() {
        console.log(`Generating new fractal: size=${size}, iterations=${iterations}, seed=${seed}`);
        const wasRunning = animationRunning;
        
        if (wasRunning) stopAnimation();
        
        // Show loading indicator for larger sizes to improve UX
        if (size > 60) {
            showLoadingIndicator();
        }
        
        try {
            const startTime = performance.now();
            const response = await fetch(`/generate_fractal/${size}/${iterations}/${seed}`);
            if (!response.ok) throw new Error("Failed to fetch fractal data");
            
            const result = await response.json();
            baseData = result.data;
            
            // Log performance metrics with optimization info
            const fetchTime = performance.now() - startTime;
            let optimizationInfo = result.optimization ? ` (${result.optimization} optimization)` : '';
            console.log(`Fractal generated in ${fetchTime.toFixed(0)}ms${optimizationInfo}`);
            
            // Reset animation parameters
            timeFactor = 0;
            hideLoadingIndicator();
            renderCurrentFrame();
            
            if (wasRunning) startAnimation();
            return true;
        } catch (error) {
            hideLoadingIndicator();
            console.error("Error generating new fractal:", error);
            return false;
        }
    }
    
    // ======== ANIMATION CORE ========
    
    // Animation variables
    let animationFrameId = null;
    let useFastMode = false; // Performance optimization flag
    
    // WebWorker for processing large frames
    let fractalWorker = null;
    let workerBusy = false;
    let workerLastProcessedData = null; // Cache the last processed data
    let workerQueue = [];
    let usingWorker = false;
    let lastWorkerTimestamp = 0;
    
    // Initialize web worker
    function initFractalWorker() {
        if (window.Worker && !fractalWorker) {
            try {
                fractalWorker = new Worker('/static/js/fractal-worker.js');
                console.log("Fractal worker initialized");
                
                // Handle messages from the worker
                fractalWorker.onmessage = function(e) {
                    const { processedData, processingTime, dataSize, error } = e.data;
                    
                    if (error) {
                        console.error("Worker error:", error);
                        workerBusy = false;
                        return;
                    }
                    
                    // Store the result
                    workerLastProcessedData = processedData;
                    
                    if (processingTime > 16) { // Only log if processing took more than 16ms
                        console.log(`Worker processed ${dataSize}x${dataSize} in ${processingTime.toFixed(1)}ms`);
                    }
                    
                    // Update display if needed
                    if (usingWorker) {
                        renderData(processedData);
                    }
                    
                    // Process next item in queue if any
                    workerBusy = false;
                    processWorkerQueue();
                };
                
                // Handle errors
                fractalWorker.onerror = function(e) {
                    console.error("Worker error:", e);
                    workerBusy = false;
                    // Fall back to main thread processing
                    usingWorker = false;
                };
                
                return true;
            } catch (e) {
                console.error("Failed to initialize web worker:", e);
                return false;
            }
        }
        return false;
    }
    
    // Process worker queue
    function processWorkerQueue() {
        if (workerQueue.length > 0 && !workerBusy) {
            workerBusy = true;
            const nextTask = workerQueue.shift();
            fractalWorker.postMessage(nextTask);
        }
    }
    
    // Send data to worker for processing
    function processWithWorker(data, currentPatternType, params, timeInfo) {
        if (!fractalWorker || workerBusy) {
            // Worker is busy, add to queue if recently used, otherwise process on main thread
            if (usingWorker && performance.now() - lastWorkerTimestamp < 1000) {
                // Add to queue, but limit queue size
                if (workerQueue.length < 2) {
                    workerQueue.push({
                        data,
                        patternType: currentPatternType,
                        parameters: params,
                        timeInfo
                    });
                }
                return workerLastProcessedData || null; // Return last processed data or null
            } else {
                // Fall back to main thread processing if worker is overloaded
                return processFrameMainThread(data);
            }
        }
        
        // Send to worker
        workerBusy = true;
        lastWorkerTimestamp = performance.now();
        usingWorker = true;
        
        fractalWorker.postMessage({
            data,
            patternType: currentPatternType,
            parameters: {
                complexity,
                turbulence,
                symmetry,
                distortionFactor
            },
            timeInfo: {
                timeFactor
            }
        });
        
        // Return last processed data while waiting for new result
        return workerLastProcessedData || null;
    }
    
    // Process a single frame - Main entry point
    function processFrame(data) {
        if (!data) return null;
        
        const size = data.length;
        const useWorkerThreshold = 80; // Size threshold to use worker
        
        // For large data sets, try to use web worker
        if (size > useWorkerThreshold) {
            // Lazy initialize worker when needed
            if (!fractalWorker && window.Worker) {
                initFractalWorker();
            }
            
            // If worker is available, use it
            if (fractalWorker) {
                const params = { complexity, turbulence, symmetry, distortionFactor };
                const timeInfo = { timeFactor };
                return processWithWorker(data, patternType, params, timeInfo) || processFrameMainThread(data);
            }
        }
        
        // Fall back to main thread processing
        return processFrameMainThread(data);
    }
    
    // Process frame on main thread - original implementation with optimizations
    function processFrameMainThread(data) {
        if (!data) return null;
        
        const size = data.length;
        const processed = Array(size).fill().map(() => Array(size).fill(0));
        
        // Performance optimization for large data
        const startTime = performance.now();
        
        // Normalize advanced parameters for use in calculations
        const complexityFactor = complexity / 5; // 5 is baseline
        const turbulenceFactor = turbulence / 5; // 5 is baseline
        const symmetryFactor = symmetry / 10; // 0-1 range
        
        // Optimization for very large sizes: process fewer pixels
        const skipFactor = size > 100 ? 2 : 1;
        
        // Apply pattern generation based on selected pattern type and parameters
        for (let i = 0; i < size; i += skipFactor) {
            for (let j = 0; j < size; j += skipFactor) {
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
                        // Create spiral patterns
                        const centerX = size / 2;
                        const centerY = size / 2;
                        
                        // Calculate distance from center
                        const dx = i - centerX;
                        const dy = j - centerY;
                        const distance = Math.sqrt(dx*dx + dy*dy);
                        
                        // Calculate angle from center (in radians)
                        const angle = Math.atan2(dy, dx);
                        
                        // Create spiral effect
                        const spiralFactor = (angle + distance / (10/complexityFactor) + timeFactor * 0.2) % (Math.PI * 2);
                        const spiralWave = 0.5 + 0.5 * Math.sin(spiralFactor * 5 * complexityFactor);
                        
                        // Apply turbulence
                        const spiralNoise = turbulenceFactor > 0 ? 
                            (Math.random() - 0.5) * 0.2 * turbulenceFactor : 0;
                            
                        // Combine with base data
                        value = data[i][j] * 0.3 + spiralWave * 0.7 + spiralNoise;
                        break;
                        
                    case 'mandelbrot':
                        // Simplified Mandelbrot-like patterns
                        // Scale coordinates to Mandelbrot space
                        const x0 = (i / size * 3.5 - 2.5) * complexityFactor;
                        const y0 = (j / size * 2.0 - 1.0) * complexityFactor;
                        
                        // Simple escape-time calculation
                        let x = 0;
                        let y = 0;
                        let iteration = 0;
                        // For large sizes, reduce max iterations for performance
                        const maxIter = size > 100 ? 
                            10 + Math.floor(complexity) : 
                            15 + Math.floor(complexity * 2);
                        
                        while (x*x + y*y < 4 && iteration < maxIter) {
                            const xtemp = x*x - y*y + x0;
                            y = 2*x*y + y0;
                            x = xtemp;
                            iteration++;
                        }
                        
                        // Normalize and apply time-based modulation
                        const baseValue = iteration / maxIter;
                        const timeWave = 0.5 + 0.5 * Math.sin(timeFactor * 0.2 + baseValue * Math.PI);
                        
                        // Add distortion based on turbulence
                        const mbNoise = turbulenceFactor > 0 ? 
                            (Math.random() - 0.5) * 0.1 * turbulenceFactor : 0;
                            
                        // Combine with base data
                        value = data[i][j] * 0.2 + baseValue * 0.6 * timeWave + mbNoise;
                        break;
                        
                    case 'chaotic':
                    default:
                        // Chaotic combination of multiple techniques
                        // Base wave patterns
                        const chaosWave1 = 0.4 + 0.4 * Math.sin(timeFactor * 0.3 * complexityFactor + (i+j)/size * Math.PI);
                        const chaosWave2 = 0.3 + 0.3 * Math.sin(timeFactor * 0.8 * complexityFactor + i/(size*0.4) * Math.PI);
                        
                        // Cellular component - reduced influence
                        const cn1 = (i > 0) ? data[i-1][j] : data[size-1][j];
                        const cn2 = (j > 0) ? data[i][j-1] : data[i][size-1];
                        const cn3 = (i < size-1) ? data[i+1][j] : data[0][j];
                        const cn4 = (j < size-1) ? data[i][j+1] : data[i][0];
                        const cellFactor = (cn1 + cn2 + cn3 + cn4) / 4 * 0.2;
                        
                        // Distortion for flowing effect
                        const chaosPhaseShift = timeFactor * 0.15;
                        let cx1 = Math.floor(i + distortionFactor * 0.5 * Math.sin(j/size * Math.PI * 2 + chaosPhaseShift)) % size;
                        let cy1 = Math.floor(j + distortionFactor * 0.5 * Math.cos(i/size * Math.PI * 2 + chaosPhaseShift)) % size;
                        
                        // Handle negative indices
                        if (cx1 < 0) cx1 += size;
                        if (cy1 < 0) cy1 += size;
                        
                        // Turbulence factor
                        const chaosFactor = turbulenceFactor * 0.1 * (Math.random() - 0.5);
                        
                        // Combine all elements
                        value = data[i][j] * 0.3 + 
                                data[cx1][cy1] * 0.2 + 
                                cellFactor + 
                                chaosWave1 * 0.2 + 
                                chaosWave2 * 0.2 + 
                                chaosFactor;
                        break;
                }
                
                // If using skip factor, fill in all skipped cells with same value
                if (skipFactor > 1) {
                    for (let di = 0; di < skipFactor && i+di < size; di++) {
                        for (let dj = 0; dj < skipFactor && j+dj < size; dj++) {
                            // Apply symmetry blending if enabled
                            if (symmetryFactor > 0) {
                                const symValue = processed[symI][symJ];
                                // Only blend if symmetry point has already been calculated
                                if (symValue > 0) {
                                    // Blend between original and symmetry point based on symmetry factor
                                    processed[i+di][j+dj] = Math.min(1, Math.max(0, 
                                        value * (1 - symmetryFactor) + symValue * symmetryFactor));
                                } else {
                                    processed[i+di][j+dj] = Math.min(1, Math.max(0, value));
                                }
                            } else {
                                processed[i+di][j+dj] = Math.min(1, Math.max(0, value));
                            }
                        }
                    }
                } else {
                    // Apply symmetry blending if enabled
                    if (symmetryFactor > 0) {
                        const symValue = processed[symI][symJ];
                        // Only blend if symmetry point has already been calculated
                        if (symValue > 0) {
                            // Blend between original and symmetry point based on symmetry factor
                            value = value * (1 - symmetryFactor) + symValue * symmetryFactor;
                        }
                    }
                    
                    // Ensure values stay in valid range [0,1]
                    processed[i][j] = Math.min(1, Math.max(0, value));
                }
            }
        }
        
        // Log performance if processing took a significant amount of time
        const processTime = performance.now() - startTime;
        if (processTime > 50) {
            console.log(`Main thread processed ${size}x${size} in ${processTime.toFixed(1)}ms`);
        }
        
        return processed;
    }
    
    // Map value to color based on the selected color scheme
    function mapValueToColor(value, scheme) {
        // Ensure value is between 0 and 1
        value = Math.min(1, Math.max(0, value));
        
        // Apply contrast enhancement - makes low/high values more distinct
        // This creates a stronger S-curve which enhances mid-tones and expands the contrast range
        // Formula: increases contrast by pushing values away from 0.5 toward 0 or 1
        const enhancedValue = 0.5 + (value - 0.5) * 1.4;
        const contrastValue = Math.min(1, Math.max(0, enhancedValue));
        
        switch(scheme) {
            case 'blue': // Blue to cyan gradient with higher contrast
                return {
                    r: Math.floor(contrastValue * 70),  // Slightly more red for highlights
                    g: Math.floor(contrastValue * 170 + 50), // More green range
                    b: Math.floor(contrastValue * 180 + 75)  // Brighter blues
                };
                
            case 'green': // Green to yellow gradient with higher contrast
                return {
                    r: Math.floor(contrastValue * 220),       // Brighter yellows
                    g: Math.floor(contrastValue * 120 + 135), // Deeper greens
                    b: Math.floor(contrastValue * 40)         // Less blue contamination
                };
                
            case 'purple': // Purple to pink gradient with higher contrast
                return {
                    r: Math.floor(contrastValue * 170 + 85),  // More vibrant reds
                    g: Math.floor(contrastValue * 40),        // Less green for purer purples
                    b: Math.floor(contrastValue * 170 + 85)   // Deeper blues
                };
                
            case 'fire': // Fire (red to yellow) with higher contrast
                return {
                    r: Math.floor(contrastValue * 110 + 145), // More vibrant reds
                    g: Math.floor(contrastValue * 170),       // More dramatic yellows
                    b: Math.floor(contrastValue * 20)         // Deeper shadows
                };
                
            case 'grayscale': // Grayscale with higher contrast
                const gray = Math.floor(contrastValue * 220 + 35); // Wider range from dark to bright
                return {
                    r: gray,
                    g: gray,
                    b: gray
                };
                
            case 'rainbow': // Rainbow effect with higher contrast
                // Use HSL color model for rainbow effect
                const hue = (value * 360) % 360; // Full color wheel
                const saturation = 90; // Increased saturation for more vibrant colors
                const lightness = 45 + contrastValue * 40; // Wider range from darker to lighter
                
                // Convert HSL to RGB
                const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
                const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
                const m = lightness / 100 - c / 2;
                
                let r, g, b;
                if (hue < 60) {
                    [r, g, b] = [c, x, 0];
                } else if (hue < 120) {
                    [r, g, b] = [x, c, 0];
                } else if (hue < 180) {
                    [r, g, b] = [0, c, x];
                } else if (hue < 240) {
                    [r, g, b] = [0, x, c];
                } else if (hue < 300) {
                    [r, g, b] = [x, 0, c];
                } else {
                    [r, g, b] = [c, 0, x];
                }
                
                return {
                    r: Math.floor((r + m) * 255),
                    g: Math.floor((g + m) * 255),
                    b: Math.floor((b + m) * 255)
                };
                
            default: // Fallback to default blue scheme
                return {
                    r: Math.floor(value * 50),
                    g: Math.floor(value * 150 + 50),
                    b: Math.floor(value * 200 + 55)
                };
        }
    }
    
    // Render data to canvas - optimized with WebGL when available
    function renderData(data) {
        if (!data) return;
        
        const dataSize = data.length;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Performance counter
        const startTime = performance.now();
        
        // Always start with a clean canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Try to use WebGL rendering for better performance if available
        if (useWebGL && webglRenderer && webglRenderer.initialized) {
            try {
                // Update WebGL renderer with current parameters
                webglRenderer.updateFractalData(data);
                webglRenderer.setParameters({
                    time: timeFactor,
                    distortion: distortionFactor,
                    complexity: complexity,
                    turbulence: turbulence,
                    symmetry: symmetry,
                    patternType: patternType,
                    colorScheme: currentColorScheme,
                    renderingStyle: renderingStyle,
                    postProcessingEffect: postProcessingEffect,
                    effectIntensity: effectIntensity
                });
                
                // Render the scene using WebGL
                webglRenderer.render();
                
                // Performance measurement for WebGL
                const renderTime = performance.now() - startTime;
                if (renderTime > 20) {
                    console.log(`WebGL render: ${renderTime.toFixed(1)}ms for ${dataSize}x${dataSize} data`);
                }
                
                return; // Exit early, we're done rendering with WebGL
            } catch (error) {
                // If WebGL rendering fails, fall back to Canvas
                console.warn('WebGL rendering error, falling back to Canvas:', error);
                useWebGL = false;
                
                // Update UI to reflect change
                if (typeof updateRendererInfo === 'function') {
                    updateRendererInfo();
                }
            }
        }
        
        // Fall back to Canvas rendering if WebGL is not available or failed
        
        // Clear canvas for the 2D rendering
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // ASCII character set from dense to sparse - more variety
        const asciiChars = ['@', '#', '8', '&', '%', '$', 'X', 'o', '=', '+', ':', '~', '-', '*', '.', ' '];
        const numChars = asciiChars.length;
        
        // Performance optimization: Determine if we need to reduce rendering detail
        // For large data sizes, apply adaptive rendering to maintain performance
        let skipFactor = 1;
        let useFastMode = false;

        // Handle different optimization strategies based on data size
        if (dataSize > 100) {
            // For very large datasets, use a more aggressive optimization
            skipFactor = Math.ceil(dataSize / 100); // Skip cells to maintain ~100x100 rendering
            useFastMode = true;
        } else if (dataSize > 80) {
            // For large datasets, use fast optimization
            useFastMode = true;
        }
        
        // Calculate cell size based on canvas dimensions and data size
        const cellSize = canvasWidth / dataSize;
        
        let renderedCells = 0;
        
        // Create a temporary canvas for post-processing effects
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set text properties
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        
        // ------ RENDERING STYLES ------
        
        // Handle 3D style when WebGL is not available - use enhanced 'blocks' with depth shading
        if (renderingStyle === '3d' && !useWebGL) {
            // Force style change to 'blocks' with special depth handling
            const enhancedBlockSize = Math.max(1, Math.min(cellSize * 0.95, 20));
            
            for (let i = 0; i < dataSize; i += skipFactor) {
                for (let j = 0; j < dataSize; j += skipFactor) {
                    const value = data[i][j];
                    renderedCells++;
                    
                    // Skip very low values for performance
                    if (value < 0.05) continue;
                    
                    // Map value to color using the current color scheme
                    const color = mapValueToColor(value, currentColorScheme);
                    
                    // Create faux-3D effect by adding calculated shadows and highlights
                    // This simulates depth using lighting that doesn't require WebGL
                    let shadedColor = {
                        r: Math.floor(color.r * (0.7 + 0.3 * value)),  // Darker for lower values
                        g: Math.floor(color.g * (0.7 + 0.3 * value)),
                        b: Math.floor(color.b * (0.7 + 0.3 * value))
                    };
                    
                    // Calculate fake z-coordinate (height) based on value
                    const zHeight = value * 30;  // Scale for visual effect
                    
                    // Add depth shading - check neighbors for lighting angle
                    let leftVal = (j > 0) ? data[i][j-1] : 0;
                    let rightVal = (j < dataSize-1) ? data[i][j+1] : 0;
                    let topVal = (i > 0) ? data[i-1][j] : 0;
                    let bottomVal = (i < dataSize-1) ? data[i+1][j] : 0;
                    
                    // Calculate light direction differences
                    let lightModifier = 1.0;
                    if (value > leftVal) lightModifier += 0.15;
                    if (value > rightVal) lightModifier -= 0.1;
                    if (value > topVal) lightModifier += 0.15;
                    if (value > bottomVal) lightModifier -= 0.1;
                    
                    // Apply light modifier
                    shadedColor.r = Math.min(255, Math.max(0, Math.floor(shadedColor.r * lightModifier)));
                    shadedColor.g = Math.min(255, Math.max(0, Math.floor(shadedColor.g * lightModifier)));
                    shadedColor.b = Math.min(255, Math.max(0, Math.floor(shadedColor.b * lightModifier)));
                    
                    tempCtx.fillStyle = `rgb(${shadedColor.r}, ${shadedColor.g}, ${shadedColor.b})`;
                    
                    // Calculate position with small offset based on height to create pseudo-3D
                    const offsetX = (0.5 - value) * 2;  // Small pixel offset for 3D effect
                    const offsetY = (0.5 - value) * 2;
                    const x = j * cellSize + cellSize / 2 + offsetX;
                    const y = i * cellSize + cellSize / 2 + offsetY;
                    
                    // Draw rectangle with enhanced shadow effect
                    const blockSize = enhancedBlockSize * (0.7 + value * 0.3);  // Size varies with value
                    tempCtx.fillRect(x - blockSize/2, y - blockSize/2, blockSize, blockSize);
                    
                    // Add highlight dot for major points
                    if (value > 0.7 && !useFastMode) {
                        tempCtx.fillStyle = `rgba(255, 255, 255, ${value - 0.5})`;
                        tempCtx.beginPath();
                        tempCtx.arc(x - blockSize/4, y - blockSize/4, blockSize/5, 0, Math.PI * 2);
                        tempCtx.fill();
                    }
                }
            }
        }
        // Points style - draw circles
        else if (renderingStyle === 'points') {
            const pointSize = Math.max(2, Math.min(cellSize * 0.8, 10)); // Adaptive point size
            
            for (let i = 0; i < dataSize; i += skipFactor) {
                for (let j = 0; j < dataSize; j += skipFactor) {
                    const value = data[i][j];
                    renderedCells++;
                    
                    // Skip very low values for a sparse effect
                    if (value < 0.1) continue;
                    
                    // Map value to color using the current color scheme
                    const color = mapValueToColor(value, currentColorScheme);
                    tempCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                    
                    // Calculate position
                    const x = j * cellSize + cellSize / 2;
                    const y = i * cellSize + cellSize / 2;
                    
                    // Calculate point size based on value
                    const dynamicSize = pointSize * (0.5 + value * 0.5);
                    
                    // Draw a circle
                    tempCtx.beginPath();
                    tempCtx.arc(x, y, dynamicSize, 0, Math.PI * 2);
                    tempCtx.fill();
                }
            }
        }
        // Lines style - connect points with lines
        else if (renderingStyle === 'lines') {
            // Go through data and create line segments
            // We'll connect high-value cells with lines
            const threshold = 0.5; // Min value to consider for lines
            
            tempCtx.lineWidth = Math.max(1, cellSize / 4);
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';
            
            // Draw horizontal and vertical lines
            for (let i = 0; i < dataSize; i += skipFactor) {
                // Start a new path for each row/column
                tempCtx.beginPath();
                let pathStarted = false;
                
                // Draw horizontal lines
                for (let j = 0; j < dataSize; j += skipFactor) {
                    const value = data[i][j];
                    renderedCells++;
                    
                    if (value > threshold) {
                        const color = mapValueToColor(value, currentColorScheme);
                        tempCtx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                        
                        const x = j * cellSize + cellSize / 2;
                        const y = i * cellSize + cellSize / 2;
                        
                        if (!pathStarted) {
                            tempCtx.moveTo(x, y);
                            pathStarted = true;
                        } else {
                            tempCtx.lineTo(x, y);
                        }
                    } else if (pathStarted) {
                        // End the current line if value drops below threshold
                        tempCtx.stroke();
                        pathStarted = false;
                    }
                }
                
                // Draw the final line segment if path is still open
                if (pathStarted) {
                    tempCtx.stroke();
                }
            }
            
            // Draw diagonal lines for more complexity
            for (let diag = 0; diag < dataSize * 2; diag += skipFactor * 2) {
                tempCtx.beginPath();
                let pathStarted = false;
                
                for (let i = 0; i < diag && i < dataSize; i += skipFactor) {
                    const j = diag - i;
                    if (j < 0 || j >= dataSize) continue;
                    
                    const value = data[i][j];
                    
                    if (value > threshold) {
                        const color = mapValueToColor(value, currentColorScheme);
                        tempCtx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
                        
                        const x = j * cellSize + cellSize / 2;
                        const y = i * cellSize + cellSize / 2;
                        
                        if (!pathStarted) {
                            tempCtx.moveTo(x, y);
                            pathStarted = true;
                        } else {
                            tempCtx.lineTo(x, y);
                        }
                    } else if (pathStarted) {
                        tempCtx.stroke();
                        pathStarted = false;
                    }
                }
                
                if (pathStarted) {
                    tempCtx.stroke();
                }
            }
        }
        // Areas style - fill regions with color gradients
        else if (renderingStyle === 'areas') {
            // Draw color regions based on value contours
            const contourLevels = 7; // Number of distinct contour levels
            
            for (let level = contourLevels - 1; level >= 0; level--) {
                const threshold = level / contourLevels;
                
                // Go through all cells
                for (let i = 0; i < dataSize; i += skipFactor) {
                    for (let j = 0; j < dataSize; j += skipFactor) {
                        const value = data[i][j];
                        renderedCells++;
                        
                        // Only draw if value is above current contour level
                        if (value >= threshold) {
                            const color = mapValueToColor(value, currentColorScheme);
                            // Add transparency for layering effect
                            tempCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`;
                            
                            // Draw a circle with size proportional to value
                            const x = j * cellSize + cellSize / 2;
                            const y = i * cellSize + cellSize / 2;
                            const radius = cellSize * skipFactor * (0.5 + value * 0.5);
                            
                            tempCtx.beginPath();
                            tempCtx.arc(x, y, radius, 0, Math.PI * 2);
                            tempCtx.fill();
                        }
                    }
                }
            }
        }
        // 3D Visualization style - create a depth-based rendering with pseudo-3D perspective
        else if (renderingStyle === '3d') {
            // Create a pseudo-3D effect using canvas
            // This is only a fallback for when WebGL is not available
            
            // First create a grayscale heightmap
            tempCtx.fillStyle = 'black';
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Draw lighting-based 3D visualization
            const lightAngle = timeFactor * 0.2; // Rotate light source over time
            const lightX = Math.cos(lightAngle);
            const lightY = Math.sin(lightAngle);
            const intensity = effectIntensity / 10; // Map 1-10 to 0.1-1.0
            
            // Calculate normal vectors for lighting
            for (let i = skipFactor; i < dataSize - skipFactor; i += skipFactor) {
                for (let j = skipFactor; j < dataSize - skipFactor; j += skipFactor) {
                    renderedCells++;
                    
                    // Sample height at current point and neighboring points
                    const height = data[i][j];
                    const heightL = data[i][j-skipFactor];
                    const heightR = data[i][j+skipFactor];
                    const heightU = data[i-skipFactor][j];
                    const heightD = data[i+skipFactor][j];
                    
                    // Calculate simplified normal vector based on height differences
                    const nx = (heightL - heightR) * intensity;
                    const ny = (heightU - heightD) * intensity;
                    const nz = 0.1; // Small Z component to avoid completely flat normals
                    
                    // Calculate dot product with light direction for diffuse lighting
                    const dot = nx * lightX + ny * lightY + nz;
                    const lightValue = Math.max(0.3, 0.3 + 0.7 * dot); // Ambient + diffuse
                    
                    // Apply lighting to color
                    const baseColor = mapValueToColor(height, currentColorScheme);
                    const r = Math.floor(baseColor.r * lightValue);
                    const g = Math.floor(baseColor.g * lightValue);
                    const b = Math.floor(baseColor.b * lightValue);
                    
                    // Draw a rectangle for each cell
                    const x = j * cellSize;
                    const y = i * cellSize;
                    const adjustedSize = cellSize * skipFactor;
                    
                    tempCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    tempCtx.fillRect(x, y, adjustedSize, adjustedSize);
                }
            }
            
            // Add a subtle emboss effect for more depth
            tempCtx.globalCompositeOperation = 'overlay';
            tempCtx.fillStyle = 'rgba(255,255,255,0.1)';
            
            for (let i = skipFactor; i < dataSize - skipFactor; i += skipFactor) {
                for (let j = skipFactor; j < dataSize - skipFactor; j += skipFactor) {
                    const height = data[i][j];
                    const heightD = data[i+skipFactor][j];
                    const heightR = data[i][j+skipFactor];
                    
                    if (height > heightD || height > heightR) {
                        const x = j * cellSize;
                        const y = i * cellSize;
                        tempCtx.fillRect(x, y, cellSize * skipFactor, cellSize * skipFactor);
                    }
                }
            }
            
            // Reset composite operation
            tempCtx.globalCompositeOperation = 'source-over';
        }
        // Default blocks style - the original rendering style
        else {
            // Fast mode for larger data: draw rectangles with characters only for lower resolutions
            if (useFastMode) {
                for (let i = 0; i < dataSize; i += skipFactor) {
                    for (let j = 0; j < dataSize; j += skipFactor) {
                        const value = data[i][j];
                        renderedCells++;
                        
                        // Map value to color using the current color scheme
                        const color = mapValueToColor(value, currentColorScheme);
                        tempCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                        
                        // Skip ASCII chars for very small cells to improve performance
                        const effectiveCellSize = cellSize * skipFactor;
                        const x = j * cellSize;
                        const y = i * cellSize;
                        
                        // Draw filled rectangle
                        tempCtx.fillRect(x, y, effectiveCellSize, effectiveCellSize);
                        
                        // Always draw characters, adapting their size to be visible
                        // Determine char index based on value
                        const charIndex = Math.min(numChars - 1, Math.floor(value * numChars));
                        const char = asciiChars[charIndex];
                        
                        // Use a contrast color for text
                        tempCtx.fillStyle = getContrastColor(color);
                        
                        // Calculate position and adjust font size based on cell size
                        const centerX = x + effectiveCellSize / 2;
                        const centerY = y + effectiveCellSize / 2;
                        
                        // Ensure font size is appropriate - for very small cells we still
                        // want characters to be visible but not overwhelm the display
                        let fontSize;
                        if (effectiveCellSize < 4) {
                            fontSize = Math.max(4, effectiveCellSize * 1.0);
                        } else if (effectiveCellSize < 8) {
                            fontSize = Math.max(6, effectiveCellSize * 0.8);
                        } else {
                            fontSize = Math.max(8, effectiveCellSize * 0.7);
                        }
                        
                        // Draw the character
                        tempCtx.font = `bold ${fontSize}px monospace`;
                        tempCtx.fillText(char, centerX, centerY);
                    }
                }
            } 
            // Normal mode for smaller data sizes: full quality rendering
            else {
                for (let i = 0; i < dataSize; i++) {
                    for (let j = 0; j < dataSize; j++) {
                        const value = data[i][j];
                        renderedCells++;
                        
                        // Map value to color using the current color scheme
                        const color = mapValueToColor(value, currentColorScheme);
                        tempCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                        
                        // Calculate position
                        const x = j * cellSize + cellSize / 2;
                        const y = i * cellSize + cellSize / 2;
                        
                        // Draw filled rectangle first
                        tempCtx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                        
                        // Always draw characters, even for smaller cells
                        // Determine char index based on value
                        const charIndex = Math.min(numChars - 1, Math.floor(value * numChars));
                        const char = asciiChars[charIndex];
                        
                        // Use a contrast color for text
                        tempCtx.fillStyle = getContrastColor(color);
                        
                        // Calculate adaptive font size
                        let fontSize;
                        if (cellSize < 4) {
                            fontSize = 4; // Minimum font size
                        } else if (cellSize < 8) {
                            fontSize = Math.max(6, cellSize * 0.8);
                        } else {
                            fontSize = Math.max(8, cellSize * 0.7);
                        }
                        
                        // Draw the character
                        tempCtx.font = `bold ${fontSize}px monospace`;
                        tempCtx.fillText(char, x, y);
                    }
                }
            }
        }
        
        // ------ POST-PROCESSING EFFECTS ------
        
        // Apply post-processing effects based on selected effect
        if (postProcessingEffect !== 'none') {
            // Get image data for manipulation
            const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
            const pixels = imageData.data;
            
            // Prepare an offscreen canvas for effect processing
            const effectCanvas = document.createElement('canvas');
            effectCanvas.width = canvasWidth;
            effectCanvas.height = canvasHeight;
            const effectCtx = effectCanvas.getContext('2d');
            effectCtx.putImageData(imageData, 0, 0);
            
            // Get the intensity factor (0.1 to.1.0)
            const intensityFactor = effectIntensity / 10;
            
            // Apply different effects
            switch (postProcessingEffect) {
                case 'glow':
                    // Glow effect - blur and composite with original
                    tempCtx.globalCompositeOperation = 'source-over';
                    
                    // Draw blur layers with increasing blur radius
                    for (let i = 1; i <= 3; i++) {
                        const blurRadius = i * 3 * intensityFactor;
                        tempCtx.filter = `blur(${blurRadius}px)`;
                        tempCtx.globalAlpha = 0.3 / i;
                        tempCtx.drawImage(effectCanvas, 0, 0);
                    }
                    
                    // Reset filters and draw original on top
                    tempCtx.filter = 'none';
                    tempCtx.globalAlpha = 1.0;
                    tempCtx.drawImage(effectCanvas, 0, 0);
                    break;
                    
                case 'blur':
                    // Simple gaussian blur
                    tempCtx.filter = `blur(${6 * intensityFactor}px)`;
                    tempCtx.drawImage(effectCanvas, 0, 0);
                    tempCtx.filter = 'none';
                    break;
                    
                case 'edge':
                    // Edge detection effect - find edges and overlay
                    // First, create an edge detection version
                    const edgeImageData = effectCtx.getImageData(0, 0, canvasWidth, canvasHeight);
                    const edgePixels = edgeImageData.data;
                    const copyPixels = new Uint8ClampedArray(pixels.length);
                    
                    // Create a copy of the original pixels
                    for (let i = 0; i < pixels.length; i++) {
                        copyPixels[i] = pixels[i];
                    }
                    
                    // Simplified Sobel operator for edge detection
                    for (let y = 1; y < canvasHeight - 1; y++) {
                        for (let x = 1; x < canvasWidth - 1; x++) {
                            const idx = (y * canvasWidth + x) * 4;
                            
                            // Calculate gradient magnitude
                            const gx = 
                                -1 * copyPixels[idx - 4 - canvasWidth * 4] + 
                                 1 * copyPixels[idx + 4 - canvasWidth * 4] +
                                -2 * copyPixels[idx - 4] + 
                                 2 * copyPixels[idx + 4] +
                                -1 * copyPixels[idx - 4 + canvasWidth * 4] + 
                                 1 * copyPixels[idx + 4 + canvasWidth * 4];
                             
                            const gy = 
                                -1 * copyPixels[idx - 4 - canvasWidth * 4] + 
                                -2 * copyPixels[idx - canvasWidth * 4] +
                                -1 * copyPixels[idx + 4 - canvasWidth * 4] + 
                                 1 * copyPixels[idx - 4 + canvasWidth * 4] +
                                 2 * copyPixels[idx + canvasWidth * 4] +
                                 1 * copyPixels[idx + 4 + canvasWidth * 4];
                            
                            // Calculate gradient magnitude
                            const magnitude = Math.sqrt(gx * gx + gy * gy);
                            
                            // Apply threshold to create strong edges
                            const edgeValue = magnitude > 35 * intensityFactor ? 255 : 0;
                            
                            // Set edge pixel
                            edgePixels[idx] = 0; // R
                            edgePixels[idx + 1] = 0; // G
                            edgePixels[idx + 2] = 0; // B
                            edgePixels[idx + 3] = edgeValue; // A - use edge as alpha
                        }
                    }
                    
                    // Draw the original image
                    effectCtx.putImageData(edgeImageData, 0, 0);
                    
                    // Draw to the temp canvas
                    tempCtx.globalCompositeOperation = 'source-over';
                    tempCtx.drawImage(effectCanvas, 0, 0); // Original first
                    
                    // Then overlay with the edge detection
                    tempCtx.globalCompositeOperation = 'overlay';
                    tempCtx.drawImage(effectCanvas, 0, 0);
                    tempCtx.globalCompositeOperation = 'source-over';
                    
                    break;
            }
        }
        
        // Copy the result from the temp canvas to the main canvas
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Performance measurement for Canvas rendering
        const renderTime = performance.now() - startTime;
        
        // Display some debug info
        if (renderTime > 50) {
            console.log(`Canvas render: ${renderTime.toFixed(1)}ms, ${renderedCells} cells, style: ${renderingStyle}, effect: ${postProcessingEffect}`);
        }
    }
    
    // Helper function to get a contrasting color for text visibility with enhanced contrast
    function getContrastColor(color) {
        // Calculate color luminance using perceived brightness formula
        const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
        
        // Enhanced contrast for text:
        // For mid-range luminance values (around 0.4-0.6), we want sharper contrast
        if (luminance > 0.4 && luminance < 0.6) {
            // For these "borderline" cases, exaggerate the contrast
            return luminance >= 0.5 ? 'black' : 'white';
        }
        
        // For clear cases, add a slight outline effect by using semi-transparent text
        // This makes text more visible against any background
        return luminance > 0.6 ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)';
    }
    
    // Render current frame using base data
    function renderCurrentFrame() {
        if (!baseData) return;
        const processedData = processFrame(baseData);
        renderData(processedData);
        updateDisplayValues();
    }
    
    // Animation loop with performance optimization
    function animationLoop(timestamp) {
        // Calculate FPS
        if (lastFrameTime) {
            const delta = timestamp - lastFrameTime;
            fps = Math.round(1000 / delta);
            fpsDisplay.textContent = fps;
            
            // Adaptive performance optimization
            if (baseData) {
                const dataSize = baseData.length;
                if (fps < 20 && !useFastMode && dataSize > 40) {
                    useFastMode = true;
                    console.log("Enabling fast rendering mode for better performance");
                } else if (fps > 50 && useFastMode && dataSize <= 60) {
                    useFastMode = false;
                    console.log("Restoring high quality rendering mode");
                }
            }
        }
        lastFrameTime = timestamp;
        
        // Update parameters - wave speed now controls animation rate
        const speedFactor = waveSpeed / 5; // normalize to make 5 the baseline
        timeFactor += 0.03 * (animationSpeed / 50) * speedFactor;
        
        // Skip frames if browser is struggling (<25fps) for high intensity rendering
        const dataSize = baseData ? baseData.length : 0;
        const isHighIntensityRendering = (
            renderingStyle === '3d' || 
            postProcessingEffect !== 'none' || 
            (dataSize > 60 && renderingStyle !== 'points')
        );
        
        const skipThisFrame = 
            isHighIntensityRendering && 
            fps < 25 &&
            frameCount % 2 !== 0; // Skip every other frame for complex visualizations
            
        if (!skipThisFrame) {
            // Render the current frame
            renderCurrentFrame();
        }
        
        frameCount++;
        
        // Continue the loop
        animationFrameId = requestAnimationFrame(animationLoop);
    }
    
    // Start animation
    function startAnimation() {
        if (animationRunning) return;
        
        if (!baseData) {
            console.log("No data available, fetching first...");
            initFractalData().then(data => {
                if (data) {
                    animationRunning = true;
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                    animationFrameId = requestAnimationFrame(animationLoop);
                    console.log("Animation started");
                }
            });
        } else {
            animationRunning = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            animationFrameId = requestAnimationFrame(animationLoop);
            console.log("Animation started");
        }
    }
    
    // Stop animation
    function stopAnimation() {
        if (!animationRunning) return;
        
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        animationRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        console.log("Animation stopped");
    }
    
    // Reset animation parameters
    function resetAnimation() {
        // Reset parameters but keep the same fractal data
        timeFactor = 0.0;
        distortionFactor = 5.0;
        
        // Reset advanced parameters to default values
        complexity = 5;
        turbulence = 3;
        symmetry = 0;
        waveSpeed = 5;
        patternType = 'chaotic';
        
        // Update UI elements
        complexityRange.value = complexity;
        turbulenceRange.value = turbulence;
        symmetryRange.value = symmetry;
        waveSpeedRange.value = waveSpeed;
        patternTypeSelect.value = patternType;
        
        updateDisplayValues();
        renderCurrentFrame();
        console.log("Animation parameters reset to defaults");
    }
    
    // Randomize parameters
    function randomizeParams() {
        // Basic parameters
        size = Math.floor(Math.random() * 60) + 20; // 20-80
        iterations = Math.floor(Math.random() * 50) + 20; // 20-70
        seed = Math.floor(Math.random() * 1000);
        animationSpeed = Math.floor(Math.random() * 80) + 20; // 20-100
        
        // Advanced parameters
        complexity = Math.floor(Math.random() * 10) + 1; // 1-10
        turbulence = Math.floor(Math.random() * 10) + 1; // 1-10
        symmetry = Math.floor(Math.random() * 11); // 0-10
        waveSpeed = Math.floor(Math.random() * 10) + 1; // 1-10
        
        // Select random pattern type
        const patternTypes = ['chaotic', 'wave', 'cellular', 'spiral', 'mandelbrot'];
        const randomIndex = Math.floor(Math.random() * patternTypes.length);
        patternType = patternTypes[randomIndex];
        
        // Update slider values
        sizeRange.value = size;
        iterationsRange.value = iterations;
        speedRange.value = animationSpeed;
        complexityRange.value = complexity;
        turbulenceRange.value = turbulence;
        symmetryRange.value = symmetry;
        waveSpeedRange.value = waveSpeed;
        patternTypeSelect.value = patternType;
        
        // Random color scheme
        const colorSchemes = ['blue', 'green', 'purple', 'fire', 'grayscale', 'rainbow'];
        const randomColorIndex = Math.floor(Math.random() * colorSchemes.length);
        currentColorScheme = colorSchemes[randomColorIndex];
        colorSchemeSelect.value = currentColorScheme;
        
        updateDisplayValues();
        console.log("Parameters fully randomized");
    }
    
    // ======== EVENT LISTENERS ========
    
    // WebGL rendering toggles
    const webglToggle = document.getElementById('webglToggle');
    const lodToggle = document.getElementById('lodToggle');
    const rendererInfo = document.getElementById('rendererInfo');
    
    // Update renderer info display
    function updateRendererInfo() {
        if (useWebGL && webglRenderer) {
            rendererInfo.textContent = 'WebGL Active';
            rendererInfo.className = 'badge bg-info';
            lodToggle.disabled = false;
        } else {
            rendererInfo.textContent = 'Canvas 2D';
            rendererInfo.className = 'badge bg-secondary';
            lodToggle.disabled = true;
        }
    }
    
    // Initialize WebGL toggle with current state
    if (webglToggle) {
        webglToggle.checked = useWebGL;
        
        webglToggle.addEventListener('change', function() {
            useWebGL = this.checked;
            updateRendererInfo();
            renderCurrentFrame(); // Re-render with new renderer
            console.log(`WebGL rendering ${useWebGL ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Initialize LOD toggle with current state
    if (lodToggle) {
        lodToggle.checked = useLOD;
        
        lodToggle.addEventListener('change', function() {
            useLOD = this.checked;
            
            // Update WebGL LOD settings if available
            if (webglRenderer) {
                webglRenderer.setLODEnabled(useLOD);
                console.log(`WebGL Level of Detail ${useLOD ? 'enabled' : 'disabled'}`);
            }
            
            renderCurrentFrame(); // Re-render with new LOD setting
        });
    }
    
    // Initialize renderer info badge
    updateRendererInfo();
    
    // Basic slider event listeners
    sizeRange.addEventListener('input', e => {
        size = parseInt(e.target.value);
        sizeValue.textContent = size;
    });
    
    iterationsRange.addEventListener('input', e => {
        iterations = parseInt(e.target.value);
        iterationsValue.textContent = iterations;
    });
    
    speedRange.addEventListener('input', e => {
        animationSpeed = parseInt(e.target.value);
        speedValue.textContent = animationSpeed;
    });
    
    // Advanced parameter sliders
    complexityRange.addEventListener('input', e => {
        complexity = parseInt(e.target.value);
        complexityValue.textContent = complexity;
        renderCurrentFrame(); // Apply changes immediately
    });
    
    turbulenceRange.addEventListener('input', e => {
        turbulence = parseInt(e.target.value);
        turbulenceValue.textContent = turbulence;
        renderCurrentFrame(); // Apply changes immediately
    });
    
    symmetryRange.addEventListener('input', e => {
        symmetry = parseInt(e.target.value);
        symmetryValue.textContent = symmetry;
        renderCurrentFrame(); // Apply changes immediately
    });
    
    waveSpeedRange.addEventListener('input', e => {
        waveSpeed = parseInt(e.target.value);
        waveSpeedValue.textContent = waveSpeed;
        renderCurrentFrame(); // Apply changes immediately
    });
    
    // Pattern type selector
    patternTypeSelect.addEventListener('change', e => {
        patternType = e.target.value;
        console.log(`Pattern type changed to: ${patternType}`);
        renderCurrentFrame(); // Apply changes immediately
    });
    
    // Color scheme selector
    colorSchemeSelect.addEventListener('change', e => {
        currentColorScheme = e.target.value;
        console.log(`Color scheme changed to: ${currentColorScheme}`);
        // No need to regenerate data, just rerender with new color scheme
        renderCurrentFrame();
    });
    
    // Rendering style selector
    renderingStyleSelect.addEventListener('change', e => {
        renderingStyle = e.target.value;
        console.log(`Rendering style changed to: ${renderingStyle}`);
        renderCurrentFrame();
    });
    
    // Post-processing effect selector
    postProcessingEffectSelect.addEventListener('change', e => {
        postProcessingEffect = e.target.value;
        console.log(`Post-processing effect changed to: ${postProcessingEffect}`);
        renderCurrentFrame();
    });
    
    // Effect intensity slider
    effectIntensityRange.addEventListener('input', e => {
        effectIntensity = parseInt(e.target.value);
        effectIntensityValue.textContent = effectIntensity;
        renderCurrentFrame();
    });
    
    // Fullscreen toggle function
    function toggleFullscreen() {
        fractalContainer.classList.toggle('fullscreen-mode');
        
        // Force resize after toggling fullscreen to ensure proper display
        setTimeout(resizeCanvas, 100);
        
        // Update rendering
        renderCurrentFrame();
        
        // Update the fullscreen button icon - create new icon element to avoid issues
        if (fractalContainer.classList.contains('fullscreen-mode')) {
            fullscreenBtn.innerHTML = '<i data-feather="minimize"></i>';
        } else {
            fullscreenBtn.innerHTML = '<i data-feather="maximize"></i>';
        }
        
        // Initialize the feather icons after changing the HTML
        feather.replace();
    }
    
    // Button event listeners
    startBtn.addEventListener('click', startAnimation);
    stopBtn.addEventListener('click', stopAnimation);
    resetBtn.addEventListener('click', resetAnimation);
    applyBtn.addEventListener('click', generateNewFractal);
    randomizeBtn.addEventListener('click', randomizeParams);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Interactive mode toggle
    const interactiveToggle = document.getElementById('interactiveToggle');
    if (interactiveToggle) {
        interactiveToggle.addEventListener('change', function() {
            interactiveMode = this.checked;
            console.log(`Interactive mode ${interactiveMode ? 'enabled' : 'disabled'}`);
            
            // Update cursor style to indicate interactivity
            canvas.style.cursor = interactiveMode ? 'crosshair' : 'default';
            
            if (interactiveMode) {
                // Show a tooltip or notification
                showNotification('Interactive Mode Enabled', 'Click on the fractal to add patterns', 'info');
            }
        });
    }
    
    // Add click handler to canvas for interactive mode
    canvas.addEventListener('click', function(e) {
        if (!interactiveMode || !baseData) return;
        
        // Get click coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert to data coordinates
        const dataSize = baseData.length;
        const dataX = Math.floor((clickX / canvas.width) * dataSize);
        const dataY = Math.floor((clickY / canvas.height) * dataSize);
        
        // Apply interactive modification to the base data
        applyInteractiveEffect(dataX, dataY);
        
        // Re-render the current frame with the modified data
        renderCurrentFrame();
    });
    
    // Helper function to show notifications
    function showNotification(title, message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.padding = '15px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '1000';
            notification.style.maxWidth = '300px';
            notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            notification.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(notification);
        }
        
        // Set style based on type
        if (type === 'info') {
            notification.style.backgroundColor = 'var(--bs-info)';
            notification.style.color = 'white';
        } else if (type === 'success') {
            notification.style.backgroundColor = 'var(--bs-success)';
            notification.style.color = 'white';
        } else if (type === 'warning') {
            notification.style.backgroundColor = 'var(--bs-warning)';
            notification.style.color = 'black';
        } else if (type === 'error') {
            notification.style.backgroundColor = 'var(--bs-danger)';
            notification.style.color = 'white';
        }
        
        // Set content
        notification.innerHTML = `
            <h5 style="margin-top: 0;">${title}</h5>
            <p style="margin-bottom: 0;">${message}</p>
        `;
        
        // Show notification
        notification.style.opacity = '1';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
    
    // Function to apply interactive effect at the clicked point
    function applyInteractiveEffect(x, y) {
        if (!baseData) return;
        
        const dataSize = baseData.length;
        const effectRadius = Math.max(5, Math.floor(dataSize / 10)); // Scale with fractal size
        const strength = interactiveStrength;
        
        // Performance optimization - track modified regions for partial rendering
        let minModifiedX = x - effectRadius;
        let maxModifiedX = x + effectRadius;
        let minModifiedY = y - effectRadius;
        let maxModifiedY = y + effectRadius;
        
        // Ensure bounds are within data array
        minModifiedX = Math.max(0, minModifiedX);
        maxModifiedX = Math.min(dataSize - 1, maxModifiedX);
        minModifiedY = Math.max(0, minModifiedY);
        maxModifiedY = Math.min(dataSize - 1, maxModifiedY);
        
        // For 3D mode and very large data, use optimized circular application with fewer samples
        const isHighPerformanceMode = (renderingStyle === '3d' || dataSize > 60);
        const stepSize = isHighPerformanceMode ? 2 : 1; // Skip pixels for faster processing in high-performance mode
        
        // Apply ripple/wave effect around clicked point
        for (let i = minModifiedY; i <= maxModifiedY; i += stepSize) {
            for (let j = minModifiedX; j <= maxModifiedX; j += stepSize) {
                // Calculate distance from click using square approximation for speed
                const dx = j - x;
                const dy = i - y;
                const distanceSquared = dx * dx + dy * dy;
                const radiusSquared = effectRadius * effectRadius;
                
                if (distanceSquared <= radiusSquared) {
                    // Use faster approximate distance calculation
                    const distance = Math.sqrt(distanceSquared);
                    
                    // Create a wave effect that diminishes with distance
                    const factor = 1 - (distance / effectRadius);
                    
                    // Apply different effects based on pattern type
                    if (patternType === 'wave' || patternType === 'spiral') {
                        // Optimized wave pattern calculation
                        // Use lookup-based sin approximation for faster computation
                        const waveAngle = distance * 0.5;
                        const wave = 0.5 * factor * Math.sin(waveAngle);
                        baseData[i][j] = Math.min(1, Math.max(0, baseData[i][j] + wave * strength));
                        
                        // Fill adjacent pixels for stepSize > 1 for smooth effect
                        if (stepSize > 1) {
                            if (i + 1 <= maxModifiedY) baseData[i+1][j] = baseData[i][j];
                            if (j + 1 <= maxModifiedX) baseData[i][j+1] = baseData[i][j];
                            if (i + 1 <= maxModifiedY && j + 1 <= maxModifiedX) baseData[i+1][j+1] = baseData[i][j];
                        }
                    } else if (patternType === 'mandelbrot') {
                        // For mandelbrot-like, add structured perturbation with optimized calculation
                        const angle1 = distance * 0.8;
                        const angle2 = distance * 0.5;
                        const perturbation = factor * Math.sin(angle1) * Math.cos(angle2);
                        baseData[i][j] = Math.min(1, Math.max(0, baseData[i][j] + perturbation * strength));
                        
                        // Fill adjacent pixels for stepSize > 1 for smooth effect
                        if (stepSize > 1) {
                            if (i + 1 <= maxModifiedY) baseData[i+1][j] = baseData[i][j];
                            if (j + 1 <= maxModifiedX) baseData[i][j+1] = baseData[i][j];
                            if (i + 1 <= maxModifiedY && j + 1 <= maxModifiedX) baseData[i+1][j+1] = baseData[i][j];
                        }
                    } else {
                        // For other patterns, create a radial gradient
                        baseData[i][j] = Math.min(1, Math.max(0, baseData[i][j] + factor * strength));
                        
                        // Fill adjacent pixels for stepSize > 1 for smooth effect
                        if (stepSize > 1) {
                            if (i + 1 <= maxModifiedY) baseData[i+1][j] = baseData[i][j];
                            if (j + 1 <= maxModifiedX) baseData[i][j+1] = baseData[i][j];
                            if (i + 1 <= maxModifiedY && j + 1 <= maxModifiedX) baseData[i+1][j+1] = baseData[i][j];
                        }
                    }
                }
            }
        }
        
        console.log(`Applied interactive effect at (${x}, ${y}) with radius ${effectRadius}`);
    }
    
    // ======== INITIALIZATION ========
    
    // Initialize the application
    console.log("Initializing fractal visualization...");
    initFractalData().then(data => {
        if (data) {
            renderCurrentFrame();
            startAnimation();
        }
    });
});