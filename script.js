// ============================================
// FIXMYSTREET - INTERACTIVE JAVASCRIPT
// Gamification + GPS + Animations + Backend
// ============================================

// ============================================
// STATE MANAGEMENT
// ============================================

const appState = {
    currentPage: 'home',
    currentStep: 1,
    selectedIssueType: '',
    photoFile: null,
    description: '',
    location: '',
    locationReady: false,
    currentLat: null,       // Current GPS latitude
    currentLon: null,       // Current GPS longitude
    currentAccuracy: null,  // Current GPS accuracy
    userPoints: parseInt(localStorage.getItem('userPoints') || '0'),
    reports: JSON.parse(localStorage.getItem('reports') || '[]'),
    publicMap: null,        // Map for map-view page
    locationMap: null,      // Map for report page location step
    locationMarker: null,   // Marker for current GPS location
    accuracyCircle: null,   // Circle showing GPS accuracy
    watchId: null
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initReportForm();
    initMap();
    initParticles();
    loadUserData();
    updateStats();
    loadFeaturedIssues();
    
    // Auto-detect theme preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }
});

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        appState.currentPage = page;
        
        // Initialize page-specific features
        if (page === 'map-view') {
            setTimeout(() => {
                if (appState.publicMap) {
                    appState.publicMap.invalidateSize();
                }
            }, 100);
        } else if (page === 'report') {
            // Initialize location map when navigating to report page
            // But don't reset if we already have GPS coordinates
            setTimeout(() => {
                if (!appState.locationMap) {
                    initLocationMap();
                } else if (appState.currentLat && appState.currentLon) {
                    // If we have GPS coordinates, update the map to show them
                    updateLocationOnMap(appState.currentLat, appState.currentLon, appState.currentAccuracy || 50, appState.location);
                }
            }, 100);
        }
    }
}

// ============================================
// PARTICLES ANIMATION
// ============================================

function initParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = Math.random() * 5 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        particlesContainer.appendChild(particle);
    }
}

// ============================================
// REPORT FORM
// ============================================

function initReportForm() {
    // Issue type selection
    document.querySelectorAll('.issue-type-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.issue-type-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            appState.selectedIssueType = card.getAttribute('data-type');
            document.getElementById('issueType').value = appState.selectedIssueType;
            animateCard(card);
        });
    });
    
    // Photo upload
    const photoInput = document.getElementById('photoInput');
    const photoUploadArea = document.getElementById('photoUploadArea');
    const photoPreview = document.getElementById('photoPreview');
    const previewImage = document.getElementById('previewImage');
    const removePhoto = document.getElementById('removePhoto');
    
    photoUploadArea.addEventListener('click', () => photoInput.click());
    
    photoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoUploadArea.classList.add('dragover');
    });
    
    photoUploadArea.addEventListener('dragleave', () => {
        photoUploadArea.classList.remove('dragover');
    });
    
    photoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        photoUploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handlePhotoUpload(files[0]);
        }
    });
    
    photoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePhotoUpload(e.target.files[0]);
        }
    });
    
    removePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        resetPhotoUpload();
    });
    
    // Description counter
    const descInput = document.getElementById('descInput');
    const charCount = document.getElementById('charCount');
    
    descInput.addEventListener('input', () => {
        const length = descInput.value.length;
        charCount.textContent = length;
        appState.description = descInput.value;
        
        // Wave effect on character limit
        if (length >= 280) {
            charCount.style.color = '#f59e0b';
            charCount.style.animation = 'pulse 0.5s ease';
        } else if (length >= 300) {
            charCount.style.color = '#ef4444';
        } else {
            charCount.style.color = '';
        }
    });
    
    // GPS Location
    const detectLocBtn = document.getElementById('detectLocBtn');
    const confirmLocBtn = document.getElementById('confirmLocBtn');
    const locationStatus = document.getElementById('locationStatus');
    const manualLocation = document.getElementById('manualLocation');
    
    detectLocBtn.addEventListener('click', detectGPSLocation);
    
    confirmLocBtn.addEventListener('click', () => {
        if (appState.location) {
            appState.locationReady = true;
            locationStatus.innerHTML = `
                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                <span>✅ CONFIRMED: ${appState.location}</span>
            `;
            confirmLocBtn.disabled = true;
            confirmLocBtn.innerHTML = '<i class="fas fa-lock"></i> Locked';
            confirmLocBtn.style.background = '#10b981';
            updateReview();
        }
    });
    
    manualLocation.addEventListener('input', () => {
        if (manualLocation.value.trim()) {
            appState.location = manualLocation.value.trim();
            appState.locationReady = true;
            locationStatus.innerHTML = `
                <i class="fas fa-map-marker-alt" style="color: #6366f1;"></i>
                <span>📍 Manual: ${appState.location}</span>
            `;
            confirmLocBtn.disabled = false;
            
            // Try to show on map if coordinates are provided
            const coords = extractCoordinates(appState.location);
            if (coords) {
                appState.currentLat = coords[0];
                appState.currentLon = coords[1];
                initLocationMap();
                setTimeout(() => {
                    updateLocationOnMap(coords[0], coords[1], 50, appState.location);
                }, 200);
            }
            
            updateReview();
        }
    });
    
    // Form submission
    const reportForm = document.getElementById('reportForm');
    reportForm.addEventListener('submit', handleFormSubmit);
}

