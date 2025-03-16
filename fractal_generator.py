import numpy as np
import random
from functools import lru_cache
import time

# Use LRU cache for faster repeated generations with same parameters
@lru_cache(maxsize=16)
def generate_fractal_data_cached(size, iterations, seed, optimization_level='standard'):
    """Cached version of generate_fractal_data for repeated calls.
    
    Args:
        size: The size of the grid
        iterations: Number of iterations
        seed: Random seed for reproducibility
        optimization_level: 'standard', 'medium', or 'high' - determines algorithm efficiency
    """
    return generate_fractal_data(size, iterations, seed, optimization_level=optimization_level)

def generate_fractal_data(size, iterations, seed=None, optimization_level='standard'):
    """Generates fractal-like data using a chaotic iterative process.
    Optimized for various grid sizes based on the optimization level.
    
    Args:
        size: The size of the grid
        iterations: Number of iterations
        seed: Random seed for reproducibility
        optimization_level: 'standard', 'medium', or 'high' - determines algorithm efficiency
    """
    start_time = time.time()
    
    # Set random seed for reproducibility
    if seed is not None:
        np.random.seed(seed)

    # Configure optimization settings based on level
    if optimization_level == 'high':
        # High optimization for very large grids (>100)
        # Reduce complexity and use more aggressive optimizations
        skip_factor = max(1, size // 100)  # Skip calculations for some points
        variance_enabled = False  # Disable variance calculation (expensive)
        neighborhood_size = 5     # Use smaller neighborhood
        max_adaptive_iterations = max(3, min(iterations, 50 - size // 20))
    elif optimization_level == 'medium':
        # Medium optimization for large grids (80-100)
        skip_factor = 1
        variance_enabled = True
        neighborhood_size = 9     # Use full neighborhood
        max_adaptive_iterations = max(4, min(iterations, 70 - size // 15))
    else:  # standard
        # Standard processing for normal sized grids
        skip_factor = 1
        variance_enabled = True
        neighborhood_size = 9
        max_adaptive_iterations = max(5, min(iterations, 100 - size // 10))
    
    # Apply adaptive iteration limit
    adaptive_iterations = max_adaptive_iterations
    if adaptive_iterations < iterations:
        print(f"Adaptive reduction ({optimization_level}): {iterations} -> {adaptive_iterations} iterations for size {size}")
    
    # Use more efficient array initialization
    # For larger grids, we can use lower precision to save memory
    if size > 100:
        data = np.random.rand(size, size).astype(np.float32)
    else:
        data = np.random.rand(size, size)
    
    # Apply optimization strategy based on level
    if optimization_level == 'high' and size > 120:
        # For extremely large sizes, use a simplified algorithm
        # Process the grid with lower resolution and then upscale
        downsample_factor = 2
        small_size = size // downsample_factor
        small_data = np.random.rand(small_size, small_size)
        
        # Process at lower resolution
        for i in range(adaptive_iterations):
            padded = np.pad(small_data, 1, mode='wrap')
            # Simplified neighborhood calculation (4-way instead of 8-way)
            neighborhood_sum = (
                padded[:-2, 1:-1] + padded[2:, 1:-1] +  # top, bottom
                padded[1:-1, :-2] + padded[1:-1, 2:] +  # left, right
                padded[1:-1, 1:-1]                      # center
            )
            avg = neighborhood_sum / 5.0
            # Simplified update rule
            small_data = (avg + 0.2 * np.sin(small_data * np.pi * 2)) % 1.0
        
        # Upscale back to original size
        from scipy.ndimage import zoom
        data = zoom(small_data, downsample_factor, order=1)
    else:
        # Standard or medium optimization
        for i in range(adaptive_iterations):
            # Use numpy's efficient array operations
            # Create padded data to handle edge cases
            padded = np.pad(data, 1, mode='wrap')
            
            # Extract shifted views for neighborhood calculations
            if neighborhood_size == 9:
                # Full 8-neighborhood plus center
                neighborhood_sum = (
                    padded[:-2, 1:-1] + padded[2:, 1:-1] +  # top, bottom
                    padded[1:-1, :-2] + padded[1:-1, 2:] +  # left, right
                    padded[:-2, :-2] + padded[:-2, 2:] +    # top-left, top-right
                    padded[2:, :-2] + padded[2:, 2:] +      # bottom-left, bottom-right
                    padded[1:-1, 1:-1]                      # center
                )
                avg = neighborhood_sum / 9.0
            else:
                # Simplified 4-neighborhood plus center
                neighborhood_sum = (
                    padded[:-2, 1:-1] + padded[2:, 1:-1] +  # top, bottom
                    padded[1:-1, :-2] + padded[1:-1, 2:] +  # left, right
                    padded[1:-1, 1:-1]                      # center
                )
                avg = neighborhood_sum / 5.0
            
            # Calculate variance (optional based on optimization level)
            if variance_enabled:
                variance = np.zeros_like(data)
                
                # Optimize the variance calculation using skip factor
                if skip_factor > 1:
                    # Calculate variance for only a subset of points and replicate
                    for di in range(-1, 2, skip_factor):
                        for dj in range(-1, 2, skip_factor):
                            variance += (padded[1+di:size+1+di:skip_factor, 
                                              1+dj:size+1+dj:skip_factor] - avg[::skip_factor, ::skip_factor])**2
                    # Replicate values to fill gaps
                    # This is an approximation to save computation
                    variance = np.repeat(np.repeat(variance, skip_factor, axis=0), skip_factor, axis=1)
                    variance = variance[:size, :size]  # Trim to original size
                else:
                    # Standard variance calculation
                    for di in range(-1, 2):
                        for dj in range(-1, 2):
                            variance += (padded[1+di:size+1+di, 1+dj:size+1+dj] - avg)**2
                
                variance /= 9.0
                
                # Apply chaotic update rule with variance
                data = (avg + variance * np.sin(data * np.pi * 4)) % 1.0
            else:
                # Simplified update rule without variance calculation
                data = (avg + 0.3 * np.sin(data * np.pi * 3)) % 1.0
    
    elapsed = time.time() - start_time
    print(f"Generated {size}x{size} fractal in {elapsed:.3f}s with {adaptive_iterations} iterations (level: {optimization_level})")
    
    return data

def apply_temporal_modulation(data, time_factor):
    """Applies a time-dependent modulation to the fractal data.
    Vectorized for performance."""
    return data * (0.5 + 0.5 * np.sin(time_factor * np.pi * 2))

def apply_spatial_distortion(data, distortion_factor):
    """Applies a spatial distortion to the fractal data.
    Optimized using numpy vectorized operations."""
    size = data.shape[0]
    
    # Create coordinate grids
    y_coords, x_coords = np.mgrid[0:size, 0:size]
    
    # Apply distortion using vectorized math
    x_distorted = (x_coords + distortion_factor * np.sin(y_coords * np.pi * 0.1)).astype(int) % size
    y_distorted = (y_coords + distortion_factor * np.cos(x_coords * np.pi * 0.1)).astype(int) % size
    
    # Apply mapping in a vectorized way
    return data[x_distorted, y_distorted]

def process_fractal_frame(size, iterations, seed, time_factor, distortion_factor):
    """Process a single frame of fractal animation.
    Uses cached data generation when possible."""
    
    # Select optimization level based on size
    if size > 100:
        optimization_level = 'high'
    elif size > 80:
        optimization_level = 'medium'
    else:
        optimization_level = 'standard'
        
    # For large sizes, reduce detail level automatically to maintain performance
    if size > 120:
        # For very large sizes, use a significant downsampling
        adjusted_size = size // 2 * 2  # Ensure even size
        data = generate_fractal_data_cached(adjusted_size, iterations, seed, optimization_level=optimization_level)
        # Resize after generation for larger displays
        from scipy.ndimage import zoom
        zoom_factor = size / adjusted_size
        data = zoom(data, zoom_factor, order=1)
    elif size > 80:
        # For medium-large sizes, use optimized algorithm directly
        data = generate_fractal_data_cached(size, iterations, seed, optimization_level=optimization_level)
    else:
        # For normal sizes, use standard algorithm
        data = generate_fractal_data_cached(size, iterations, seed, optimization_level='standard')
    
    # Apply effects
    modulated_data = apply_temporal_modulation(data, time_factor)
    distorted_data = apply_spatial_distortion(modulated_data, distortion_factor)
    
    return distorted_data
