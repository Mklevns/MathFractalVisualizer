document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const canvas = document.getElementById('fractalCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const randomizeBtn = document.getElementById('randomizeBtn');
    const sizeRange = document.getElementById('sizeRange');
    const iterationsRange = document.getElementById('iterationsRange');
    const speedRange = document.getElementById('speedRange');
    const sizeValue = document.getElementById('sizeValue');
    const iterationsValue = document.getElementById('iterationsValue');
    const speedValue = document.getElementById('speedValue');
    const seedDisplay = document.getElementById('seedDisplay');
    const fpsDisplay = document.getElementById('fpsDisplay');
    const timeFactorDisplay = document.getElementById('timeFactorDisplay');
    const distortionDisplay = document.getElementById('distortionDisplay');
    
    // Fractal parameters
    let size = 40;
    let iterations = 50;
    let seed = Math.floor(Math.random() * 1000);
    let animationSpeed = 50;
    let timeFactor = 0.0;
    let distortionFactor = 5.0;
    let animationId = null;
    let fractalData = null;
    let lastFrameTime = 0;
    let fps = 0;
    let initialDataLoaded = false; // Flag to track initial data loading
    let pendingParamChange = false; // Flag to track if parameters have changed
    
    // Set canvas size based on container
    function resizeCanvas() {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        canvas.width = containerWidth;
        canvas.height = containerWidth;
    }
    
    // Initialize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Update display values
    function updateDisplayValues() {
        sizeValue.textContent = size;
        iterationsValue.textContent = iterations;
        speedValue.textContent = animationSpeed;
        seedDisplay.textContent = seed;
        timeFactorDisplay.textContent = timeFactor.toFixed(2);
        distortionDisplay.textContent = distortionFactor.toFixed(2);
    }
    
    // Event listeners for controls
    sizeRange.addEventListener('input', (e) => {
        size = parseInt(e.target.value);
        sizeValue.textContent = size;
        pendingParamChange = true; // Mark that parameter has changed but don't refresh yet
    });
    
    iterationsRange.addEventListener('input', (e) => {
        iterations = parseInt(e.target.value);
        iterationsValue.textContent = iterations;
        pendingParamChange = true; // Mark that parameter has changed but don't refresh yet
    });
    
    speedRange.addEventListener('input', (e) => {
        animationSpeed = parseInt(e.target.value);
        speedValue.textContent = animationSpeed;
        // Speed doesn't require data regeneration, just affects animation
    });
    
    startBtn.addEventListener('click', startAnimation);
    stopBtn.addEventListener('click', stopAnimation);
    resetBtn.addEventListener('click', resetAnimation);
    randomizeBtn.addEventListener('click', randomizeParams);
    
    // Fetch fractal data from server
    async function fetchFractalData() {
        try {
            const response = await fetch(`/generate_fractal/${size}/${iterations}/${seed}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching fractal data:', error);
            return null;
        }
    }
    
    // Render fractal data to canvas
    function renderFractal(data) {
        if (!data) return;
        
        const cellSize = canvas.width / data.length;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                const value = data[i][j];
                
                // Map the value to a color using a gradient from dark blue to bright cyan
                const r = Math.floor(value * 50);
                const g = Math.floor(value * 150 + 50);
                const b = Math.floor(value * 200 + 55);
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
            }
        }
    }
    
    // Apply temporal modulation and spatial distortion in the browser
    function processFrame(data) {
        if (!data) return null;
        
        const size = data.length;
        const result = Array(size).fill().map(() => Array(size).fill(0));
        
        // Apply temporal modulation with multiple wave components for more variety
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Multi-frequency modulation for more complex patterns
                const wave1 = 0.4 + 0.4 * Math.sin(timeFactor * Math.PI * 0.5);  // Slow wave
                const wave2 = 0.3 + 0.3 * Math.sin(timeFactor * Math.PI * 2.0);  // Medium wave
                const wave3 = 0.3 + 0.3 * Math.cos(timeFactor * Math.PI * 4.0);  // Fast wave
                
                result[i][j] = data[i][j] * (wave1 + wave2 * (i/size) + wave3 * (j/size));
            }
        }
        
        // Apply dynamic spatial distortion
        const distorted = Array(size).fill().map(() => Array(size).fill(0));
        const phaseShift = timeFactor * 0.1; // Phase shift based on time for flowing movement
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Multiple distortion waves with different frequencies
                const x = Math.floor(i + 
                    distortionFactor * Math.sin(j * Math.PI * 0.05 + phaseShift) +
                    (distortionFactor * 0.3) * Math.sin(j * Math.PI * 0.15 + phaseShift * 2)
                ) % size;
                
                const y = Math.floor(j + 
                    distortionFactor * Math.cos(i * Math.PI * 0.05 + phaseShift) + 
                    (distortionFactor * 0.3) * Math.cos(i * Math.PI * 0.15 + phaseShift * 3)
                ) % size;
                
                // Handle negative indices
                const safeX = x < 0 ? x + size : x;
                const safeY = y < 0 ? y + size : y;
                
                distorted[i][j] = result[safeX][safeY];
            }
        }
        
        return distorted;
    }
    
    // Persistent data storage to preserve the original fractal pattern
    let originalFractalData = null;
    
    // Animation loop with no server calls
    function animate(timestamp) {
        // Calculate FPS
        if (lastFrameTime) {
            const delta = timestamp - lastFrameTime;
            fps = Math.round(1000 / delta);
            fpsDisplay.textContent = fps;
        }
        lastFrameTime = timestamp;
        
        // Store original data if not already stored
        if (originalFractalData === null && fractalData !== null) {
            console.log("Storing original fractal data to prevent resets");
            originalFractalData = JSON.parse(JSON.stringify(fractalData));
        }
        
        // Use the original data or the current data, never refetch from server during animation
        const dataToProcess = originalFractalData || fractalData;
        
        // Process and render current frame using original data
        if (dataToProcess) {
            const processedData = processFrame(dataToProcess);
            renderFractal(processedData);
        }
        
        // Update parameters for next frame - continuous evolution
        timeFactor += 0.02 * (animationSpeed / 50);
        distortionFactor = (distortionFactor + 0.05 * (animationSpeed / 50)) % 10;
        
        // Update display values
        timeFactorDisplay.textContent = timeFactor.toFixed(2);
        distortionDisplay.textContent = distortionFactor.toFixed(2);
        
        // Continue animation loop - never resets automatically
        animationId = requestAnimationFrame(animate);
    }
    
    // Start animation
    async function startAnimation() {
        if (animationId) return;
        
        // Load initial data if not already loaded
        if (!fractalData || !initialDataLoaded) {
            fractalData = await fetchFractalData();
            initialDataLoaded = true;
            console.log("Loaded initial fractal data");
        }
        
        if (fractalData) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            // Start the animation loop
            animationId = requestAnimationFrame(animate);
            console.log("Animation started");
        }
    }
    
    // Stop animation
    function stopAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            console.log("Animation stopped");
        }
    }
    
    // Reset animation - only resets parameters, doesn't auto-regenerate
    function resetAnimation() {
        const wasRunning = !!animationId;
        stopAnimation();
        
        // Reset modulation parameters but keep the same fractal data
        timeFactor = 0.0;
        distortionFactor = 5.0;
        updateDisplayValues();
        
        // Use original data for rendering if available
        const dataToRender = originalFractalData || fractalData;
        renderFractal(dataToRender);
        console.log("Animation parameters reset");
        
        // Restart if it was running
        if (wasRunning) {
            startAnimation();
        }
    }
    
    // Apply changes button handler - explicitly generates a new fractal
    function applyChanges() {
        const wasRunning = !!animationId;
        stopAnimation();
        
        // Clear original data to force regeneration
        originalFractalData = null;
        
        // Fetch new data with current parameters
        console.log("Fetching new fractal data with parameters:", { size, iterations, seed });
        fetchFractalData().then(data => {
            fractalData = data;
            // Save as the new original data to prevent resets
            originalFractalData = JSON.parse(JSON.stringify(data));
            renderFractal(fractalData);
            pendingParamChange = false;
            
            // Restart if it was running
            if (wasRunning) {
                startAnimation();
            }
        });
    }
    
    // Randomize parameters
    function randomizeParams() {
        // Only change parameters, don't regenerate data automatically
        size = Math.floor(Math.random() * 60) + 20; // 20 to 80
        iterations = Math.floor(Math.random() * 50) + 20; // 20 to 70
        seed = Math.floor(Math.random() * 1000);
        
        sizeRange.value = size;
        iterationsRange.value = iterations;
        
        updateDisplayValues();
        pendingParamChange = true;
        
        // IMPORTANT: Do not automatically call reset or apply changes
        // This would cause an unwanted reset of the animation
        console.log("Parameters randomized. Use Apply Changes to generate a new fractal with these parameters.");
    }
    
    // Initial setup
    updateDisplayValues();
    
    // Connect the Apply Changes button to regenerate fractals
    const applyBtn = document.getElementById('applyBtn');
    applyBtn.addEventListener('click', applyChanges);
    
    // Initialize with a static render and start animation once
    console.log("Initializing fractal visualization");
    fetchFractalData().then(data => {
        fractalData = data;
        initialDataLoaded = true; // Mark as loaded so it won't reload again
        renderFractal(fractalData);
        
        // Auto-start the animation
        startAnimation();
    });
});
