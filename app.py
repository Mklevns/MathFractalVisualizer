import os
import logging
import json
import time
from flask import Flask, render_template, jsonify, request
import fractal_generator
import numpy as np

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# Performance metrics tracking
performance_metrics = {
    'total_requests': 0,
    'total_time': 0.0,  # Use float for time metrics
    'max_time': 0.0,    # Use float for time metrics
    'large_generations': 0,  # Count of large fractal generations
}

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/generate_fractal/<int:size>/<int:iterations>/<int:seed>')
def generate_fractal(size, iterations, seed):
    """Generate fractal data and return as JSON.
    Optimized for better performance with larger sizes."""
    start_time = time.time()
    performance_metrics['total_requests'] += 1
    
    # Apply progressive limits to prevent server overload
    # For extremely large requests, scale down proportionally
    max_size = 150  # Maximum allowed size
    if size > max_size:
        original_size = size
        size = max_size
        logging.warning(f"Size limited from {original_size} to {max_size}")
    
    # Limit iterations based on size for performance
    if size > 80:
        max_iterations = min(iterations, 40) # Reduce max iterations for large sizes
        performance_metrics['large_generations'] += 1
    else:
        max_iterations = min(iterations, 100)
    
    if max_iterations < iterations:
        logging.info(f"Limiting iterations from {iterations} to {max_iterations} for size {size}")
    
    try:
        # Select optimization level based on size
        if size > 100:
            optimization_level = 'high'
        elif size > 80:
            optimization_level = 'medium'
        else:
            optimization_level = 'standard'
        
        # Use the cached version for better performance with appropriate optimization level
        data = fractal_generator.generate_fractal_data_cached(size, max_iterations, seed, 
                                                          optimization_level=optimization_level)
        
        # Compress the data if it's a large result (optional optimization)
        compressed_data = data
        if size > 90:
            # Convert to float16 for half precision - reduces data size by 50%
            compressed_data = data.astype(np.float16)
            
        # Measure and log performance
        elapsed = time.time() - start_time
        performance_metrics['total_time'] += elapsed
        performance_metrics['max_time'] = max(performance_metrics['max_time'], elapsed)
        
        logging.info(f"Generated {size}x{size} fractal in {elapsed:.3f}s (avg: {performance_metrics['total_time']/performance_metrics['total_requests']:.3f}s) with {optimization_level} optimization")
        
        return jsonify({
            'data': compressed_data.tolist(),
            'size': size,
            'generation_time': elapsed,
            'optimization': optimization_level
        })
    except Exception as e:
        logging.error(f"Error generating fractal: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/apply_modulation/<float:time_factor>')
def apply_modulation(time_factor):
    """Apply temporal modulation to the fractal data based on time factor."""
    try:
        # We need to get the data from a previous state
        # For simplicity, we're generating new data here
        # In a production app, we would store the state in a session
        data = fractal_generator.generate_fractal_data_cached(40, 50, 42)
        modulated_data = fractal_generator.apply_temporal_modulation(data, time_factor)
        return jsonify({
            'data': modulated_data.tolist()
        })
    except Exception as e:
        logging.error(f"Error applying modulation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/performance_stats')
def performance_stats():
    """Return current performance metrics."""
    return jsonify(performance_metrics)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