function handlePhotoUpload(file) {
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file', 'error');
        return;
    }
    
    appState.photoFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImage = document.getElementById('previewImage');
        const photoPreview = document.getElementById('photoPreview');
        const uploadPlaceholder = photoUploadArea.querySelector('.upload-placeholder');
        
        previewImage.src = e.target.result;
        uploadPlaceholder.style.display = 'none';
        photoPreview.style.display = 'block';
        
        // Shimmer effect
        photoPreview.classList.add('shimmer');
        setTimeout(() => photoPreview.classList.remove('shimmer'), 1000);
    };
    reader.readAsDataURL(file);
}

function resetPhotoUpload() {
    appState.photoFile = null;
    document.getElementById('photoInput').value = '';
    document.getElementById('photoPreview').style.display = 'none';
    photoUploadArea.querySelector('.upload-placeholder').style.display = 'block';
}

function animateCard(card) {
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);
}

// ============================================
// GPS LOCATION (KEEPING EXISTING WORKING CODE)
// ============================================

function detectGPSLocation() {
    if (!navigator.geolocation) {
        showMessage('❌ Geolocation not supported by browser', 'error');
        return;
    }
    
    const detectLocBtn = document.getElementById('detectLocBtn');
    const locationStatus = document.getElementById('locationStatus');
    const accuracyDisplay = document.getElementById('accuracyDisplay');
    const compassIcon = document.getElementById('compassIcon');
    
    detectLocBtn.disabled = true;
    detectLocBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting GPS...';
    
    // Start compass animation
    if (compassIcon) {
        compassIcon.style.animation = 'spin-slow 1s linear infinite';
    }
    
    // HIGH ACCURACY GPS - use a combination of getCurrentPosition (immediate) and watchPosition (continuous updates)
    // Clear any previous watch
    try {
        if (appState.watchId != null && navigator.geolocation.clearWatch) {
            navigator.geolocation.clearWatch(appState.watchId);
            appState.watchId = null;
        }
    } catch (e) {
        console.warn('Failed to clear previous watch:', e);
    }

    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
    };

    const handlePosition = async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log(`GPS: ${lat}, ${lon} (accuracy: ${accuracy}m)`);

        if (accuracyDisplay) {
            accuracyDisplay.textContent = `±${Math.round(accuracy)}m`;
            accuracyDisplay.style.color = accuracy < 20 ? '#10b981' : accuracy < 50 ? '#f59e0b' : '#ef4444';
        }

        if (compassIcon) {
            compassIcon.style.animation = '';
        }

        let locText = `${lat.toFixed(6)}, ${lon.toFixed(6)} (±${Math.round(accuracy)}m)`;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) locText = data.display_name;
        } catch (err) {
            console.log('Reverse geocoding failed, using coordinates');
        }

        // Update state and UI
        appState.currentLat = lat;
        appState.currentLon = lon;
        appState.currentAccuracy = accuracy;
        appState.location = locText;

        locationStatus.innerHTML = `
            <i class="fas fa-check-circle" style="color: #10b981;"></i>
            <span><strong>📍 GPS Location Found:</strong><br>${locText}<br><small style="opacity: 0.7;">Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}</small></span>
        `;

        document.getElementById('confirmLocBtn').disabled = false;
        showMessage(`✅ Location detected! Accuracy: ±${Math.round(accuracy)}m`, 'success');

        // Ensure map updated
        initLocationMap();
        let retryCount = 0;
        const maxRetries = 6;
        const tryUpdateMap = () => {
            if (appState.locationMap) {
                try { appState.locationMap.invalidateSize(); } catch (e) { console.warn('invalidateSize failed:', e); }
                updateLocationOnMap(lat, lon, accuracy, locText);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(tryUpdateMap, 300);
            } else {
                console.warn('Map initialization failed after retries, but location is stored');
                showMessage('⚠️ Location saved, but map display failed. You can still submit the report.', 'warning');
            }
        };
        setTimeout(tryUpdateMap, 200);

        detectLocBtn.disabled = false;
        detectLocBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh GPS';

        updateReview();
    };

    const handleError = (error) => {
        console.error('GPS Error:', error);
        let errorMsg = 'GPS failed: ';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMsg += 'Location access denied. Please allow location access in browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMsg += 'GPS signal weak. Try moving to an open area.';
                break;
            case error.TIMEOUT:
                errorMsg += 'GPS timeout. Please try again.';
                break;
            default:
                errorMsg += 'Unknown error.';
        }
        showMessage(errorMsg, 'error');
        detectLocBtn.disabled = false;
        detectLocBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Get GPS Location';
        if (compassIcon) compassIcon.style.animation = '';
    };

    // First attempt: immediate position
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, geoOptions);

    // Then start watching for more accurate updates
    try {
        if (navigator.geolocation.watchPosition) {
            const id = navigator.geolocation.watchPosition(handlePosition, handleError, geoOptions);
            appState.watchId = id;
        }
    } catch (e) {
        console.warn('watchPosition not available:', e);
    }
}

