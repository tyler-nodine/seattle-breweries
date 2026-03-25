// -------------------- MAP INIT --------------------
const map = L.map('map', {
    zoomControl: false  // Disable default zoom control so we can place it in bottom right
}).setView([47.6, -122.3], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add zoom controls to bottom right
L.control.zoom({ position: 'bottomright' }).addTo(map);

// -------------------- COLOR MAP --------------------
function getColor(provider) {
    provider = (provider || "").toLowerCase();

    return {
        "kitchen": "#984ea3",
        "food truck": "#ff7f00",
        "rotating food truck": "#377eb8",
        "adjacent": "#e41a1c",
        "light snacks": "#616161",
        "none": "#9e9e9e"
    }[provider] || "#9e9e9e";
}

function getAwesomeMarkerColor(provider) {
    provider = (provider || "").toLowerCase();

    return {
        "kitchen": "purple",
        "food truck": "orange",
        "rotating food truck": "blue",
        "adjacent": "red",
        "light snacks": "gray",
        "none": "lightgray"
    }[provider] || "lightgray";
}

function createAwesomeMarker(provider) {
    const markerColor = getAwesomeMarkerColor(provider);

    if (window.L && L.AwesomeMarkers && L.AwesomeMarkers.icon) {
        return L.AwesomeMarkers.icon({
            icon: 'beer',
            markerColor,
           // font-size: 18px,
            prefix: 'fa',
            spin: false
        });
    }

    // Fallback to default icon if plugin not loaded
    console.warn('AwesomeMarkers not loaded; using default Leaflet icon fallback.');
    return L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

function createLabelIcon(name) {
    return L.divIcon({
        className: "brewery-text-label",
        html: `<span class="brewery-label-text">${name || ""}</span>`,
        iconSize: [1, 1],
        iconAnchor: [-20, 34]
    });
}

// -------------------- POPUP --------------------
function makePopup(props) {
    
    const color = getColor(props.provider_type);

    function chip(text) {
        return `
        <div style="text-align:center; margin-bottom:14px;">
            <span style="
                display:inline-block;
                padding:2px 8px;
                font-size:14px;
                font-weight:600;
                border-radius:12px;
                background:${color}20;
                color:${color};
                border:1px solid ${color};
            ">
                ${text}
            </span>
        </div>`;
    }

    function button(url, text) {
        if (!url) return "";
        return `
        <div style="text-align:center; margin-top:6px;">
            <a href="${url}" target="_blank" style="
                display:inline-block;
                padding:4px 10px;
                font-size:10px;
                border-radius:6px;
                background:${color};
                color:white;
                text-decoration:none;
            ">
                ${text}
            </a>
        </div>`;
    }

    let body = "";
    const type = (props.provider_type || "").toLowerCase();

    if (type === "kitchen") {
        body += chip("Full kitchen");
        body += `<div style="text-align:center; font-size:8px; color:#777;">OFFERINGS</div>`;
        body += `<div style="text-align:center; font-size:14px;">${props.food_type || ""}</div>`;
        body += button(props.food_website, "View menu");
    }

    else if (type === "food truck") {
        body += chip("Food truck");
        body += `<div style="text-align:center; font-size:8px; color:#777;">NAME</div>`;
        body += `<div style="text-align:center; font-size:14px;">${props.provider_name || ""}</div>`;        
        body += button(props.food_website, "View menu");
    }

    else if (type === "rotating food truck") {
        body += chip("Rotating food truck");
        body += `<div style="text-align:center; font-size:8px; color:#777;">TODAY'S TRUCK</div>`;
        body += button(props.food_website, "View schedule");
    }

    else if (type === "adjacent") {
        body += chip("Adjacent restaurant");
        body += `<div style="text-align:center; font-size:8px; color:#777;">NAME</div>`;
        body += `<div style="text-align:center; font-size:14px;">${props.food_type || ""}</div>`;
        body += button(props.food_website, "View menu");
    }

    else if (type === "light snacks") {
        body += chip("Light snacks");
    }

    else {
        body += chip("None");
    }

    return `
    <div style="width:220px; font-family:Arial; line-height:1.3;">
        <div style="text-align:center; font-weight:600; font-size:16px;">
            ${props.name || ""}
        </div>

        <div style="width:40px; height:2px; background:#ddd; margin:4px auto 8px;"></div>

        <div style="text-align:center; font-size:8px; color:#777;">FOOD</div>

        ${body}
    </div>
    `;
}

// -------------------- LOAD DATA --------------------
// Store reference to markers for filtering
let breweryMarkers = {};
const LABEL_VISIBILITY_METERS = 3000; // Show labels when map width is less than this in meters

function isWithinLabelZoomThreshold() {
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const westPoint = L.latLng(center.lat, bounds.getWest());
    const eastPoint = L.latLng(center.lat, bounds.getEast());
    const visibleWidthMeters = westPoint.distanceTo(eastPoint);
    return visibleWidthMeters <= LABEL_VISIBILITY_METERS;
}

function updateLabelVisibility() {
    const mapElement = map.getContainer();
    if (isWithinLabelZoomThreshold()) {
        mapElement.classList.add("labels-visible");
    } else {
        mapElement.classList.remove("labels-visible");
    }
}

map.on("zoomend resize", updateLabelVisibility);

fetch("https://raw.githubusercontent.com/tyler-nodine/seattle-breweries/main/Seattle_breweries_final.geojson")
    .then(res => res.json())
    .then(data => {
        // Hard exclude bottle shops
        data.features = data.features.filter(feature => 
            (feature.properties.Type || "").toLowerCase() !== "beer bar and/or bottleshop"
        );

        const breweryLayer = L.geoJSON(data, {

            pointToLayer: function(feature, latlng) {
                const marker = L.marker(latlng, {
                    icon: createAwesomeMarker(feature.properties.provider_type)
                });

                const labelMarker = L.marker(latlng, {
                    icon: createLabelIcon(feature.properties.name),
                    interactive: false,
                    keyboard: false,
                    zIndexOffset: -1000
                }).addTo(map);

                // Store marker reference with its properties for filtering
                breweryMarkers[feature.properties.name] = {
                    marker,
                    labelMarker,
                    properties: feature.properties
                };

                return marker;
            },

            onEachFeature: function(feature, layer) {
                layer.bindPopup(makePopup(feature.properties));
            }

        }).addTo(map);

        const layerBounds = breweryLayer.getBounds();
        if (layerBounds.isValid()) {
            map.fitBounds(layerBounds, {
    paddingTopLeft: [24, 120],
    paddingBottomRight: [24, 24],
    maxZoom: 14
});
        }

        updateLabelVisibility();

    });

// -------------------- USER LOCATION --------------------
L.control.locate({
    position: "bottomright",
    flyTo: true,
    keepCurrentZoomLevel: true,
    drawCircle: true
}).addTo(map);

// -------------------- FILTER PANEL --------------------
// Filtering function that shows/hides markers based on selected criteria
function applyFilters() {
    const providerCheckboxes = document.querySelectorAll('input[name="provider_type"]');
    const dogsCheckbox = document.querySelector('input[name="dogs"]');
    const kidsCheckbox = document.querySelector('input[name="kids"]');
    const seatingCheckboxes = document.querySelectorAll('input[name="seating"]');
    
    // Get selected provider types
    const selectedProviders = Array.from(providerCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    const allowDogs = dogsCheckbox ? dogsCheckbox.checked : false;
    const allowKids = kidsCheckbox ? kidsCheckbox.checked : false;
    
    // Get selected seating types
    const selectedSeating = Array.from(seatingCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    // Filter each marker
    Object.keys(breweryMarkers).forEach(breweryName => {
        const item = breweryMarkers[breweryName];
        const props = item.properties;
        
        // Check provider type
        const providerMatch = selectedProviders.length === 0 || selectedProviders.includes(props.provider_type);
        
        // Check dogs (only filter if checkbox is checked - means "show only dog-friendly")
        const dogsMatch = !allowDogs || (props.Dogs && props.Dogs.toLowerCase() !== "no");
        
        // Check kids (only filter if checkbox is checked - means "show only kid-friendly")
        const kidsMatch = !allowKids || (props.Kids && props.Kids.toLowerCase() !== "no");
        
        // Check seating - if seating filters are selected, match against them
        let seatingMatch = true;
        if (selectedSeating.length > 0) {
            const brewerySeating = props.Seating ? props.Seating.toLowerCase() : "";
            seatingMatch = selectedSeating.some(type => brewerySeating.includes(type.toLowerCase()));
        }
        
        // Show marker if all criteria match
        if (providerMatch && dogsMatch && kidsMatch && seatingMatch) {
            item.marker.addTo(map);
            if (item.labelMarker) {
                item.labelMarker.addTo(map);
            }
        } else {
            map.removeLayer(item.marker);
            if (item.labelMarker) {
                map.removeLayer(item.labelMarker);
            }
        }
    });
}

// -------------------- PANEL CONTROLS --------------------
// Global variables to track panel states
let filterContent, filterButton;
let legendContent, legendButton;

// Create filter panel control
const filterPanel = L.control({ position: "bottomleft" });

filterPanel.onAdd = function () {
    const container = L.DomUtil.create("div", "filter-container");
    
    // Create collapsible button
    filterButton = L.DomUtil.create("button", "filter-button", container);
    const button = filterButton;
    button.innerHTML = "⫯"; // Filter/funnel icon
    button.title = "Toggle Filters";
    button.style.cssText = `
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.95);
        border: 2px solid #999;
        border-radius: 8px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        margin-bottom: 10px;
    `;
    
    // Create filter content (initially hidden)
    filterContent = L.DomUtil.create("div", "filter-content", container);
    filterContent.style.cssText = `
        display: none;
        background: rgba(255,255,255,0.95);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #ddd;
        font-family: Arial;
        font-size: 12px;
        line-height: 1.6;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        min-width: 160px;
        color: #666;
    `;
    
    filterContent.innerHTML = `
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Filter Breweries</div>
        <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px; color: #777;">Food Option</div>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="provider_type" value="kitchen" checked> Kitchen
        </label>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="provider_type" value="food truck" checked> Permanent food truck
        </label>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="provider_type" value="rotating food truck" checked> Rotating food truck
        </label>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="provider_type" value="adjacent" checked> Adjacent restaurant
        </label>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="provider_type" value="light snacks" checked> Light snacks
        </label>
        <label style="display: block; margin-bottom: 8px;">
            <input type="checkbox" name="provider_type" value="none" checked> None
        </label>
        
        <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px; color: #777;">Amenities</div>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="dogs"> Dogs allowed
        </label>
        <label style="display: block; margin-bottom: 8px;">
            <input type="checkbox" name="kids"> Kids allowed
        </label>
        
        <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px; color: #777;">Seating</div>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="seating" value="indoor"> Indoor
        </label>
        <label style="display: block; margin-bottom: 4px;">
            <input type="checkbox" name="seating" value="outdoor"> Outdoor
        </label>
    `;
    
    // Add event listeners to checkboxes
    filterContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener("change", applyFilters);
    });
    
    // Toggle filter panel visibility (and close legend)
    L.DomEvent.on(button, "click", function () {
        if (filterContent.style.display === "none") {
            filterContent.style.display = "block";
            button.style.background = "rgba(100,150,200,0.95)";
            button.style.color = "white";
            // Close legend when opening filter
            if (legendContent) {
                legendContent.style.display = "none";
                if (legendButton) {
                    legendButton.style.background = "rgba(255,255,255,0.95)";
                    legendButton.style.color = "black";
                }
            }
        } else {
            filterContent.style.display = "none";
            button.style.background = "rgba(255,255,255,0.95)";
            button.style.color = "black";
        }
    });
    
    return container;
};

filterPanel.addTo(map);

// -------------------- LEGEND --------------------
const legend = L.control({ position: "bottomleft" });

legend.onAdd = function () {
    const container = L.DomUtil.create("div", "legend-container");
    
    // Create the collapsible button/icon
    legendButton = L.DomUtil.create("button", "legend-button", container);
    const button = legendButton;
    button.innerHTML = "≡"; // Standard legend/menu icon (three horizontal lines)
    button.title = "Toggle Legend";
    button.style.cssText = `
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.95);
        border: 2px solid #999;
        border-radius: 8px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    `;
    
    // Create the legend content (initially hidden)
    legendContent = L.DomUtil.create("div", "legend-content", container);
    legendContent.style.cssText = `
        display: none;
        margin-top: 10px;
        background: rgba(255,255,255,0.95);
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #ddd;
        font-family: Arial;
        font-size: 12px;
        line-height: 1.4;
        color: #666;
    `;
    
    legendContent.innerHTML = `
        <div class="legend-title" style="font-weight: 600; margin-bottom: 6px;">Food Options</div>

        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
            <span class="legend-color" style="width: 10px; height: 10px; border-radius: 50%; background:#984ea3; margin-right: 6px;"></span>Kitchen
        </div>
        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
            <span class="legend-color" style="width: 10px; height: 10px; border-radius: 50%; background:#ff7f00; margin-right: 6px;"></span>Permanent food truck
        </div>
        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
            <span class="legend-color" style="width: 10px; height: 10px; border-radius: 50%; background:#377eb8; margin-right: 6px;"></span>Rotating food truck
        </div>
        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
            <span class="legend-color" style="width: 10px; height: 10px; border-radius: 50%; background:#e41a1c; margin-right: 6px;"></span>Adjacent restaurant
        </div>
        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
            <span class="legend-color" style="width: 10px; height: 10px; border-radius: 50%; background:#616161; margin-right: 6px;"></span>Light snacks
        </div>
        <div class="legend-item" style="display: flex; align-items: center;">
            <span class="legend-color" style="width: 10px; height: 10px; border-radius: 50%; background:#9e9e9e; margin-right: 6px;"></span>None
        </div>
    `;
    
    // Toggle legend visibility when button is clicked (and close filter)
    L.DomEvent.on(button, "click", function () {
        if (legendContent.style.display === "none") {
            legendContent.style.display = "block";
            button.style.background = "rgba(100,150,200,0.95)"; // Highlight when expanded
            button.style.color = "white";
            // Close filter when opening legend
            if (filterContent) {
                filterContent.style.display = "none";
                if (filterButton) {
                    filterButton.style.background = "rgba(255,255,255,0.95)";
                    filterButton.style.color = "black";
                }
            }
        } else {
            legendContent.style.display = "none";
            button.style.background = "rgba(255,255,255,0.95)";
            button.style.color = "black";
        }
    });
    
    return container;
};

legend.addTo(map);

// -------------------- MAP TITLE --------------------
// Create a title control that displays at the top of the map
const title = L.control({ position: "topleft" });

title.onAdd = function () {
    const div = L.DomUtil.create("div", "map-title");
    
    div.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #FFE8D6 0%, #FFF4E6 100%);
            padding: 4px 8px;
            border-radius: 12px;
            font-family: 'Fredoka One', 'Quicksand', sans-serif;
            box-shadow: 0 8px 12px rgba(0,0,0,0.3);
        ">
            <div style="
                font-size: 18px;
                font-weight: 700;
                color: #df6f00; 
                letter-spacing: 0.5px;
            ">What's The Food Truck?</div>
            <div style="
                font-size: 12px;
                font-weight: 400;
                color: #df6f00;
                margin-top: 1px;
                letter-spacing: 0.2px;
            ">See what there is to eat at Seattle breweries</div>
        </div>
    `;
    
    return div;
};

title.addTo(map);

// -------------------- SEARCH BAR --------------------
const searchControl = L.control({ position: "topleft" });

searchControl.onAdd = function () {
    const container = L.DomUtil.create("div", "search-container");

    container.innerHTML = `
        <div class="search-box">
            <div class="search-input-wrap">
                <i class="fa fa-search search-icon" aria-hidden="true"></i>
                <input id="brewery-search" type="text" placeholder="Search breweries..." aria-label="Search breweries" autocomplete="off" />
            </div>
            <ul id="search-results"></ul>
        </div>
    `;

    // Prevent map click/drag/scroll events from passing through the search box
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const input = container.querySelector("#brewery-search");
    const results = container.querySelector("#search-results");

    input.addEventListener("input", function () {
        const q = this.value.trim().toLowerCase();
        results.innerHTML = "";

        if (!q) {
            results.style.display = "none";
            return;
        }

        const matches = Object.values(breweryMarkers)
            .filter(item => (item.properties.name || "").toLowerCase().includes(q))
            .slice(0, 8);

        if (matches.length === 0) {
            results.style.display = "none";
            return;
        }

        matches.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.properties.name;
            li.addEventListener("click", function () {
                const latlng = item.marker.getLatLng();
                map.flyTo(latlng, 17, { duration: 1 });
                item.marker.openPopup();
                results.style.display = "none";
                input.value = item.properties.name;
            });
            results.appendChild(li);
        });

        results.style.display = "block";
    });

    // Close dropdown when clicking elsewhere
    document.addEventListener("click", function (e) {
        if (!container.contains(e.target)) {
            results.style.display = "none";
        }
    });

    return container;
};

searchControl.addTo(map);
