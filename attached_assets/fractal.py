import numpy as np
import random
import time
import threading

def generate_fractal_data(size, iterations, seed=None):
    """Generates fractal-like data using a chaotic iterative process."""
    if seed is not None:
        np.random.seed(seed)

    data = np.random.rand(size, size)
    temp_data = np.copy(data)

    for _ in range(iterations):
        for i in range(1, size - 1):
            for j in range(1, size - 1):
                neighborhood = data[i-1:i+2, j-1:j+2]
                avg = np.mean(neighborhood)
                variance = np.var(neighborhood)

                # A chaotic update rule, incorporating non-linear interactions
                temp_data[i, j] = (avg + variance * np.sin(data[i, j] * np.pi * 4)) % 1.0

        data = np.copy(temp_data)
    return data

def apply_temporal_modulation(data, time_factor):
    """Applies a time-dependent modulation to the fractal data."""
    modulated_data = data * (0.5 + 0.5 * np.sin(time_factor * np.pi * 2))
    return modulated_data

def apply_spatial_distortion(data, distortion_factor):
    """Applies a spatial distortion to the fractal data."""
    size = data.shape[0]
    distorted_data = np.zeros_like(data)
    for i in range(size):
        for j in range(size):
            x = int(i + distortion_factor * np.sin(j * np.pi * 0.1)) % size
            y = int(j + distortion_factor * np.cos(i * np.pi * 0.1)) % size
            distorted_data[i, j] = data[x, y]
    return distorted_data

def visualize_data(data, delay=0.1):
    """Visualizes the data as a dynamic ASCII art pattern."""
    size = data.shape[0]
    for row in data:
        line = ''.join(['#' if val > 0.5 else ' ' for val in row])
        print(line)
    time.sleep(delay)

def dynamic_generation_loop():
    """Dynamically generates and visualizes evolving patterns."""
    size = 40
    iterations = 50
    seed = random.randint(0, 1000)
    data = generate_fractal_data(size, iterations, seed)

    time_factor = 0.0
    distortion_factor = 5.0

    while True:
        modulated_data = apply_temporal_modulation(data, time_factor)
        distorted_data = apply_spatial_distortion(modulated_data, distortion_factor)
        visualize_data(distorted_data, delay=0.05)
        time_factor += 0.02
        distortion_factor = (distortion_factor + 0.1) % 10

        if time_factor > 100:
            seed = random.randint(0, 1000)
            data = generate_fractal_data(size, iterations, seed)
            time_factor = 0;
            distortion_factor = 5;

if __name__ == "__main__":
    dynamic_generation_loop()