// ============================================
// FORM STEPS
// ============================================

function nextStep() {
    const currentStep = appState.currentStep;
    
    // Validation
    if (currentStep === 1) {
        if (!appState.selectedIssueType) {
            showMessage('Please select an issue type', 'error');
            return;
        }
        if (!appState.photoFile) {
            showMessage('Please upload a photo', 'error');
            return;
        }
        if (!appState.description.trim()) {
            showMessage('Please add a description', 'error');
            return;
        }
    } else if (currentStep === 2) {
        if (!appState.locationReady) {
            showMessage('Please confirm your location', 'error');
            return;
        }
    }
    
    if (currentStep < 3) {
        appState.currentStep = currentStep + 1;
        updateFormSteps();
        updateReview();
        
        // Initialize location map when moving to step 2
        if (appState.currentStep === 2) {
            setTimeout(() => {
                if (!appState.locationMap) {
                    initLocationMap();
                } else if (appState.currentLat && appState.currentLon) {
                    // If we already have GPS coordinates, show them immediately
                    updateLocationOnMap(appState.currentLat, appState.currentLon, appState.currentAccuracy || 50, appState.location);
                } else {
                    // Just invalidate size if map exists
                    appState.locationMap.invalidateSize();
                }
            }, 100);
        }
    }
}

function prevStep() {
    if (appState.currentStep > 1) {
        appState.currentStep = appState.currentStep - 1;
        updateFormSteps();
    }
}

function updateFormSteps() {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
        if (parseInt(step.getAttribute('data-step')) === appState.currentStep) {
            step.classList.add('active');
        }
    });
    
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
        if (parseInt(step.getAttribute('data-step')) === appState.currentStep) {
            step.classList.add('active');
        }
    });
}

