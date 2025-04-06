
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file');
    const previewContainer = document.getElementById('preview-container');
    const resultContainer = document.getElementById('result');
    const loadingIndicator = document.getElementById('loading');

    // File upload preview
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewContainer.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <p>${file.name}</p>
                `;
                previewContainer.classList.add('has-image');
            }
            
            reader.readAsDataURL(file);
        }
    });

    // Drag and drop functionality
    previewContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        previewContainer.classList.add('dragover');
    });

    previewContainer.addEventListener('dragleave', function() {
        previewContainer.classList.remove('dragover');
    });

    previewContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        previewContainer.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!fileInput.files.length) {
            showError('Please select a file first.');
            return;
        }
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        resultContainer.innerHTML = '';
        
        const formData = new FormData(form);
        
        fetch('/api/analyze', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server returned ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            // Check for error in response
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display results based on the returned data structure
            displayResults(data);
        })
        .catch(error => {
            loadingIndicator.classList.add('hidden');
            showError(error.message);
        });
    });
    
    // Display error message
    function showError(message) {
        resultContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>An error occurred during analysis.</p>
                <p class="error-details">${message}</p>
                <button class="action-btn" id="try-again">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        document.getElementById('try-again')?.addEventListener('click', function() {
            resultContainer.innerHTML = '';
        });
    }
    
    // Display analysis results
    function displayResults(data) {
        console.log('Received data:', data); // For debugging
        
        let resultHTML = `<h2>Analysis Results</h2>`;
        
        // Handle new API response structure
        if (data.deficiency || data.diagnosis) {
            const deficiency = data.deficiency || data.diagnosis;
            const confidence = data.confidence || 0.75; // Default if not provided
            const severityPercentage = Math.round(confidence * 100);
            
            resultHTML += `
                <div class="result-card">
                    <h3>Detected Deficiency</h3>
                    <p class="deficiency-name">${deficiency}</p>
                    
                    <div class="severity-indicator">
                        <span class="severity-label">Severity:</span>
                        <div class="severity-bar">
                            <div class="severity-fill" style="width: ${severityPercentage}%"></div>
                        </div>
                        <span class="severity-label">${severityPercentage}%</span>
                    </div>
                    
                    <div class="confidence">Detection Confidence: ${severityPercentage}%</div>
                </div>
            `;
        }
        
        // Handle recommendations from either API format
        const recommendations = data.recommendations || (data.recommendation ? [data.recommendation] : []);
        if (recommendations.length > 0) {
            resultHTML += `
                <div class="result-card">
                    <h3>Recommendations</h3>
                    <ul>
                        ${recommendations.map((rec, index) => 
                            `<li style="--i:${index}">${rec}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Handle color data if present
        if (data.color_data) {
            resultHTML += `
                <div class="result-card">
                    <h3>Color Analysis</h3>
                    <div class="color-data">
                        <div class="color-item">
                            <h4>Color Distribution</h4>
                            <ul>
                                ${Object.entries(data.color_data.percentages || {}).map(([color, percentage]) => 
                                    `<li>
                                        <span class="color-swatch" style="background-color: ${color}"></span>
                                        <span>${color}: ${percentage.toFixed(2)}%</span>
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Handle plots from either API format
        const plots = data.plots || [];
        if (plots.length > 0 || (typeof plots === 'object' && Object.keys(plots).length > 0)) {
            resultHTML += `<div class="plot-container"><h3>Analysis Plots</h3><div class="plots">`;
            
            // Handle array of plots
            if (Array.isArray(plots)) {
                resultHTML += plots.map(plot => 
                    `<img src="data:image/png;base64,${plot}" alt="Analysis Plot" class="analysis-plot">`
                ).join('');
            } 
            // Handle object of named plots 
            else {
                resultHTML += Object.entries(plots).map(([key, value]) => 
                    `<div class="plot-item">
                        <h4>${key.replace('_', ' ').toUpperCase()}</h4>
                        <img src="data:image/png;base64,${value}" alt="${key}" class="analysis-plot">
                    </div>`
                ).join('');
            }
            
            resultHTML += `</div></div>`;
        }
        
        // Add summary and action buttons
        resultHTML += `
            <div class="result-summary">
                <p>Analysis complete. Would you like to:</p>
                <div class="actions">
                    <button class="action-btn" id="download-report">
                        <i class="fas fa-download"></i> Download Report
                    </button>
                    <button class="action-btn" id="new-analysis">
                        <i class="fas fa-redo"></i> New Analysis
                    </button>
                </div>
            </div>
        `;
        
        resultContainer.innerHTML = resultHTML;
        
        // Scroll to results
        window.scrollTo({
            top: resultContainer.offsetTop - 50,
            behavior: 'smooth'
        });
        
        // Add event listeners to action buttons
        document.getElementById('new-analysis')?.addEventListener('click', function() {
            // Reset the form and scroll back to upload
            form.reset();
            previewContainer.innerHTML = `
                <i class="fas fa-leaf upload-icon"></i>
                <p>Drag and drop your leaf image or click to browse</p>
            `;
            previewContainer.classList.remove('has-image');
            resultContainer.innerHTML = '';
            window.scrollTo({
                top: document.querySelector('.upload-container').offsetTop - 100,
                behavior: 'smooth'
            });
        });
        
               document.getElementById('download-report')?.addEventListener('click', function() {
            // First, add the jsPDF library if not already included
            if (typeof jsPDF === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                document.head.appendChild(script);
                
                // Add jspdf-autotable for better tables
                const autoTableScript = document.createElement('script');
                autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
                document.head.appendChild(autoTableScript);
                
                script.onload = function() {
                    autoTableScript.onload = function() {
                        generateAndDownloadPDF(data);
                    };
                };
            } else {
                generateAndDownloadPDF(data);
            }
        });
        
        function generateAndDownloadPDF(data) {
            // Show loading state
            const downloadBtn = document.getElementById('download-report');
            const originalContent = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            downloadBtn.disabled = true;
            
            // Use setTimeout to ensure UI updates before intensive PDF work
            setTimeout(() => {
                try {
                    // Create new PDF document
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    
                    // Add logo (placeholder - replace with your actual logo)
                    const logoImg = new Image();
                    logoImg.src = document.querySelector('.logo')?.src || '';
                    
                    // Title and header
                    doc.setFontSize(20);
                    doc.setTextColor(76, 204, 163); // Match your primary color
                    doc.text('Leaf Nutrient Deficiency Analysis', 105, 20, { align: 'center' });
                    
                    // Date
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    const currentDate = new Date().toLocaleString();
                    doc.text(`Report generated: ${currentDate}`, 105, 30, { align: 'center' });
                    
                    // Add horizontal line
                    doc.setDrawColor(200, 200, 200);
                    doc.line(20, 35, 190, 35);
                    
                    let yPos = 45;
                    
                    // Add leaf image if available
                    const previewImg = document.querySelector('.preview-image');
                    if (previewImg) {
                        doc.addImage(previewImg.src, 'JPEG', 65, yPos, 80, 60);
                        yPos += 65;
                    }
                    
                    // Detected deficiency
                    if (data.deficiency || data.diagnosis) {
                        const deficiency = data.deficiency || data.diagnosis;
                        const confidence = data.confidence || 0.75;
                        const severityPercentage = Math.round(confidence * 100);
                        
                        doc.setFontSize(16);
                        doc.setTextColor(76, 204, 163);
                        doc.text('Detected Deficiency', 20, yPos);
                        yPos += 10;
                        
                        doc.setFontSize(14);
                        doc.setTextColor(60, 60, 60);
                        doc.text(deficiency, 20, yPos);
                        yPos += 10;
                        
                        doc.setFontSize(12);
                        doc.text(`Confidence: ${severityPercentage}%`, 20, yPos);
                        yPos += 15;
                    }
                    
                    // Recommendations
                    const recommendations = data.recommendations || (data.recommendation ? [data.recommendation] : []);
                    if (recommendations.length > 0) {
                        doc.setFontSize(16);
                        doc.setTextColor(76, 204, 163);
                        doc.text('Recommendations', 20, yPos);
                        yPos += 10;
                        
                        doc.setFontSize(12);
                        doc.setTextColor(60, 60, 60);
                        
                        recommendations.forEach(rec => {
                            // Split long recommendations into multiple lines
                            const lines = doc.splitTextToSize(rec, 170);
                            doc.text(lines, 20, yPos);
                            yPos += 7 * lines.length;
                        });
                        
                        yPos += 10;
                    }
                    
                    // Color data if available
                    if (data.color_data && data.color_data.percentages) {
                        doc.setFontSize(16);
                        doc.setTextColor(76, 204, 163);
                        doc.text('Color Analysis', 20, yPos);
                        yPos += 10;
                        
                        const colorData = [];
                        Object.entries(data.color_data.percentages).forEach(([color, percentage]) => {
                            colorData.push([color, `${percentage.toFixed(2)}%`]);
                        });
                        
                        doc.autoTable({
                            startY: yPos,
                            head: [['Color', 'Percentage']],
                            body: colorData,
                            theme: 'grid',
                            headStyles: { fillColor: [76, 204, 163] }
                        });
                        
                        yPos = doc.lastAutoTable.finalY + 15;
                    }
                    
                    // Footer
                    doc.setFontSize(10);
                    doc.setTextColor(150, 150, 150);
                    doc.text('Leaf Nutrient Deficiency Analyzer', 105, 285, { align: 'center' });
                    doc.text('© 2025 All Rights Reserved', 105, 290, { align: 'center' });
                    
                    // Download the PDF
                    doc.save('leaf-analysis-report.pdf');
                    
                    // Reset button
                    downloadBtn.innerHTML = originalContent;
                    downloadBtn.disabled = false;
                    
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    
                    // Show error message
                    downloadBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
                    downloadBtn.disabled = false;
                    
                    // Reset button after delay
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalContent;
                    }, 3000);
                }
            }, 100);
        }
    }
});