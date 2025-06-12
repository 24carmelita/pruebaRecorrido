// Variables globales
let map;
let userMarker;
let watchId;
let followMode = false;
let currentLanguage = 'es';
let currentCarouselIndex = 0;
let carouselInterval;

// Datos de los sitios (manteniendo la estructura existente)
const sites = [
    {
        id: 1,
        coords: [19.8301, -90.5349],
        title: { es: "Fuerte de San Miguel", en: "Fort of San Miguel" },
        images: [
            "img/fuerte-san-miguel-1.jpg",
            "img/fuerte-san-miguel-2.jpg", 
            "img/fuerte-san-miguel-3.jpg"
        ],
        description: {
            es: "El Fuerte de San Miguel es una fortificación del siglo XVIII que alberga el Museo de Arqueología Maya. Construido para defender la ciudad de los ataques piratas, hoy es uno de los principales atractivos turísticos de Campeche.",
            en: "Fort San Miguel is an 18th-century fortification that houses the Museum of Mayan Archaeology. Built to defend the city from pirate attacks, it is now one of Campeche's main tourist attractions."
        }
    },
    {
        id: 2,
        coords: [19.8456, -90.5234],
        title: { es: "Centro Histórico", en: "Historic Center" },
        images: [
            "img/centro-historico-1.jpg",
            "img/centro-historico-2.jpg",
            "img/centro-historico-3.jpg",
            "img/centro-historico-4.jpg"
        ],
        description: {
            es: "El Centro Histórico de Campeche es Patrimonio Mundial de la UNESCO desde 1999. Sus coloridas casas coloniales y murallas fortificadas cuentan la historia de una ciudad que fue clave en el comercio entre España y América.",
            en: "Campeche's Historic Center has been a UNESCO World Heritage Site since 1999. Its colorful colonial houses and fortified walls tell the story of a city that was key in trade between Spain and America."
        }
    },
    {
        id: 3,
        coords: [19.8123, -90.5456],
        title: { es: "Sitio Arqueológico Submarino", en: "Underwater Archaeological Site" },
        images: [
            "img/sitio-submarino-1.jpg",
            "img/sitio-submarino-2.jpg",
            "img/sitio-submarino-3.jpg"
        ],
        description: {
            es: "Este sitio arqueológico submarino contiene restos de embarcaciones históricas y artefactos que datan de los siglos XVI al XVIII. Es parte del patrimonio cultural subacuático de Campeche.",
            en: "This underwater archaeological site contains remains of historic vessels and artifacts dating from the 16th to 18th centuries. It is part of Campeche's underwater cultural heritage."
        }
    },
    {
        id: 4,
        coords: [19.8567, -90.5123],
        title: { es: "Puerta de Mar", en: "Sea Gate" },
        images: [
            "img/puerta-mar-1.jpg",
            "img/puerta-mar-2.jpg",
            "img/puerta-mar-3.jpg"
        ],
        description: {
            es: "La Puerta de Mar era una de las principales entradas a la ciudad amurallada de Campeche. Construida en el siglo XVII, conectaba el puerto con el centro de la ciudad y era punto de control para el comercio marítimo.",
            en: "The Sea Gate was one of the main entrances to the walled city of Campeche. Built in the 17th century, it connected the port with the city center and was a control point for maritime trade."
        }
    },
    {
        id: 5,
        coords: [19.8234, -90.5567],
        title: { es: "Baluarte de Santiago", en: "Santiago Bastion" },
        images: [
            "img/baluarte-santiago-1.jpg",
            "img/baluarte-santiago-2.jpg"
        ],
        description: {
            es: "El Baluarte de Santiago forma parte del sistema defensivo de Campeche. Actualmente alberga el Jardín Botánico Xmuch'haltun, donde se pueden apreciar especies vegetales de la región.",
            en: "The Santiago Bastion is part of Campeche's defensive system. It currently houses the Xmuch'haltun Botanical Garden, where you can appreciate plant species from the region."
        }
    }
];

