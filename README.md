# Plant Leaf Analysis Application

This project is a web application built using Flask that analyzes leaf images to diagnose potential nutrient deficiencies based on color distribution. The application allows users to upload leaf images, which are then processed to provide insights and recommendations for plant care.

## Project Structure

```
plant-leaf
├── app.py                  # Main application file that sets up the Flask server and handles image analysis
├── requirements.txt        # Lists the dependencies required for the project
├── static                  # Contains static files such as CSS, JavaScript, and images
│   ├── css
│   │   └── styles.css      # CSS styles for the web application
│   ├── js
│   │   └── main.js         # JavaScript code for client-side functionality
│   └── images
│       └── logo.svg        # Logo image for the web application
├── templates               # Contains HTML templates for rendering the user interface
│   ├── index.html          # Main HTML template for file uploads
│   ├── results.html        # Template for displaying analysis results
│   └── layout.html         # Base layout for other HTML templates
├── uploads                 # Directory for storing uploaded images
│   └── .gitkeep            # Ensures the uploads directory is tracked by Git
├── demo                    # Contains demo files for testing
│   └── sample_leaf.jpg     # Sample image for demonstration purposes
└── README.md               # Documentation for the project
```

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone https://github.com/Sanket-Ugale/plant-leaf-analysis
   cd plant-leaf
   ```

2. **Create a virtual environment**:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install the required dependencies**:
   ```
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```
   python app.py
   ```
   The application will be accessible at `http://127.0.0.1`.

## Usage

- Navigate to the home page to upload a leaf image.
- The application will analyze the image and provide a diagnosis along with recommendations for nutrient deficiencies.
- You can also access a demo image for testing purposes.

## Functionality

- **Image Upload**: Users can upload leaf images in PNG, JPG, or JPEG formats.
- **Leaf Analysis**: The application analyzes the color distribution of the leaf to identify potential nutrient deficiencies.
- **Results Display**: After analysis, the results are displayed on a separate page, including visual plots of color proportions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.