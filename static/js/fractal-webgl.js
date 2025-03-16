/**
 * WebGL-based fractal renderer
 * Provides hardware-accelerated rendering for fractals with adaptive level-of-detail
 */

class FractalWebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.vertexBuffer = null;
        this.initialized = false;
        this.lodEnabled = true;
        this.lodThreshold = 80; // Size threshold for LOD implementation
        this.buffers = {};
        this.uniforms = {};
        this.textures = {};
        this.frameBuffers = {};
        
        // Shader parameters
        this.colorScheme = 'blue';
        this.time = 0.0;
        this.distortion = 5.0;
        this.patternType = 'chaotic';
        this.complexity = 5.0;
        this.turbulence = 3.0;
        this.symmetry = 0.0;
        
        // Rendering parameters
        this.renderingStyle = 'blocks';
        this.postProcessingEffect = 'none';
        this.effectIntensity = 5.0;
        
        // Initialize WebGL
        this.initWebGL();
    }
    
    /**
     * Initialize WebGL context and set up shaders
     */
    initWebGL() {
        try {
            // Use only WebGL 1.0 for maximum compatibility
            const contextOptions = {
                alpha: false,
                depth: true,  // Enable depth buffer for 3D rendering
                stencil: false,
                antialias: true,  // Enable antialiasing for smoother 3D rendering
                preserveDrawingBuffer: true,
                powerPreference: 'default',
                failIfMajorPerformanceCaveat: false
            };
            
            this.gl = this.canvas.getContext('webgl', contextOptions) || 
                     this.canvas.getContext('experimental-webgl', contextOptions);
            
            if (this.gl) {
                console.log('Using WebGL 1.0');
            } else {
                console.error('WebGL not supported by this browser');
                return false;
            }
            
            // Set up viewport
            this.resize();
            
            // Create shaders and program
            const shadersCreated = this.createShaders();
            if (!shadersCreated) {
                console.error('Failed to create WebGL shaders');
                return false;
            }
            
            // Create vertex buffer for a quad that covers the canvas
            this.createBuffers();
            
            // Clear the canvas with a solid color
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            
            this.initialized = true;
            console.log('WebGL initialization successful');
            return true;
        } catch (error) {
            console.error('WebGL initialization failed:', error);
            this.initialized = false;
            return false;
        }
    }
    
    /**
     * Create and compile shaders
     */
    createShaders() {
        // Vertex shader with 3D support
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            varying float v_depth;
            
            // Data texture containing the fractal data
            uniform sampler2D u_fractalData;
            
            // Rendering parameters
            uniform float u_renderingStyle; // 0=blocks, 1=points, 2=lines, 3=areas, 4=3d
            uniform float u_effectIntensity; // Used for 3D height scaling
            
            void main() {
                // Convert from clip space (-1 to +1) to texture coordinates (0 to 1)
                v_texCoord = a_position * 0.5 + 0.5;
                
                // For 3D rendering, sample the texture to get the height value
                float z = 0.0;
                if (u_renderingStyle > 3.5) { // Check if in 3D mode (4.0)
                    float height = texture2D(u_fractalData, v_texCoord).r;
                    // Scale height based on effect intensity (0.0 to 10.0 mapped to 0.0 to 1.0)
                    z = height * (u_effectIntensity / 10.0);
                    v_depth = height; // Pass depth to fragment shader for lighting
                } else {
                    v_depth = 0.0;
                }
                
                gl_Position = vec4(a_position, z, 1.0);
            }
        `;
        
        // Fragment shader - where the fractal magic happens
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec2 v_texCoord;
            varying float v_depth;
            
            // Data texture containing the base fractal data
            uniform sampler2D u_fractalData;
            
            // Rendering style (from vertex shader)
            uniform float u_renderingStyle; // 0=blocks, 1=points, 2=lines, 3=areas, 4=3d
            
            // Parameters
            uniform float u_time;
            uniform float u_distortion;
            uniform float u_complexity;
            uniform float u_turbulence; 
            uniform float u_symmetry;
            uniform float u_patternType; // Using float instead of int for better WebGL 1.0 compatibility
            uniform float u_colorScheme; // Using float instead of int for better WebGL 1.0 compatibility
            
            // Constants for pattern types and color schemes
            // Using float constants for better WebGL 1.0 compatibility
            const float PATTERN_CHAOTIC = 0.0;
            const float PATTERN_CELLULAR = 1.0;
            const float PATTERN_WAVE = 2.0;
            const float PATTERN_SPIRAL = 3.0;
            const float PATTERN_MANDELBROT = 4.0;
            
            const float COLOR_BLUE = 0.0;
            const float COLOR_GREEN = 1.0;
            const float COLOR_PURPLE = 2.0;
            const float COLOR_FIRE = 3.0;
            const float COLOR_GRAYSCALE = 4.0;
            const float COLOR_RAINBOW = 5.0;
            
            // Apply a wave function based on parameters
            float applyWave(vec2 pos, float baseValue) {
                float complexityFactor = u_complexity / 5.0;
                float turbulenceFactor = u_turbulence / 5.0;
                
                // Multiple wave patterns with different frequencies and phases
                float wave1 = 0.5 + 0.5 * sin(u_time * 0.2 * complexityFactor + (pos.x + pos.y) * 3.14159);
                float wave2 = 0.3 + 0.3 * sin(u_time * 1.0 * complexityFactor + pos.x * 6.28318);
                float wave3 = 0.2 + 0.2 * cos(u_time * 1.5 * complexityFactor + pos.y * 6.28318);
                
                // Add interference patterns affected by turbulence
                float interference = 0.8 + 0.2 * sin(pos.x / (0.2 * turbulenceFactor)) * 
                                        cos(pos.y / (0.2 * turbulenceFactor) + u_time);
                
                // Generate pattern by combining waves
                return baseValue * (wave1 + wave2 + wave3) * interference;
            }
            
            // Apply a spiral pattern
            float applySpiral(vec2 pos, float baseValue) {
                float complexityFactor = u_complexity / 5.0;
                float turbulenceFactor = u_turbulence / 5.0;
                
                // Calculate distance from center
                vec2 center = vec2(0.5, 0.5);
                vec2 delta = pos - center;
                float distance = length(delta);
                
                // Calculate angle from center (in radians)
                float angle = atan(delta.y, delta.x);
                
                // Create spiral effect
                float spiralFactor = mod(angle + distance / (0.1 / complexityFactor) + u_time * 0.2, 6.28318);
                float spiralWave = 0.5 + 0.5 * sin(spiralFactor * 5.0 * complexityFactor);
                
                // Apply turbulence
                float spiralNoise = turbulenceFactor > 0.0 ? 
                    (fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.2 * turbulenceFactor : 0.0;
                
                // Combine with base data
                return baseValue * spiralWave + spiralNoise;
            }
            
            // Apply a cellular pattern (Conway's Game of Life-inspired)
            float applyCellular(vec2 pos, float baseValue, sampler2D dataTexture) {
                float complexityFactor = u_complexity / 5.0;
                float turbulenceFactor = u_turbulence / 5.0;
                
                // Texel size for neighbor sampling - fixed size (1/resolution) for WebGL 1.0 compatibility
                vec2 texelSize = vec2(0.01, 0.01); // Fixed value for better WebGL 1.0 compatibility
                
                // Get neighbors with wrap-around - cardinal directions
                float n1 = texture2D(dataTexture, vec2(pos.x - texelSize.x, pos.y)).r;
                float n2 = texture2D(dataTexture, vec2(pos.x, pos.y - texelSize.y)).r;
                float n3 = texture2D(dataTexture, vec2(pos.x + texelSize.x, pos.y)).r;
                float n4 = texture2D(dataTexture, vec2(pos.x, pos.y + texelSize.y)).r;
                
                // Diagonal neighbors
                float d1 = texture2D(dataTexture, vec2(pos.x - texelSize.x, pos.y - texelSize.y)).r;
                float d2 = texture2D(dataTexture, vec2(pos.x + texelSize.x, pos.y - texelSize.y)).r;
                float d3 = texture2D(dataTexture, vec2(pos.x - texelSize.x, pos.y + texelSize.y)).r;
                float d4 = texture2D(dataTexture, vec2(pos.x + texelSize.x, pos.y + texelSize.y)).r;
                
                // Calculate neighbor influence based on complexity
                float orthoWeight = 0.7 * complexityFactor;
                float diagWeight = 0.3 * complexityFactor;
                
                // Weight adjustment based on turbulence
                float randomFactor = turbulenceFactor * 0.1 * 
                                    (fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453) - 0.5);
                
                // Apply cellular rule
                float neighborEffect = (
                    (n1 + n2 + n3 + n4) * orthoWeight +
                    (d1 + d2 + d3 + d4) * diagWeight
                ) / (4.0 * orthoWeight + 4.0 * diagWeight);
                
                return baseValue * (1.0 - orthoWeight - diagWeight) + neighborEffect + randomFactor;
            }
            
            // Apply a mandelbrot-like pattern
            float applyMandelbrot(vec2 pos, float baseValue) {
                float complexityFactor = u_complexity / 5.0;
                
                // Remap coordinates for Mandelbrot calculation
                vec2 c = (pos - vec2(0.5)) * 2.5 - vec2(0.7, 0.0);
                c = c * (1.0 + sin(u_time * 0.1) * 0.1) * complexityFactor;
                
                // Run basic Mandelbrot iteration
                vec2 z = vec2(0.0);
                float iter = 0.0;
                const float maxIter = 20.0;
                
                for (float i = 0.0; i < maxIter; i++) {
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
                    if (dot(z, z) > 4.0) break;
                    iter++;
                }
                
                // Normalize and combine with base value
                float mandelbrotValue = iter / maxIter;
                return (baseValue * 0.3 + mandelbrotValue * 0.7) * (1.0 + sin(u_time * 0.3) * 0.1);
            }
            
            // Apply the chaotic pattern
            float applyChaotic(vec2 pos, float baseValue) {
                // Normalize parameters
                float complexityFactor = u_complexity / 5.0;
                float turbulenceFactor = u_turbulence / 5.0;
                float symmetryFactor = u_symmetry / 10.0;
                
                // Apply symmetry if needed
                vec2 symPos = pos;
                if (symmetryFactor > 0.0) {
                    if (symmetryFactor <= 0.33) {
                        // Horizontal symmetry
                        symPos.y = 1.0 - pos.y;
                    } else if (symmetryFactor <= 0.66) {
                        // Vertical symmetry
                        symPos.x = 1.0 - pos.x;
                    } else {
                        // Diagonal symmetry
                        symPos = vec2(pos.y, pos.x);
                    }
                }
                
                // Time-based modulation
                float timeMod = 0.5 + 0.5 * sin(u_time * (0.5 + complexityFactor * 0.5) + 
                                              length(pos - vec2(0.5)) * 5.0 * complexityFactor);
                
                // Spatial distortion
                float distortionAmount = u_distortion / 10.0;
                float distortX = sin(pos.y * 6.28318 * turbulenceFactor + u_time * 0.5) * distortionAmount;
                float distortY = cos(pos.x * 6.28318 * turbulenceFactor + u_time * 0.5) * distortionAmount;
                
                vec2 distortedPos = vec2(
                    pos.x + distortX,
                    pos.y + distortY
                );
                
                // Ensure coordinates stay in bounds for texture lookup
                distortedPos = fract(distortedPos);
                
                // Apply turbulence
                float turbulence = turbulenceFactor > 0.0 ?
                    (fract(sin(dot(distortedPos, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 
                    0.2 * turbulenceFactor : 0.0;
                
                // Mix the base value with time modulation and distortions
                return baseValue * timeMod + turbulence;
            }
            
            // Map value to color based on the selected color scheme
            vec4 mapValueToColor(float value) {
                // Ensure value is in range 0-1
                value = clamp(value, 0.0, 1.0);
                
                // Apply contrast enhancement (S-curve)
                value = smoothstep(0.1, 0.9, value);
                
                // Apply 3D shading if in 3D mode
                if (u_renderingStyle > 3.5) { // Check if in 3D mode (4.0)
                    // Calculate simple directional lighting based on height
                    float normalizedDepth = v_depth; // Already in 0.0-1.0 range
                    
                    // Lighting direction (coming from top-left)
                    vec3 lightDir = normalize(vec3(-0.5, -0.5, 1.0));
                    
                    // Calculate a simple normal based on height differences around the current point
                    vec2 texelSize = vec2(0.01, 0.01);
                    float heightLeft = texture2D(u_fractalData, vec2(v_texCoord.x - texelSize.x, v_texCoord.y)).r;
                    float heightRight = texture2D(u_fractalData, vec2(v_texCoord.x + texelSize.x, v_texCoord.y)).r;
                    float heightUp = texture2D(u_fractalData, vec2(v_texCoord.x, v_texCoord.y - texelSize.y)).r;
                    float heightDown = texture2D(u_fractalData, vec2(v_texCoord.x, v_texCoord.y + texelSize.y)).r;
                    
                    vec3 normal = normalize(vec3(
                        heightLeft - heightRight,
                        heightUp - heightDown,
                        0.1  // Small Z component to avoid extreme normals
                    ));
                    
                    // Calculate diffuse lighting
                    float diffuse = max(dot(normal, lightDir), 0.0);
                    
                    // Add ambient light to avoid completely dark areas
                    float light = 0.3 + 0.7 * diffuse;
                    
                    // Adjust value based on lighting
                    value = value * light;
                }
                
                if (u_colorScheme == COLOR_BLUE) {
                    // Blue-Cyan color scheme (default)
                    return vec4(
                        value * 0.4, 
                        value * 0.7, 
                        0.5 + value * 0.5, 
                        1.0
                    );
                }
                else if (u_colorScheme == COLOR_GREEN) {
                    // Green-Yellow color scheme
                    return vec4(
                        value * 0.7, 
                        0.4 + value * 0.6, 
                        value * 0.2, 
                        1.0
                    );
                }
                else if (u_colorScheme == COLOR_PURPLE) {
                    // Purple-Pink color scheme
                    return vec4(
                        0.3 + value * 0.7, 
                        value * 0.4, 
                        0.6 + value * 0.4, 
                        1.0
                    );
                }
                else if (u_colorScheme == COLOR_FIRE) {
                    // Fire (Red-Yellow) color scheme
                    return vec4(
                        0.5 + value * 0.5, 
                        value * 0.7, 
                        value * 0.3, 
                        1.0
                    );
                }
                else if (u_colorScheme == COLOR_GRAYSCALE) {
                    // Grayscale
                    return vec4(value, value, value, 1.0);
                }
                else if (u_colorScheme == COLOR_RAINBOW) {
                    // Rainbow color scheme
                    return vec4(
                        0.5 + 0.5 * sin(value * 6.28318),
                        0.5 + 0.5 * sin(value * 6.28318 + 2.0943),
                        0.5 + 0.5 * sin(value * 6.28318 + 4.1886),
                        1.0
                    );
                }
                
                // Default to grayscale if color scheme is invalid
                return vec4(value, value, value, 1.0);
            }
            
            void main() {
                // Get base value from the data texture
                float baseValue = texture2D(u_fractalData, v_texCoord).r;
                float finalValue = 0.0;
                
                // Apply the appropriate pattern type
                if (u_patternType == PATTERN_WAVE) {
                    finalValue = applyWave(v_texCoord, baseValue);
                } 
                else if (u_patternType == PATTERN_CELLULAR) {
                    finalValue = applyCellular(v_texCoord, baseValue, u_fractalData);
                }
                else if (u_patternType == PATTERN_SPIRAL) {
                    finalValue = applySpiral(v_texCoord, baseValue);
                }
                else if (u_patternType == PATTERN_MANDELBROT) {
                    finalValue = applyMandelbrot(v_texCoord, baseValue);
                }
                else {
                    // Default to chaotic pattern
                    finalValue = applyChaotic(v_texCoord, baseValue);
                }
                
                // Apply color mapping and set final color
                gl_FragColor = mapValueToColor(finalValue);
            }
        `;
        
        // Create and compile vertex shader
        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShader, vertexShaderSource);
        this.gl.compileShader(vertexShader);
        
        // Check for vertex shader compilation errors
        if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
            console.warn('Vertex shader compilation failed:', this.gl.getShaderInfoLog(vertexShader));
            this.gl.deleteShader(vertexShader);
            return false;
        }
        
        // Create and compile fragment shader
        const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragmentShader, fragmentShaderSource);
        this.gl.compileShader(fragmentShader);
        
        // Check for fragment shader compilation errors
        if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
            console.warn('Fragment shader compilation failed:', this.gl.getShaderInfoLog(fragmentShader));
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return false;
        }
        
        // Create shader program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        
        // Check for program linking errors
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.warn('Program linking failed:', this.gl.getProgramInfoLog(this.program));
            this.gl.deleteProgram(this.program);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return false;
        }
        
        // Get attribute and uniform locations
        this.uniforms = {
            fractalData: this.gl.getUniformLocation(this.program, 'u_fractalData'),
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            distortion: this.gl.getUniformLocation(this.program, 'u_distortion'),
            complexity: this.gl.getUniformLocation(this.program, 'u_complexity'),
            turbulence: this.gl.getUniformLocation(this.program, 'u_turbulence'),
            symmetry: this.gl.getUniformLocation(this.program, 'u_symmetry'),
            patternType: this.gl.getUniformLocation(this.program, 'u_patternType'),
            colorScheme: this.gl.getUniformLocation(this.program, 'u_colorScheme'),
            renderingStyle: this.gl.getUniformLocation(this.program, 'u_renderingStyle'),
            effectIntensity: this.gl.getUniformLocation(this.program, 'u_effectIntensity')
        };
    }
    
    /**
     * Create buffers for rendering
     */
    createBuffers() {
        // Create a buffer for a full-screen quad (two triangles)
        this.buffers.position = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
        
        // Define positions for a quad that fills the entire clip space
        const positions = [
            -1.0, -1.0,  // bottom left
             1.0, -1.0,  // bottom right
            -1.0,  1.0,  // top left
             1.0,  1.0   // top right
        ];
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    }
    
    /**
     * Update the canvas size when resized
     */
    resize() {
        if (this.gl) {
            // Match WebGL viewport to canvas size
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    /**
     * Set the color scheme for rendering
     */
    setColorScheme(schemeName) {
        // Map color scheme names to numeric values used in shader
        const schemeMap = {
            'blue': 0.0,
            'green': 1.0,
            'purple': 2.0,
            'fire': 3.0,
            'grayscale': 4.0,
            'rainbow': 5.0
        };
        
        this.colorScheme = schemeName;
        
        if (this.initialized && schemeMap.hasOwnProperty(schemeName)) {
            this.gl.useProgram(this.program);
            // Use uniform1f instead of uniform1i for WebGL 1.0 compatibility
            this.gl.uniform1f(this.uniforms.colorScheme, schemeMap[schemeName]);
        }
    }
    
    /**
     * Set the pattern type for rendering
     */
    setPatternType(patternName) {
        // Map pattern names to numeric values used in shader
        const patternMap = {
            'chaotic': 0.0,
            'cellular': 1.0,
            'wave': 2.0,
            'spiral': 3.0,
            'mandelbrot': 4.0
        };
        
        this.patternType = patternName;
        
        if (this.initialized && patternMap.hasOwnProperty(patternName)) {
            this.gl.useProgram(this.program);
            // Use uniform1f instead of uniform1i for WebGL 1.0 compatibility
            this.gl.uniform1f(this.uniforms.patternType, patternMap[patternName]);
        }
    }
    
    /**
     * Set the rendering style (blocks, points, lines, areas)
     */
    setRenderingStyle(styleName) {
        const validStyles = ['blocks', 'points', 'lines', 'areas', '3d'];
        
        if (validStyles.includes(styleName)) {
            this.renderingStyle = styleName;
            
            // Update uniform for rendering style if we have a valid GL context
            if (this.gl && this.uniforms.renderingStyle) {
                this.gl.useProgram(this.program);
                // Map rendering style to float value for WebGL uniform
                const styleValues = {
                    'blocks': 0.0,
                    'points': 1.0,
                    'lines': 2.0,
                    'areas': 3.0,
                    '3d': 4.0
                };
                this.gl.uniform1f(this.uniforms.renderingStyle, styleValues[styleName]);
            }
        }
    }
    
    /**
     * Set the post-processing effect (none, glow, blur, edge)
     */
    setPostProcessingEffect(effectName) {
        const validEffects = ['none', 'glow', 'blur', 'edge'];
        
        if (validEffects.includes(effectName)) {
            this.postProcessingEffect = effectName;
            
            // In a full implementation, we would update shader uniforms here
            // For now, we'll just store the effect and handle it in post-rendering
        }
    }
    
    /**
     * Set the intensity of the post-processing effect
     */
    setEffectIntensity(intensity) {
        // Clamp intensity to valid range
        this.effectIntensity = Math.max(0, Math.min(10, intensity));
        
        // Update shader uniform if available
        if (this.initialized && this.uniforms.effectIntensity !== undefined) {
            this.gl.useProgram(this.program);
            this.gl.uniform1f(this.uniforms.effectIntensity, this.effectIntensity);
        }
    }
    
    /**
     * Create a texture from fractal data
     */
    updateFractalData(data) {
        if (!this.initialized || !data || !data.length) return;
        
        const size = data.length;
        
        // Apply level-of-detail based on data size
        let lodData = data;
        
        // For large datasets, create a downsampled version if LOD is enabled
        if (this.lodEnabled && size > this.lodThreshold) {
            // Calculate new size based on original size and threshold
            const lodSize = Math.max(this.lodThreshold, Math.floor(size / 2));
            lodData = this.downsampleData(data, size, lodSize);
            console.log(`LOD applied: ${size}x${size} -> ${lodSize}x${lodSize}`);
        }
        
        const flatData = this.flattenData(lodData);
        const texSize = lodData.length;
        
        // Create or update the data texture
        if (!this.textures.fractalData) {
            this.textures.fractalData = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.fractalData);
            
            // Set filtering modes for the texture
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.fractalData);
        }
        
        try {
            // Check if floating point textures are supported
            const ext = this.gl.getExtension('OES_texture_float');
            
            if (ext) {
                // Upload the fractal data as a floating-point texture
                this.gl.texImage2D(
                    this.gl.TEXTURE_2D,
                    0,
                    this.gl.LUMINANCE,
                    texSize,
                    texSize,
                    0,
                    this.gl.LUMINANCE,
                    this.gl.FLOAT,
                    new Float32Array(flatData)
                );
            } else {
                // Fallback to UNSIGNED_BYTE if float textures are not supported
                console.warn('Float textures not supported, using 8-bit textures');
                
                // Convert float data to byte data (0-255)
                const byteData = new Uint8Array(flatData.length);
                for (let i = 0; i < flatData.length; i++) {
                    byteData[i] = Math.floor(flatData[i] * 255);
                }
                
                this.gl.texImage2D(
                    this.gl.TEXTURE_2D,
                    0,
                    this.gl.LUMINANCE,
                    texSize,
                    texSize,
                    0,
                    this.gl.LUMINANCE,
                    this.gl.UNSIGNED_BYTE,
                    byteData
                );
            }
        } catch (error) {
            console.error('Error uploading texture:', error);
            return;
        }
    }
    
    /**
     * Downsample data for level-of-detail optimization
     */
    downsampleData(data, originalSize, targetSize) {
        const result = new Array(targetSize).fill().map(() => new Array(targetSize).fill(0));
        const ratio = originalSize / targetSize;
        
        // Simple averaging for downsampling
        for (let y = 0; y < targetSize; y++) {
            for (let x = 0; x < targetSize; x++) {
                const srcX = Math.floor(x * ratio);
                const srcY = Math.floor(y * ratio);
                
                // For better quality, average a small region around the source pixel
                // but optimize for speed with a fixed 2x2 kernel
                let sum = 0;
                let count = 0;
                
                for (let ky = 0; ky < 2 && srcY + ky < originalSize; ky++) {
                    for (let kx = 0; kx < 2 && srcX + kx < originalSize; kx++) {
                        sum += data[srcY + ky][srcX + kx];
                        count++;
                    }
                }
                
                result[y][x] = sum / count;
            }
        }
        
        return result;
    }
    
    /**
     * Flatten 2D data array into 1D for WebGL textures
     */
    flattenData(data) {
        const size = data.length;
        const result = new Array(size * size);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                result[y * size + x] = data[y][x];
            }
        }
        
        return result;
    }
    
    /**
     * Set rendering parameters
     */
    setParameters(params) {
        if (!this.initialized) return;
        
        this.gl.useProgram(this.program);
        
        // Update internal state
        if (params.time !== undefined) this.time = params.time;
        if (params.distortion !== undefined) this.distortion = params.distortion;
        if (params.complexity !== undefined) this.complexity = params.complexity;
        if (params.turbulence !== undefined) this.turbulence = params.turbulence;
        if (params.symmetry !== undefined) this.symmetry = params.symmetry;
        
        // Update pattern type if specified
        if (params.patternType) this.setPatternType(params.patternType);
        
        // Update color scheme if specified
        if (params.colorScheme) this.setColorScheme(params.colorScheme);
        
        // Update rendering style and post-processing parameters
        if (params.renderingStyle) this.renderingStyle = params.renderingStyle;
        if (params.postProcessingEffect) this.postProcessingEffect = params.postProcessingEffect;
        if (params.effectIntensity !== undefined) this.effectIntensity = params.effectIntensity;
        
        // Set shader uniforms
        this.gl.uniform1f(this.uniforms.time, this.time);
        this.gl.uniform1f(this.uniforms.distortion, this.distortion);
        this.gl.uniform1f(this.uniforms.complexity, this.complexity);
        this.gl.uniform1f(this.uniforms.turbulence, this.turbulence);
        this.gl.uniform1f(this.uniforms.symmetry, this.symmetry);
        
        // Set rendering style uniform if needed
        if (this.uniforms.renderingStyle && this.renderingStyle) {
            const styleValues = {
                'blocks': 0.0,
                'points': 1.0,
                'lines': 2.0,
                'areas': 3.0,
                '3d': 4.0
            };
            this.gl.uniform1f(this.uniforms.renderingStyle, styleValues[this.renderingStyle] || 0.0);
        }
        
        // Set effect intensity uniform
        if (this.uniforms.effectIntensity !== undefined) {
            this.gl.uniform1f(this.uniforms.effectIntensity, this.effectIntensity);
        }
    }
    
    /**
     * Render the fractal using WebGL
     */
    render() {
        if (!this.initialized || !this.textures.fractalData) return;
        
        // Clear the canvas
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        
        // Use depth testing for 3D rendering if needed
        if (this.renderingStyle === '3d') {
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        } else {
            this.gl.disable(this.gl.DEPTH_TEST);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }
        
        // Use the shader program
        this.gl.useProgram(this.program);
        
        // Bind the position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
        
        // Set up vertex attributes
        const positionAttributeLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionAttributeLocation);
        this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // Bind the fractal data texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.fractalData);
        this.gl.uniform1i(this.uniforms.fractalData, 0);
        
        // Draw the full-screen quad (two triangles)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    
    /**
     * Enable or disable level-of-detail optimization
     */
    setLODEnabled(enabled) {
        this.lodEnabled = enabled;
    }
    
    /**
     * Set the size threshold for level-of-detail optimization
     */
    setLODThreshold(threshold) {
        this.lodThreshold = Math.max(20, threshold);
    }
    
    /**
     * Clean up WebGL resources
     */
    destroy() {
        if (!this.gl) return;
        
        // Delete textures
        if (this.textures.fractalData) {
            this.gl.deleteTexture(this.textures.fractalData);
        }
        
        // Delete buffers
        if (this.buffers.position) {
            this.gl.deleteBuffer(this.buffers.position);
        }
        
        // Delete program and associated shaders
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}