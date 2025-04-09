from flask import Flask, request, jsonify
import cv2

app = Flask(__name__)

@app.route('/scan', methods=['POST'])
def scan():
    image = request.json['image']  # Base64 image
    # Process with OpenCV (mocked here)
    return jsonify({'status': 'Healthy'})

if __name__ == '__main__':
    app.run(port=5001)