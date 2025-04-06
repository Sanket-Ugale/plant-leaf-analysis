import os
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
from io import BytesIO
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def analyze_leaf_color(image_path, generate_plots=False):
    image = cv2.imread(image_path)
    
    if image is None:
        return {"error": "Image not found or unable to load."}
    
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    hsv_image = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    
    color_ranges = {
        "Green": ((35, 40, 40), (85, 255, 255)),
        "Yellow": ((20, 40, 40), (34, 255, 255)),
        "Red": ((0, 40, 40), (10, 255, 255)),
        "Upper_Red": ((160, 40, 40), (180, 255, 255)),
        "Brown": ((10, 40, 40), (20, 255, 255)),
    }
    
    color_counts = {}
    total_pixels = image.shape[0] * image.shape[1]
    color_masks = {}
    
    for color, (lower, upper) in color_ranges.items():
        if color != "Upper_Red":
            mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
            color_counts[color] = int(np.sum(mask > 0))
            if generate_plots:
                color_masks[color] = mask
        else:
            mask = cv2.inRange(hsv_image, np.array(lower), np.array(upper))
            color_counts["Red"] = color_counts.get("Red", 0) + int(np.sum(mask > 0))
            if generate_plots and "Red" in color_masks:
                color_masks["Red"] = cv2.bitwise_or(color_masks["Red"], mask)
            elif generate_plots:
                color_masks["Red"] = mask
    
    color_proportions = {color: count / total_pixels for color, count in color_counts.items()}
    
    deficiency = "Healthy"
    recommendation = "No fertilizer needed. The plant appears healthy."
    
    if color_proportions.get("Yellow", 0) > 0.25:
        deficiency = "Nitrogen Deficiency"
        recommendation = "Apply a nitrogen-rich fertilizer such as urea or ammonium sulfate."
    elif color_proportions.get("Red", 0) > 0.20:
        deficiency = "Phosphorus Deficiency"
        recommendation = "Use phosphorus fertilizers like superphosphate or bone meal."
    elif color_proportions.get("Brown", 0) > 0.20:
        deficiency = "Potassium Deficiency"
        recommendation = "Apply potash-based fertilizers such as potassium sulfate."
    elif color_proportions.get("Green", 0) < 0.40:
        deficiency = "General Chlorosis"
        recommendation = "Consider a balanced NPK fertilizer and check for issues like poor drainage."
    
    result = {
        "diagnosis": deficiency,
        "recommendation": recommendation,
        "color_data": {
            "counts": color_counts,
            "proportions": {k: round(v, 4) for k, v in color_proportions.items()},
            "percentages": {k: round(v * 100, 2) for k, v in color_proportions.items()}
        },
        "image_info": {
            "width": image.shape[1],
            "height": image.shape[0],
            "total_pixels": total_pixels
        }
    }
    
    if generate_plots:
        plots = {}
        
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.imshow(image)
        ax.set_title("Original Image")
        ax.axis('off')
        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        plots["original_image"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.imshow(cv2.cvtColor(hsv_image, cv2.COLOR_HSV2RGB))
        ax.set_title("HSV Image")
        ax.axis('off')
        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        plots["hsv_image"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        for color, mask in color_masks.items():
            fig, ax = plt.subplots(figsize=(6, 4))
            ax.imshow(mask, cmap='gray')
            ax.set_title(f"{color} Detection")
            ax.axis('off')
            buf = BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            plots[f"{color.lower()}_mask"] = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
        
        fig, ax = plt.subplots(figsize=(8, 5))
        colors = ['green', 'yellow', 'red', 'brown']
        available_colors = list(color_proportions.keys())
        ax.bar(available_colors, 
               [color_proportions.get(c, 0) for c in available_colors], 
               color=[c.lower() for c in available_colors])
        ax.set_xlabel("Color")
        ax.set_ylabel("Proportion")
        ax.set_title("Leaf Color Proportion Analysis")
        ax.set_ylim(0, 1.0)
        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        plots["color_proportions"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        result["plots"] = plots
    
    return result

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        include_plots = request.form.get('include_plots', 'false').lower() == 'true'
        result = analyze_leaf_color(file_path, generate_plots=include_plots)
        
        if not app.debug:
            os.remove(file_path)
            
        return jsonify(result)
    
    return jsonify({'error': 'Allowed file types are png, jpg, jpeg'}), 400

@app.route('/api/analyze-demo', methods=['GET'])
def analyze_demo():
    demo_image_path = os.path.join('demo', 'sample_leaf.jpg')
    
    if not os.path.exists(demo_image_path):
        return jsonify({'error': 'Demo image not found'}), 404
    
    include_plots = request.args.get('include_plots', 'false').lower() == 'true'
    result = analyze_leaf_color(demo_image_path, generate_plots=include_plots)
    
    return jsonify(result)

@app.route('/templates/index.html')
def get_index_template():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=False)