// Traducciones para la interfaz
const translations = {
    es: {
        sidebarTitle: "Información del Sitio",
        closeSidebar: "Cerrar",
        prevImage: "Anterior",
        nextImage: "Siguiente",
        listenDescription: "Escuchar descripción",
        followLocation: "Seguir ubicación",
        stopFollowing: "Dejar de seguir",
        distance: "Distancia",
        meters: "metros",
        kilometers: "kilómetros"
    },
    en: {
        sidebarTitle: "Site Information",
        closeSidebar: "Close",
        prevImage: "Previous", 
        nextImage: "Next",
        listenDescription: "Listen to description",
        followLocation: "Follow location",
        stopFollowing: "Stop following",
        distance: "Distance",
        meters: "meters",
        kilometers: "kilometers"
    }
};

// Inicialización del mapa
function initMap() {
    map = L.map('map').setView([19.8301, -90.5349], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    addSiteMarkers();
    initGeolocation();
    updateFollowButton();
}

// Agregar marcadores de sitios
function addSiteMarkers() {
    sites.forEach(site => {
        const customIcon = L.icon({
            iconUrl: 'iconos/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });
        
        const marker = L.marker(site.coords, { icon: customIcon }).addTo(map);
        
        // Popup simplificado con solo el título clickeable
        const popupContent = `
            <div class="simple-popup">
                <h3 class="site-title-link" onclick="openSidebar(${site.id})" style="cursor: pointer; color: #2563eb; text-decoration: underline; margin: 0; font-size: 16px; font-weight: bold;">
                    ${site.title[currentLanguage]}
                </h3>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    });
}

// Abrir panel lateral con información del sitio
function openSidebar(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    const sidebar = document.getElementById('sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    
    // Detener carrusel anterior si existe
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    
    // Calcular distancia si hay ubicación del usuario
    let distanceInfo = '';
    if (userMarker) {
        const userPos = userMarker.getLatLng();
        const sitePos = L.latLng(site.coords);
        const distance = userPos.distanceTo(sitePos);
        
        const distanceText = distance > 1000 
            ? `${(distance / 1000).toFixed(2)} ${translations[currentLanguage].kilometers}`
            : `${Math.round(distance)} ${translations[currentLanguage].meters}`;
            
        distanceInfo = `
            <div class="distance-info">
                <span class="distance-label">${translations[currentLanguage].distance}:</span>
                <span class="distance-value">${distanceText}</span>
            </div>
        `;
    }
    
    sidebarContent.innerHTML = `
        <div class="sidebar-header">
            <div class="header-content">
                <h2>${site.title[currentLanguage]}</h2>
                ${distanceInfo}
            </div>
            <button onclick="closeSidebar()" class="close-btn">
                ✕ ${translations[currentLanguage].closeSidebar}
            </button>
        </div>
        
        <div class="image-carousel">
            <div class="carousel-container">
                <div class="carousel-images" id="carousel-images">
                    ${site.images.map((img, index) => `
                        <img src="${img}" alt="${site.title[currentLanguage]}" 
                             class="carousel-image ${index === 0 ? 'active' : ''}" 
                             data-index="${index}"
                             onerror="this.src='img/placeholder.jpg'">
                    `).join('')}
                </div>
                <div class="carousel-controls">
                    <button onclick="prevImage()" class="carousel-btn prev-btn">
                        ❮ ${translations[currentLanguage].prevImage}
                    </button>
                    <div class="carousel-indicators">
                        ${site.images.map((_, index) => `
                            <span class="indicator ${index === 0 ? 'active' : ''}" 
                                  onclick="goToImage(${index})" data-index="${index}"></span>
                        `).join('')}
                    </div>
                    <button onclick="nextImage()" class="carousel-btn next-btn">
                        ${translations[currentLanguage].nextImage} ❯
                    </button>
                </div>
                <div class="carousel-progress">
                    <div class="progress-bar" id="progress-bar"></div>
                </div>
            </div>
        </div>
        
        <div class="site-description">
            <p>${site.description[currentLanguage]}</p>
            <div class="action-buttons">
                <button onclick="speakDescription('${site.description[currentLanguage].replace(/'/g, "\\'")}', '${site.title[currentLanguage].replace(/'/g, "\\'")}'); return false;" class="speak-btn">
                    🔊 ${translations[currentLanguage].listenDescription}
                </button>
                <button onclick="centerMapOnSite(${site.coords[0]}, ${site.coords[1]})" class="center-btn">
                    🎯 Centrar en mapa
                </button>
            </div>
        </div>
    `;
    
    // Mostrar sidebar
    sidebar.classList.add('active');
    
    // Inicializar carrusel automático
    currentCarouselIndex = 0;
    startCarousel(site.images.length);
    updateProgressBar();
}

// Cerrar panel lateral
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
    
    // Detener carrusel
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
}

// Iniciar carrusel automático
function startCarousel(totalImages) {
    updateProgressBar();
    
    carouselInterval = setInterval(() => {
        nextImage(totalImages);
        updateProgressBar();
    }, 4000); // Cambiar imagen cada 4 segundos
}

// Actualizar barra de progreso del carrusel
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 4s linear';
        
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 50);
    }
}

// Navegar a imagen anterior
function prevImage() {
    const images = document.querySelectorAll('.carousel-image');
    const indicators = document.querySelectorAll('.indicator');
    
    if (images.length === 0) return;
    
    images[currentCarouselIndex].classList.remove('active');
    indicators[currentCarouselIndex].classList.remove('active');
    
    currentCarouselIndex = currentCarouselIndex === 0 ? images.length - 1 : currentCarouselIndex - 1;
    
    images[currentCarouselIndex].classList.add('active');
    indicators[currentCarouselIndex].classList.add('active');
    
    // Reiniciar carrusel automático
    if (carouselInterval) {
        clearInterval(carouselInterval);
        startCarousel(images.length);
    }
}

// Navegar a imagen siguiente
function nextImage(totalImages = null) {
    const images = document.querySelectorAll('.carousel-image');
    const indicators = document.querySelectorAll('.indicator');
    
    if (images.length === 0) return;
    
    const total = totalImages || images.length;
    
    images[currentCarouselIndex].classList.remove('active');
    indicators[currentCarouselIndex].classList.remove('active');
    
    currentCarouselIndex = (currentCarouselIndex + 1) % total;
    
    images[currentCarouselIndex].classList.add('active');
    indicators[currentCarouselIndex].classList.add('active');
}

// Ir a imagen específica
function goToImage(index) {
    const images = document.querySelectorAll('.carousel-image');
    const indicators = document.querySelectorAll('.indicator');
    
    if (images.length === 0) return;
    
    images[currentCarouselIndex].classList.remove('active');
    indicators[currentCarouselIndex].classList.remove('active');
    
    currentCarouselIndex = index;
    
    images[currentCarouselIndex].classList.add('active');
    indicators[currentCarouselIndex].classList.add('active');
    
    // Reiniciar carrusel automático
    if (carouselInterval) {
        clearInterval(carouselInterval);
        startCarousel(images.length);
    }
}

// Función para text-to-speech mejorada
function speakDescription(text, title) {
    if ('speechSynthesis' in window) {
        // Detener cualquier síntesis en curso
        speechSynthesis.cancel();
        
        const fullText = `${title}. ${text}`;
        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = currentLanguage === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Cambiar el botón mientras habla
        const speakBtn = document.querySelector('.speak-btn');
        if (speakBtn) {
            const originalText = speakBtn.innerHTML;
            speakBtn.innerHTML = '⏸️ Reproduciendo...';
            speakBtn.disabled = true;
            
            utterance.onend = () => {
                speakBtn.innerHTML = originalText;
                speakBtn.disabled = false;
            };
            
            utterance.onerror = () => {
                speakBtn.innerHTML = originalText;
                speakBtn.disabled = false;
            };
        }
        
        speechSynthesis.speak(utterance);
    } else {
        alert('Tu navegador no soporta la síntesis de voz');
    }
}

// Centrar mapa en sitio específico
function centerMapOnSite(lat, lng) {
    map.setView([lat, lng], 16);
    closeSidebar();
}

// Cambiar idioma
function changeLanguage(lang) {
    currentLanguage = lang;
    
    // Limpiar marcadores existentes
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== userMarker) {
            map.removeLayer(layer);
        }
    });
    
    // Agregar marcadores con nuevo idioma
    addSiteMarkers();
    
    // Cerrar sidebar si está abierto
    closeSidebar();
    
    // Actualizar botones de idioma
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="changeLanguage('${lang}')"]`).classList.add('active');
    
    // Actualizar botón de seguimiento
    updateFollowButton();
}

// Actualizar texto del botón de seguimiento
function updateFollowButton() {
    const btn = document.getElementById('follow-btn');
    if (btn) {
        btn.textContent = followMode 
            ? translations[currentLanguage].stopFollowing 
            : translations[currentLanguage].followLocation;
    }
}

// Geolocalización
function initGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                updateUserLocation(position);
                // Iniciar seguimiento continuo
                watchId = navigator.geolocation.watchPosition(
                    updateUserLocation,
                    handleLocationError,
                    { 
                        enableHighAccuracy: true, 
                        maximumAge: 30000, 
                        timeout: 27000 
                    }
                );
            },
            handleLocationError,
            { enableHighAccuracy: true }
        );
    } else {
        console.error('Geolocalización no disponible');
    }
}

function updateUserLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    // Crear o actualizar marcador de usuario
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else {
        const userIcon = L.icon({
            iconUrl: 'iconos/user-location.png',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
        userMarker.bindPopup(`Tu ubicación (±${Math.round(accuracy)}m)`);
    }
    
    // Seguir ubicación si está activado
    if (followMode) {
        map.setView([lat, lng], Math.max(map.getZoom(), 15));
    }
    
    // Actualizar distancias en sidebar si está abierto
    updateDistanceInSidebar();
}

function updateDistanceInSidebar() {
    const distanceValue = document.querySelector('.distance-value');
    if (distanceValue && userMarker) {
        const sidebarTitle = document.querySelector('.sidebar-header h2');
        if (sidebarTitle) {
            const siteName = sidebarTitle.textContent;
            const site = sites.find(s => 
                s.title[currentLanguage] === siteName
            );
            
            if (site) {
                const userPos = userMarker.getLatLng();
                const sitePos = L.latLng(site.coords);
                const distance = userPos.distanceTo(sitePos);
                
                const distanceText = distance > 1000 
                    ? `${(distance / 1000).toFixed(2)} ${translations[currentLanguage].kilometers}`
                    : `${Math.round(distance)} ${translations[currentLanguage].meters}`;
                    
                distanceValue.textContent = distanceText;
            }
        }
    }
}

function handleLocationError(error) {
    console.error('Error de geolocalización:', error);
    let message = 'Error desconocido';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = "Permiso de geolocalización denegado";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Información de ubicación no disponible";
            break;
        case error.TIMEOUT:
            message = "Tiempo de espera agotado";
            break;
    }
    
    console.warn(message);
}

function toggleFollowMode() {
    followMode = !followMode;
    updateFollowButton();
    
    const btn = document.getElementById('follow-btn');
    btn.classList.toggle('active', followMode);
    
    if (followMode && userMarker) {
        const userPos = userMarker.getLatLng();
        map.setView(userPos, Math.max(map.getZoom(), 15));
    }
}

// Funciones de utilidad
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// Limpiar recursos al cerrar
window.addEventListener('beforeunload', function() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
});

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});

// Manejar cambios de visibilidad de la página
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Pausar carrusel cuando la página no es visible
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
    } else {
        // Reanudar carrusel cuando la página vuelve a ser visible
        const images = document.querySelectorAll('.carousel-image');
        if (images.length > 0) {
            startCarousel(images.length);
        }
    }
});
