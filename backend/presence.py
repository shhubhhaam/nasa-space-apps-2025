import pickle
import os
import numpy as np
import traceback

filename = os.path.join(os.path.dirname(__file__), 'presence_model.pkl')

def predict(data : list):
    if not os.path.exists(filename):
        print(f"Model file not found: {filename}")
        return

    try:
        with open(filename, 'rb') as file:
            loaded_model = pickle.load(file)
    except Exception as e:
        print("Failed to load pickle file:")
        traceback.print_exc()
        return

    # Inspect model
    print("Loaded model type:", type(loaded_model))

    # Prepare a single sample for prediction

    # Ensure sample is 2D
    if data.ndim == 1:
        data = data.reshape(1, -1)

    try:
        ans = loaded_model.predict(data)
        print("Prediction:", ans)
    except Exception as e:
        print("Failed to run predict() on the loaded model:")
        traceback.print_exc()
