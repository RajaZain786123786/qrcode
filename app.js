document.addEventListener('DOMContentLoaded', function() {
    const videoElement = document.getElementById('scanner-video');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const toggleFlashBtn = document.getElementById('toggle-flash');
    const cameraSelect = document.getElementById('camera-select');
    const resultContent = document.getElementById('result-content');
    const resultType = document.getElementById('result-type');
    const copyBtn = document.getElementById('copy-btn');
    
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let selectedDeviceId = null;
    let flashEnabled = false;
    let scanning = false;
    
    // Populate camera selection dropdown
    async function populateCameras() {
        try {
            const videoInputDevices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
            
            if (videoInputDevices.length === 0) {
                cameraSelect.innerHTML = '<option value="">No cameras found</option>';
                return;
            }
            
            cameraSelect.innerHTML = '<option value="">Select Camera</option>';
            
            videoInputDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${cameraSelect.length}`;
                cameraSelect.appendChild(option);
            });
            
            if (videoInputDevices.length === 1) {
                selectedDeviceId = videoInputDevices[0].deviceId;
                cameraSelect.value = selectedDeviceId;
            }
            
            cameraSelect.disabled = false;
        } catch (error) {
            console.error('Error listing cameras:', error);
            resultContent.textContent = 'Error accessing cameras: ' + error.message;
        }
    }
    
    // Start scanning
    async function startScanning() {
        if (scanning) return;
        
        if (!selectedDeviceId && cameraSelect.value) {
            selectedDeviceId = cameraSelect.value;
        }
        
        try {
            await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, error) => {
                if (result) {
                    handleScanResult(result);
                }
                
                if (error && !(error instanceof ZXing.NotFoundException)) {
                    console.error('Scan error:', error);
                    resultContent.textContent = 'Scan error: ' + error.message;
                }
            });
            
            scanning = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            toggleFlashBtn.disabled = false;
            cameraSelect.disabled = true;
            
            // Try to enable flash if available
            if (videoElement.srcObject) {
                const stream = videoElement.srcObject;
                const track = stream.getVideoTracks()[0];
                if (track && track.getCapabilities().torch) {
                    toggleFlashBtn.disabled = false;
                } else {
                    toggleFlashBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Error starting scanner:', error);
            resultContent.textContent = 'Error starting scanner: ' + error.message;
        }
    }
    
    // Stop scanning
    function stopScanning() {
        if (!scanning) return;
        
        codeReader.reset();
        scanning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        toggleFlashBtn.disabled = true;
        cameraSelect.disabled = false;
        flashEnabled = false;
        toggleFlashBtn.textContent = 'Toggle Flash';
    }
    
    // Toggle flash
    async function toggleFlash() {
        if (!videoElement.srcObject) return;
        
        const stream = videoElement.srcObject;
        const track = stream.getVideoTracks()[0];
        
        if (!track || !track.getCapabilities().torch) {
            resultContent.textContent = 'Flash not available on this device';
            return;
        }
        
        try {
            await track.applyConstraints({
                advanced: [{torch: !flashEnabled}]
            });
            
            flashEnabled = !flashEnabled;
            toggleFlashBtn.textContent = flashEnabled ? 'Turn Flash Off' : 'Turn Flash On';
        } catch (error) {
            console.error('Error toggling flash:', error);
            resultContent.textContent = 'Error toggling flash: ' + error.message;
        }
    }
    
    // Handle scan results
    function handleScanResult(result) {
        resultContent.textContent = result.text;
        resultType.textContent = `Type: ${result.format}`;
        copyBtn.disabled = false;
        
        // Vibrate if supported
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
        
        // If result is a URL, make it clickable
        if (isValidUrl(result.text)) {
            const urlElement = document.createElement('a');
            urlElement.href = result.text;
            urlElement.textContent = result.text;
            urlElement.target = '_blank';
            urlElement.rel = 'noopener noreferrer';
            resultContent.innerHTML = '';
            resultContent.appendChild(urlElement);
        }
    }
    
    // Check if text is a valid URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    // Copy to clipboard
    function copyToClipboard() {
        const text = resultContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            resultContent.textContent = 'Failed to copy to clipboard: ' + err.message;
        });
    }
    
    // Event listeners
    startBtn.addEventListener('click', startScanning);
    stopBtn.addEventListener('click', stopScanning);
    toggleFlashBtn.addEventListener('click', toggleFlash);
    cameraSelect.addEventListener('change', function() {
        selectedDeviceId = this.value;
    });
    copyBtn.addEventListener('click', copyToClipboard);
    
    // Initialize
    populateCameras();
    
    // Check for camera permissions
    navigator.permissions && navigator.permissions.query({name: 'camera'}).then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
            populateCameras();
        }
        
        permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
                populateCameras();
            }
        };
    });
});
