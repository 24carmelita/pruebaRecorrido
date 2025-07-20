// Variables globales
let map;
let userMarker;
let followUser = true;
let currentCarouselIndex = 0;
let carouselInterval;
let blueRouteLine;
let selectedRouteLine;
let selectedSite = null;
let routeToStartLine;
let distanceInterval;
let activeRouteType = null;
let userMovedMap = false;
let currentLang = 'es';
let sites = [];
let translations = {};
let markers = [];
let isPaused = false;
let voices = [];

// Función para detectar si es dispositivo móvil
function isMobileDevice() {
  return window.innerWidth <= 768;
}

// Función para hacer scroll suave
function scrollToMapOnMobile() {
  if (isMobileDevice()) {
    const mapContainer = document.getElementById("mapContainer");
    if (mapContainer) {
      setTimeout(() => {
        mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }
}

// Cargar voces para la síntesis de voz
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
    // A veces, la lista de voces se carga de forma asíncrona.
    // Este truco ayuda a asegurar que las voces estén disponibles.
    if (voices.length === 0) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    }
}

// Función para text-to-speech
function speakDescription(text, title) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel(); // Detener cualquier lectura anterior

        const fullText = `${title}. ${text}`;
        const utterance = new SpeechSynthesisUtterance(fullText);

        const langCode = currentLang === 'es' ? 'es-MX' : 'en-US';
        utterance.lang = langCode;

        const selectedVoice = voices.find(voice => voice.lang === langCode || voice.lang.startsWith(currentLang));
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        const speakBtn = document.querySelector('.speak-btn');
        const pauseBtn = document.getElementById('pauseBtn');

        utterance.onstart = () => {
            if (speakBtn) {
                speakBtn.innerHTML = '▶️ Reproduciendo...';
                speakBtn.disabled = true;
            }
            if (pauseBtn) {
                pauseBtn.style.display = 'inline-block';
                pauseBtn.innerText = '⏸️ Pausar';
                isPaused = false;
            }
        };

        utterance.onend = () => {
            if (speakBtn) {
                speakBtn.innerHTML = `🔊 ${translations[currentLang].listenDescription}`;
                speakBtn.disabled = false;
            }
            if (pauseBtn) pauseBtn.style.display = 'none';
            isPaused = false;
        };

        utterance.onerror = (event) => {
            console.error('Error en la síntesis de voz:', event.error);
            if (speakBtn) {
                speakBtn.innerHTML = `🔊 ${translations[currentLang].listenDescription}`;
                speakBtn.disabled = false;
            }
            if (pauseBtn) pauseBtn.style.display = 'none';
        };

        speechSynthesis.speak(utterance);
    } else {
        alert('Tu navegador no soporta la síntesis de voz.');
    }
}


function toggleSpeech() {
  const pauseBtn = document.getElementById('pauseBtn');
  if ('speechSynthesis' in window && speechSynthesis.speaking) {
    if (isPaused) {
      speechSynthesis.resume();
      if(pauseBtn) pauseBtn.innerText = '⏸️ Pausar';
      isPaused = false;
    } else {
      speechSynthesis.pause();
      if(pauseBtn) pauseBtn.innerText = '▶️ Reanudar';
      isPaused = true;
    }
  }
}

// Función para inicializar los datos de la página (sitios y traducciones)
function initializePageData(pageSites, pageTranslations) {
    sites = pageSites;
    translations = pageTranslations;
    currentLang = 'es'; // o detectar del navegador/localStorage
    setupMap();
    createSiteMenu();
    updateUI();
}