function updateReview() {
    const typeNames = {
        pothole: '🕳️ Pothole',
        garbage: '🗑️ Garbage',
        streetlight: '💡 Streetlight',
        wires: '🔌 Wires',
        water: '💧 Water',
        other: '🔧 Other'
    };
    
    document.getElementById('reviewType').textContent = 
        appState.selectedIssueType ? typeNames[appState.selectedIssueType] : '-';
    document.getElementById('reviewDesc').textContent = appState.description || '-';
    document.getElementById('reviewLoc').textContent = appState.location || '-';
    
    if (appState.photoFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('reviewPhoto').src = e.target.result;
            document.getElementById('reviewPhotoItem').style.display = 'block';
        };
        reader.readAsDataURL(appState.photoFile);
    }
}

// ============================================
// FORM SUBMISSION (BACKEND INTEGRATION)
// ============================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!appState.photoFile || !appState.description || !appState.locationReady) {
        showMessage('Please complete all fields', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    showLoading(true);
    
    // Prepare FormData (matching server.py format)
    const formData = new FormData();
    formData.append('image', appState.photoFile);
    formData.append('description', `[${appState.selectedIssueType.toUpperCase()}] ${appState.description}`);
    
    // Include coordinates in location if available for better accuracy
    let locationText = appState.location;
    if (appState.currentLat && appState.currentLon) {
        locationText = `${appState.location} (${appState.currentLat.toFixed(6)}, ${appState.currentLon.toFixed(6)})`;
    }
    formData.append('location', locationText);
    
    try {
        const response = await fetch('/send_report', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'ok') {
            // Success!
            const pointsEarned = 10;
            appState.userPoints += pointsEarned;
            saveUserData();
            
            // Save report
            const report = {
                id: Date.now(),
                type: appState.selectedIssueType,
                description: appState.description,
                location: appState.location,
                photo: appState.photoFile ? URL.createObjectURL(appState.photoFile) : null,
                date: new Date().toISOString(),
                status: 'submitted',
                points: pointsEarned
            };
            
            appState.reports.push(report);
            saveUserData();
            
            // Add marker to public map after successful submission
            if (appState.currentLat && appState.currentLon) {
                const latlng = [appState.currentLat, appState.currentLon];
                
                // Add to public map if it exists
                if (appState.publicMap) {
                    L.circleMarker(latlng, {
                        radius: 12,
                        color: '#10b981',
                        fillColor: '#10b981',
                        fillOpacity: 0.7
                    }).addTo(appState.publicMap).bindPopup(`✅ REPORT SENT: ${appState.description.substring(0, 50)}...`);
                }
            }
            
            // Show success modal with confetti
            showSuccessModal(pointsEarned);
            
            // Reset form
            resetForm();
            
        } else {
            showMessage(`❌ ${data.message || 'Error sending report'}`, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showMessage('❌ Server error - check terminal', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Report';
        showLoading(false);
    }
}

function resetForm() {
    appState.currentStep = 1;
    appState.selectedIssueType = '';
    appState.photoFile = null;
    appState.description = '';
    appState.location = '';
    appState.locationReady = false;
    appState.currentLat = null;
    appState.currentLon = null;
    appState.currentAccuracy = null;
    
    document.getElementById('reportForm').reset();
    document.querySelectorAll('.issue-type-card').forEach(c => c.classList.remove('selected'));
    resetPhotoUpload();
    document.getElementById('descInput').value = '';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('locationStatus').innerHTML = '<i class="fas fa-info-circle"></i> <span>Click "Get GPS Location" or enter manually</span>';
    document.getElementById('confirmLocBtn').disabled = true;
    document.getElementById('confirmLocBtn').innerHTML = 'Next: Confirm <i class="fas fa-arrow-right"></i>';
    document.getElementById('confirmLocBtn').style.background = '';
    document.getElementById('manualLocation').value = '';
    
    if (appState.locationMarker && appState.locationMap) {
        appState.locationMap.removeLayer(appState.locationMarker);
        appState.locationMarker = null;
    }
    
    if (appState.accuracyCircle && appState.locationMap) {
        appState.locationMap.removeLayer(appState.accuracyCircle);
        appState.accuracyCircle = null;
    }
    
    updateFormSteps();
    updateStats();
}

// ============================================
// MAP INITIALIZATION
// ============================================

function initMap() {
    // Initialize public map (map-view page)
    const publicMapElement = document.getElementById('publicMap');
    if (publicMapElement && !appState.publicMap) {
        appState.publicMap = L.map('publicMap').setView([29.3781, 75.9045], 8);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(appState.publicMap);
        
        // Load saved reports on map
        loadReportsOnMap();
    }
    
    // Initialize location map (report page) - will be initialized when needed
    initLocationMap();
}

function initLocationMap() {
    const locationMapElement = document.getElementById('locationMap');
    if (!locationMapElement) {
        console.log('Location map element not found');
        return;
    }
    
    // Only initialize if not already initialized
    if (appState.locationMap) {
        // Map already exists, just invalidate size in case it was hidden
        setTimeout(() => {
            if (appState.locationMap) {
                appState.locationMap.invalidateSize();
                // If we have stored coordinates, update the view
                if (appState.currentLat && appState.currentLon) {
                    appState.locationMap.setView([appState.currentLat, appState.currentLon], 17);
                }
            }
        }, 100);
        return;
    }
    
    try {
        // Use stored GPS coordinates if available, otherwise use default
        const initialLat = appState.currentLat || 29.3781;
        const initialLon = appState.currentLon || 75.9045;
        const initialZoom = (appState.currentLat && appState.currentLon) ? 17 : 8;
        
        // Initialize location map
        appState.locationMap = L.map('locationMap', {
            zoomControl: true,
            attributionControl: true
        }).setView([initialLat, initialLon], initialZoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(appState.locationMap);
        
        console.log(`Location map initialized at: ${initialLat}, ${initialLon}`);
        
        // If we have stored coordinates, immediately show them
        if (appState.currentLat && appState.currentLon && appState.location) {
            setTimeout(() => {
                updateLocationOnMap(appState.currentLat, appState.currentLon, appState.currentAccuracy || 50, appState.location);
            }, 100);
        }
    } catch (error) {
        console.error('Error initializing location map:', error);
    }
}

function updateLocationOnMap(lat, lon, accuracy, locText) {
    console.log(`updateLocationOnMap called with: ${lat}, ${lon}, accuracy: ${accuracy}`);
    
    if (!appState.locationMap) {
        console.log('Location map not initialized, initializing now...');
        initLocationMap();
        // Try again after a short delay
        setTimeout(() => {
            if (appState.locationMap) {
                updateLocationOnMap(lat, lon, accuracy, locText);
            } else {
                console.error('Map still not initialized after retry');
            }
        }, 500);
        return;
    }
    
    try {
        console.log(`Updating map to show location: ${lat}, ${lon}`);
        
        // Remove existing marker if any
        if (appState.locationMarker) {
            appState.locationMap.removeLayer(appState.locationMarker);
            appState.locationMarker = null;
        }
        
        // Remove existing accuracy circle if any
        if (appState.accuracyCircle) {
            appState.locationMap.removeLayer(appState.accuracyCircle);
            appState.accuracyCircle = null;
        }
        
        // Ensure map layout is correct (in case it was hidden) and animate to the location
        try {
            appState.locationMap.invalidateSize();
        } catch (e) {
            console.warn('invalidateSize failed:', e);
        }

        if (typeof appState.locationMap.flyTo === 'function') {
            appState.locationMap.flyTo([Number(lat), Number(lon)], 17, { duration: 1 });
        } else {
            appState.locationMap.setView([Number(lat), Number(lon)], 17);
        }
        
        // Create custom icon for current location
        const customIcon = L.divIcon({
            className: 'current-location-marker',
            html: '<div style="width: 32px; height: 32px; background: #6366f1; border: 4px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(99,102,241,0.5); position: relative; animation: pulse 2s infinite;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        // Add marker at current location
        appState.locationMarker = L.marker([lat, lon], { 
            icon: customIcon,
            draggable: false
        }).addTo(appState.locationMap);
        
        // Bind popup with location info
        appState.locationMarker.bindPopup(`
            <div style="text-align: center; padding: 0.5rem;">
                <b style="color: #6366f1;">📍 YOUR CURRENT LOCATION</b><br>
                <div style="margin: 0.5rem 0; font-size: 0.9rem;">${locText}</div>
                <div style="font-size: 0.8rem; color: #666;">Accuracy: ±${Math.round(accuracy)}m</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 0.25rem;">${lat.toFixed(6)}, ${lon.toFixed(6)}</div>
            </div>
        `).openPopup();
        
        // Add accuracy circle to show GPS uncertainty
        appState.accuracyCircle = L.circle([lat, lon], {
            radius: Math.max(accuracy, 10), // Minimum 10m radius
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(appState.locationMap);
        
        console.log(`✅ Location marker successfully added at: ${lat}, ${lon}`);
        console.log(`Map center is now: ${appState.locationMap.getCenter().lat}, ${appState.locationMap.getCenter().lng}`);
        
        // Ensure map is visible and properly sized
        setTimeout(() => {
            appState.locationMap.invalidateSize();
            // Double-check the view is correct
            const currentCenter = appState.locationMap.getCenter();
            const distance = Math.abs(currentCenter.lat - lat) + Math.abs(currentCenter.lng - lon);
            if (distance > 0.01) {
                console.warn('Map center mismatch, correcting...');
                appState.locationMap.setView([lat, lon], 17);
            }
        }, 200);
        
    } catch (error) {
        console.error('Error updating location on map:', error);
        showMessage('Error displaying location on map: ' + error.message, 'error');
    }
}

function loadReportsOnMap() {
    if (!appState.publicMap) return;
    
    appState.reports.forEach(report => {
        // Extract coordinates from location if available
        const coords = extractCoordinates(report.location);
        if (coords) {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: #6366f1; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20]
            });
            
            L.marker(coords, { icon })
                .addTo(appState.publicMap)
                .bindPopup(`
                    <b>${report.type.toUpperCase()}</b><br>
                    ${report.description}<br>
                    <small>${report.location}</small>
                `);
        }
    });
}

function extractCoordinates(location) {
    // Try to extract lat,lon from location string
    const match = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
}

// ============================================
// GAMIFICATION
// ============================================

function updateStats() {
    document.getElementById('totalReports').textContent = appState.reports.length;
    document.getElementById('resolvedReports').textContent = 
        appState.reports.filter(r => r.status === 'resolved').length;
    document.getElementById('userPoints').textContent = appState.userPoints;
    document.getElementById('badgePoints').textContent = `${appState.userPoints} points`;
    
    // Update progress circle
    const progress = Math.min((appState.userPoints % 100) / 100, 1);
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const circumference = 2 * Math.PI * 45;
        progressBar.style.strokeDashoffset = circumference * (1 - progress);
    }
    
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = `${Math.round(progress * 100)}%`;
    }
}

function loadUserData() {
    // Load from localStorage
    const savedPoints = localStorage.getItem('userPoints');
    const savedReports = localStorage.getItem('reports');
    
    if (savedPoints) {
        appState.userPoints = parseInt(savedPoints);
    }
    
    if (savedReports) {
        appState.reports = JSON.parse(savedReports);
    }
}

function saveUserData() {
    localStorage.setItem('userPoints', appState.userPoints.toString());
    localStorage.setItem('reports', JSON.stringify(appState.reports));
    updateStats();
}

// ============================================
// FEATURED ISSUES
// ============================================

function loadFeaturedIssues() {
    const container = document.getElementById('featuredIssues');
    if (!container) return;
    
    if (appState.reports.length === 0) {
        container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 2rem; opacity: 0.7;">No reports yet. Be the first to report an issue!</p>';
        return;
    }
    
    const recentReports = appState.reports.slice(-6).reverse();
    
    container.innerHTML = recentReports.map(report => `
        <div class="issue-card" onclick="viewReport(${report.id})">
            ${report.photo ? `<img src="${report.photo}" alt="Issue" class="issue-card-image">` : ''}
            <div class="issue-card-content">
                <div class="issue-card-type">${report.type.toUpperCase()}</div>
                <div class="issue-card-desc">${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</div>
                <div class="issue-card-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${report.location.substring(0, 50)}${report.location.length > 50 ? '...' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function viewReport(id) {
    const report = appState.reports.find(r => r.id === id);
    if (report) {
        navigateToPage('my-reports');
        // Could scroll to specific report
    }
}

// ============================================
// MY REPORTS PAGE
// ============================================

function loadMyReports() {
    const container = document.getElementById('reportsList');
    if (!container) return;
    
    if (appState.reports.length === 0) {
        container.innerHTML = '<div class="glass-card text-center" style="padding: 3rem;"><p>No reports yet. Start reporting issues to see them here!</p></div>';
        return;
    }
    
    container.innerHTML = appState.reports.slice().reverse().map(report => `
        <div class="report-item glass-card">
            <div style="display: flex; gap: 1rem; align-items: start;">
                ${report.photo ? `<img src="${report.photo}" alt="Issue" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;">` : ''}
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div>
                            <span class="issue-card-type">${report.type.toUpperCase()}</span>
                            <h3 style="margin: 0.5rem 0;">${report.description.substring(0, 80)}${report.description.length > 80 ? '...' : ''}</h3>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #10b981; font-weight: 600;">+${report.points} pts</div>
                            <div style="font-size: 0.875rem; opacity: 0.7;">${new Date(report.date).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text); opacity: 0.7; font-size: 0.875rem;">
                        <i class="fas fa-map-marker-alt"></i>
                        ${report.location}
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <span style="padding: 0.25rem 0.75rem; background: var(--glass); border-radius: 20px; font-size: 0.75rem;">
                            ${report.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Update reports list when navigating to my-reports page
document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-link[data-page="my-reports"]')) {
        setTimeout(loadMyReports, 100);
    }
});

// ============================================
// MODALS & NOTIFICATIONS
// ============================================

function showSuccessModal(points) {
    const modal = document.getElementById('successModal');
    document.getElementById('pointsEarned').textContent = points;
    
    // Create confetti
    createConfetti();
    
    modal.classList.add('active');
    
    // Update stats
    updateStats();
    loadFeaturedIssues();
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
    navigateToPage('my-reports');
    loadMyReports();
}

function createConfetti() {
    const container = document.getElementById('confetti');
    if (!container) return;
    
    container.innerHTML = '';
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.opacity = Math.random();
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.animation = `confetti-fall ${Math.random() * 2 + 1}s linear forwards`;
        container.appendChild(confetti);
    }
    
    // Add confetti animation
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confetti-fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function showMessage(text, type) {
    // Simple toast notification
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1';
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${bgColor};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 4000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    toast.textContent = text;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Add animations if not present
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function shareReport() {
    if (navigator.share) {
        navigator.share({
            title: 'FixMyStreet Report',
            text: 'I just reported a civic issue on FixMyStreet!',
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showMessage('Link copied to clipboard!', 'success');
    }
}

// ============================================
// TYPING ANIMATION
// ============================================

function initTypingAnimation() {
    const typingElement = document.querySelector('.typing-text');
    if (!typingElement) return;
    
    const text = typingElement.getAttribute('data-text') || 'Make Your City Better';
    const words = text.split(' ');
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typingElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
        }
        
        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            setTimeout(type, 2000);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            setTimeout(type, 500);
        } else {
            setTimeout(type, isDeleting ? 50 : 100);
        }
    }
    
    type();
}

// Initialize typing animation when page loads
setTimeout(initTypingAnimation, 500);

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.stat-card, .issue-card, .report-item').forEach(el => {
        observer.observe(el);
    });
    
    // Add animation if not present
    if (!document.getElementById('scroll-animations')) {
        const style = document.createElement('style');
        style.id = 'scroll-animations';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize scroll animations
setTimeout(initScrollAnimations, 1000);

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

window.navigateToPage = navigateToPage;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.closeSuccessModal = closeSuccessModal;
window.shareReport = shareReport;
window.viewReport = viewReport;