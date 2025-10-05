import pickle
import os
import numpy as np
import traceback

filename = os.path.join(os.path.dirname(__file__), 'presence_model.pkl')

def main():
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
    # decimalLatitude	decimalLongitude	month	bathymetry	sst	sss	shoredistance
    sample = np.array([[-23.03220, 113.715000, 12.0, 4111.000000, 200.900000, 100.860000, 10835]])

    # Ensure sample is 2D
    if sample.ndim == 1:
        sample = sample.reshape(1, -1)

    try:
        ans = loaded_model.predict(sample)
        print("Prediction:", ans)
    except Exception as e:
        print("Failed to run predict() on the loaded model:")
        traceback.print_exc()

if __name__ == '__main__':
    main()