function setupMap() {
    map = L.map("map").setView([19.845, -90.523], 12);
    map.on("movestart", () => {
        followUser = false;
        userMovedMap = true;
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("zoomend", () => {
      const zoom = map.getZoom();
      let size = 32;
      if (zoom >= 17) size = 64;
      else if (zoom >= 15) size = 48;
      else if (zoom >= 13) size = 36;
      else size = 28;
      const siteIcons = createIcon(size);
       markers.forEach(({ marker, site }) => {
            if(siteIcons[site.name]) {
                marker.setIcon(siteIcons[site.name]);
            }
      });
    });

    addSiteMarkers();
    setupGeolocation();
    getOSRMRoute(sites);
}

function addSiteMarkers() {
    markers.forEach(({ marker, numberMarker }) => {
        map.removeLayer(marker);
        map.removeLayer(numberMarker);
    });
    markers = [];

    const siteIcons = createIcon();
    sites.forEach((site, index) => {
        const icon = siteIcons[site.name] || L.icon({ iconUrl: 'iconos/default.png', iconSize: [32, 32] });
        const marker = L.marker([site.lat, site.lng], { icon }).addTo(map);
        marker.bindPopup(createSimplePopup(site));

        const numberIcon = L.divIcon({
            className: 'number-icon',
            html: `<div class="number-label">${index + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        const numberMarker = L.marker([site.lat, site.lng], { icon: numberIcon }).addTo(map);

        markers.push({ marker, numberMarker, site });
    });
}


function createSimplePopup(site) {
    return `
    <div class="simple-popup">
    <h3>${site.name}</h3>
    <img src="${site.image}" alt="${site.name}">
    <button onclick="startRouteToSite('${site.name}', ${site.lat}, ${site.lng})" class="popup-route-btn">
    ${translations[currentLang].goToRoute}
    </button>
    </div>
    `;
}

function startRouteToSite(siteName, lat, lng) {
    if (!userMarker) {
        alert(translations[currentLang].locationNotAvailable);
        return;
    }
    clearAllRoutes(true); // Limpia rutas pero no la completa
    const site = sites.find(s => s.name === siteName);
    if (site) {
        selectedSite = site;
        drawRouteToSite(lat, lng, siteName);
    }
    map.closePopup();
    closeSidebar();
}

function createRouteFromSidebar(siteName) {
    const site = sites.find(s => s.name === siteName);
    if (!site) return;
    if (!userMarker) {
        alert(translations[currentLang].locationNotAvailable);
        return;
    }
    clearAllRoutes(true); // Limpia rutas pero no la completa
    selectedSite = site;
    drawRouteToSite(site.lat, site.lng, siteName);
    closeSidebar();
}

function createIcon(size = 32) {
    const iconDefaults = {
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size]
    };
    return {
      'Barrio de San Román': L.icon({ ...iconDefaults, iconUrl: 'iconos/iglesia.png' }),
      'Atarazanas Playa San Román': L.icon({ ...iconDefaults, iconUrl: 'iconos/puerto.png' }),
      'Novia del Mar': L.icon({ ...iconDefaults, iconUrl: 'iconos/noviaMar.png' }),
      'Iglesia de Guadalupe': L.icon({ ...iconDefaults, iconUrl: 'iconos/iglesia.png' }),
      'Edificio INAH Arqueologia Subacuatica': L.icon({ ...iconDefaults, iconUrl: 'iconos/inah.png' }),
      'Iglesia de San Francisco': L.icon({ ...iconDefaults, iconUrl: 'iconos/iglesia.png' }),
      'Bateria de San Matias': L.icon({ ...iconDefaults, iconUrl: 'iconos/baterias.png' }),
      'Bateria de San Lucas': L.icon({ ...iconDefaults, iconUrl: 'iconos/baterias.png' }),
      'Museo de Arqueología Subacuática': L.icon({ ...iconDefaults, iconUrl: 'iconos/baterias.png' }),
      'Baluarte de San Carlos': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
      'Catedral de Campeche': L.icon({ ...iconDefaults, iconUrl: 'iconos/catedral.png' }),
      'Baluarte de la Soledad': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
      'Puerta de Mar': L.icon({ ...iconDefaults, iconUrl: 'iconos/puertaMar.png' }),
      'Baluarte de San Juan': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
      'Baluarte de Santa Rosa': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
      'Baluarte de San Pedro': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
      'Puerta de Tierra': L.icon({ ...iconDefaults, iconUrl: 'iconos/puertaTierra.png' }),
      'Baluarte de San Francisco': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
      'Baluarte de Santiago': L.icon({ ...iconDefaults, iconUrl: 'iconos/fuertes.png' }),
       'Parque Principal': L.icon({ ...iconDefaults, iconUrl: 'iconos/parque.png' }),
      'Barrio de guadalupe': L.icon({ ...iconDefaults, iconUrl: 'iconos/iglesia.png' }),
      'Barrio de san francisco': L.icon({ ...iconDefaults, iconUrl: 'iconos/iglesia.png' }),
      'Pozo de la Conquista': L.icon({ ...iconDefaults, iconUrl: 'iconos/pozo.png' }),
      'Parque de las Baterías': L.icon({ ...iconDefaults, iconUrl: 'iconos/parque.png' }),
      'Asta Bandera': L.icon({ ...iconDefaults, iconUrl: 'iconos/asta.png' }),
      'Monumento a la Madre': L.icon({ ...iconDefaults, iconUrl: 'iconos/monumento.png' }),
      'Monumento a Justo Sierra': L.icon({ ...iconDefaults, iconUrl: 'iconos/monumento.png' }),
    };
}

function updateRouteUI() {
    const routeStatus = document.getElementById('routeStatus');
    const routeStatusText = document.getElementById('routeStatusText');
    const tourInfoText = document.getElementById('tourInfoText');
    const cancelBtn = document.getElementById('cancelRouteBtn');
    const clearBtn = document.getElementById('clearAllRoutesBtn');

    if (selectedSite && selectedRouteLine) {
        routeStatus.classList.add('active');
        routeStatusText.textContent = `${translations[currentLang].routeActive}${selectedSite.name}`;
        tourInfoText.textContent = `${translations[currentLang].routeCreated} ${selectedSite.name}`;
        cancelBtn.style.display = 'inline-block';
        clearBtn.style.display = 'inline-block';
    } else if (routeToStartLine) {
        routeStatus.classList.add('active');
        routeStatusText.textContent = translations[currentLang].routeToStart;
        tourInfoText.textContent = translations[currentLang].tourInfoToSite;
        cancelBtn.style.display = 'inline-block';
        clearBtn.style.display = 'inline-block';
    } else if (blueRouteLine) {
        routeStatus.classList.remove('active');
        tourInfoText.textContent = translations[currentLang].tourInfoComplete;
        clearBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'none';
    } else {
        routeStatus.classList.remove('active');
        tourInfoText.textContent = translations[currentLang].tourInfoDefault;
        cancelBtn.style.display = 'none';
        clearBtn.style.display = 'none';
    }

    document.getElementById('startRouteBtn').textContent = translations[currentLang].viewCompleteRoute;
    document.getElementById('startTourBtn').textContent = translations[currentLang].goToFirstSite;
    cancelBtn.textContent = translations[currentLang].cancelRoute;
    clearBtn.textContent = translations[currentLang].clearAll;
}

function cancelActiveRoute() {
    selectedSite = null;
    localStorage.removeItem('selectedSite');
    document.getElementById('distance').innerText = 'Distancia al destino: -';
    if (selectedRouteLine) map.removeLayer(selectedRouteLine);
    selectedRouteLine = null;
    if (routeToStartLine) map.removeLayer(routeToStartLine);
    routeToStartLine = null;
    updateRouteUI();
}

function clearAllRoutes(keepComplete = false) {
    cancelActiveRoute();
    if (!keepComplete && blueRouteLine) {
        map.removeLayer(blueRouteLine);
        blueRouteLine = null;
    }
    updateRouteUI();
}

function openSidebar(siteName) {
    const site = sites.find(s => s.name === siteName);
    if (!site) return;

    if (carouselInterval) clearInterval(carouselInterval);

    let distanceInfo = '';
    if (userMarker) {
        const dist = userMarker.getLatLng().distanceTo([site.lat, site.lng]);
        const distText = dist > 1000 ? `${(dist / 1000).toFixed(2)} ${translations[currentLang].kilometers}` : `${Math.round(dist)} ${translations[currentLang].meters}`;
        distanceInfo = `<div class="distance-info"><span class="distance-value">${distText}</span></div>`;
    }

    const siteData = translations[currentLang][siteName];
    if (!siteData) return;
    const images = siteData.images || [site.image];

    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
        <div class="sidebar-header">
            <div class="header-content">
                <h2>${siteName}</h2>
                ${distanceInfo}
            </div>
            <button onclick="closeSidebar()" class="close-btn">✕ ${translations[currentLang].closeSidebar}</button>
        </div>
        <div class="image-carousel">
            <div class="carousel-container">
                <div class="carousel-images" id="carousel-images">
                    ${images.map((img, i) => `<img src="${img}" class="carousel-image ${i === 0 ? 'active' : ''}" data-index="${i}">`).join('')}
                </div>
                ${images.length > 1 ? `
                <div class="carousel-controls">
                    <button onclick="prevImage()" class="carousel-btn">❮ ${translations[currentLang].prevImage}</button>
                    <div class="carousel-indicators">
                        ${images.map((_, i) => `<span class="indicator ${i === 0 ? 'active' : ''}" onclick="goToImage(${i})"></span>`).join('')}
                    </div>
                    <button onclick="nextImage()" class="carousel-btn">${translations[currentLang].nextImage} ❯</button>
                </div>
                <div class="carousel-progress"><div class="progress-bar" id="progress-bar"></div></div>
                ` : ''}
            </div>
        </div>
        <div class="site-description">
            <p>${siteData.description}</p>
            <div class="action-buttons">
                <button onclick="speakDescription(translations[currentLang]['${siteName}'].description, '${siteName}')" class="speak-btn">🔊 ${translations[currentLang].listenDescription}</button>
                <button onclick="toggleSpeech()" id="pauseBtn" style="display: none;">⏸️ Pausar</button>
                <button onclick="centerMapOnSite(${site.lat}, ${site.lng})" class="center-btn">🎯 ${translations[currentLang].centerMap}</button>
                <button onclick="createRouteFromSidebar('${siteName}')" class="route-btn">🚗 ${translations[currentLang].createRoute}</button>
            </div>
        </div>`;
    
    document.getElementById('sidebar').classList.add('active');
    scrollToMapOnMobile();

    if (images.length > 1) {
        currentCarouselIndex = 0;
        startCarousel(images.length);
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    if (carouselInterval) clearInterval(carouselInterval);
    if (speechSynthesis.speaking) speechSynthesis.cancel();
}

function startCarousel(totalImages) {
    updateProgressBar();
    carouselInterval = setInterval(() => nextImage(totalImages), 4000);
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        setTimeout(() => {
            progressBar.style.transition = 'width 4s linear';
            progressBar.style.width = '100%';
        }, 50);
    }
}

function navigateCarousel(offset) {
    const images = document.querySelectorAll('.carousel-image');
    if (images.length <= 1) return;
    images[currentCarouselIndex].classList.remove('active');
    document.querySelector(`.indicator[onclick="goToImage(${currentCarouselIndex})"]`).classList.remove('active');
    currentCarouselIndex = (currentCarouselIndex + offset + images.length) % images.length;
    images[currentCarouselIndex].classList.add('active');
    document.querySelector(`.indicator[onclick="goToImage(${currentCarouselIndex})"]`).classList.add('active');
    if (carouselInterval) clearInterval(carouselInterval);
    startCarousel(images.length);
}

function prevImage() { navigateCarousel(-1); }
function nextImage() { navigateCarousel(1); }
function goToImage(index) {
    navigateCarousel(index - currentCarouselIndex);
}

function centerMapOnSite(lat, lng) {
    map.setView([lat, lng], 16);
    closeSidebar();
}

function setupGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(onLocationFound, onLocationError, {
            enableHighAccuracy: true, timeout: 10000, maximumAge: 0
        });
    } else {
        console.log('La geolocalización no está disponible.');
    }
}

function onLocationFound(position) {
    const userLocation = L.latLng(position.coords.latitude, position.coords.longitude);
    if (!userMarker) {
        userMarker = L.marker(userLocation).addTo(map).bindPopup('Tu ubicación').openPopup();
    } else {
        userMarker.setLatLng(userLocation);
    }
    if (selectedSite) {
        drawRouteToSite(selectedSite.lat, selectedSite.lng, selectedSite.name);
    }
}

function onLocationError(e) {
    console.error('Error de geolocalización:', e.message);
}

function getOSRMRoute(routeSites) {
    const coordinates = routeSites.map(s => `${s.lng},${s.lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`)
    .then(res => res.json())
    .then(data => {
        if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            if (blueRouteLine) map.removeLayer(blueRouteLine);
            blueRouteLine = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(map);
            updateRouteUI();
        }
    }).catch(err => console.error('Error al trazar ruta completa:', err));
}

function drawRouteToSite(destLat, destLng, siteName) {
    if (!userMarker) return;
    const userLocation = userMarker.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    
    fetch(url).then(res => res.json()).then(data => {
        if (selectedRouteLine) map.removeLayer(selectedRouteLine);
        const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        selectedRouteLine = L.polyline(coords, { color: 'red', weight: 5 }).addTo(map);
        if (!userMovedMap) map.fitBounds(selectedRouteLine.getBounds());
        
        const dist = (data.routes[0].distance / 1000).toFixed(2);
        document.getElementById('distance').innerText = `${translations[currentLang].distance}: ${dist} km`;
        
        selectedSite = { lat: destLat, lng: destLng, name: siteName };
        localStorage.setItem('selectedSite', JSON.stringify(selectedSite));
        updateRouteUI();
    }).catch(err => console.error('Error al trazar ruta al sitio:', err));
}

function createSiteMenu() {
    const container = document.getElementById('siteButtons');
    container.innerHTML = '';
    sites.forEach((site, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-red-vino';
        btn.innerText = `${index + 1}. ${site.name}`;
        btn.onclick = () => openSidebar(site.name);
        container.appendChild(btn);
    });
}

function updateUI() {
    document.querySelector('#description p').innerText = translations[currentLang].welcome;
    addSiteMarkers();
    closeSidebar();
    updateRouteUI();
}

function setupEventListeners() {
    document.getElementById('btnEs').addEventListener('click', () => { currentLang = 'es'; updateUI(); });
    document.getElementById('btnEn').addEventListener('click', () => { currentLang = 'en'; updateUI(); });
    document.getElementById('cancelRouteBtn').addEventListener('click', cancelActiveRoute);
    document.getElementById('clearAllRoutesBtn').addEventListener('click', () => clearAllRoutes(false));

    document.getElementById('startRouteBtn').addEventListener('click', () => {
        clearAllRoutes(true);
        if (!blueRouteLine) getOSRMRoute(sites);
        else map.fitBounds(blueRouteLine.getBounds());
    });

    document.getElementById('startTourBtn').addEventListener('click', () => {
        if (!userMarker) return;
        const userLocation = userMarker.getLatLng();
        const nearest = sites.reduce((a, b) => userLocation.distanceTo([a.lat, a.lng]) < userLocation.distanceTo([b.lat, b.lng]) ? a : b);
        clearAllRoutes(true);
        drawRouteToSite(nearest.lat, nearest.lng, nearest.name);
    });
}

window.addEventListener('load', () => {
    const pageName = window.location.pathname.split('/').pop();
    let pageSites, pageTranslations;

    if (pageName === 'rutaOriente.html') {
        pageSites = data_rutaOriente.sites;
        pageTranslations = data_rutaOriente.translations;
    } else if (pageName === 'rutaPoniente.html') {
        pageSites = data_rutaPoniente.sites;
        pageTranslations = data_rutaPoniente.translations;
    } else if (pageName === 'rutaPeaton.html') {
         pageSites = data_rutaPeaton.sites;
        pageTranslations = data_rutaPeaton.translations;
    } else if (pageName === 'recorridoPeatonal.html') {
         pageSites = data_recorridoPeatonal.sites;
        pageTranslations = data_recorridoPeatonal.translations;
    }
    
    if (pageSites && pageTranslations) {
        initializePageData(pageSites, pageTranslations);
        setupEventListeners();

        const saved = localStorage.getItem('selectedSite');
        if (saved) {
            const site = JSON.parse(saved);
            if (sites.find(s => s.name === site.name)) {
                 selectedSite = site;
                 drawRouteToSite(site.lat, site.lng, site.name);
            }
        }
    }
    
    if ('speechSynthesis' in window) {
      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
});

window.addEventListener('beforeunload', () => {
    if (carouselInterval) clearInterval(carouselInterval);
    if ('speechSynthesis'in window) speechSynthesis.cancel();
});
