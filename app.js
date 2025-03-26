const infoText = document.getElementById("info-text");
const debugOverlay = document.getElementById("debug-overlay");

let lat = 0, lon = 0, heading = 0;
let filteredLat = null, filteredLon = null;

const featureLayerUrl = "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Locations_Current/FeatureServer/" ;
let selectedState = "HI"; // default

// Haversine formula: Calculate distance between two coordinates 
function calculateDistance(userLat, userLon, poiLat, poiLon) {
  const R = 6371e3; // Radius of the Earth in meters
  const p1 = userLat * Math.PI / 180;
  const p2 = poiLat * Math.PI / 180;
  const deltaLat = (poiLat - userLat) * Math.PI / 180;
  const deltaLon = (poiLon - userLon) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
}

// Not used: Calculate the direction vector for items far away - We will create a fixed size sphere instead that ar of same scale
// function calculateDirectionVector(userLat, userLon, poiLat, poiLon) {
//   const toRadians = (deg) => deg * (Math.PI / 180);
//   const toDegrees = (rad) => rad * (180 / Math.PI);

//   const dLon = toRadians(poiLon - userLon);
//   const lat1 = toRadians(userLat);
//   const lat2 = toRadians(poiLat);

//   const y = Math.sin(dLon) * Math.cos(lat2);
//   const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

//   const bearing = toDegrees(Math.atan2(y, x));
//   return bearing;
// }

// Update the scale of an entity based on distance (Scale By Distance)
function updateScale(entity, distance) {
  const minScale = 100;
  const maxScale = 300;
  const thresholdDistance = 3000; // Distance In meters as a threshold

  if (distance > thresholdDistance) { // If further away;
    // Make it appear as a fixed size yet showing up on a direction relevant to the current user location
    // Fixed Scale - size Still responsive to the distance
    entity.setAttribute('scale', "100 100 100");
    // console.log(`Further than threshold: ${thresholdDistance}`, distance, "POI ID: ", entity.id, "scale: ", 50);
  } else {    // Dynamic Scale POIs by Distance - within threshold 
    let scale;
    // Dividing 1000 by the distance is a way to create a scaling factor that inversely relates to the distance
    scale = Math.min(maxScale, Math.max(minScale, 1000 / distance));
    // scale = Math.max(200, 1000 / distance);
    entity.setAttribute('scale', `${scale} ${scale} ${scale}`);
    // console.log(`Distance: ${distance}, Scale: ${scale}`); 
    // console.log("NEAR distance: ", distance, "POI ID", entity.id, "scale: ", scale);
  }
}

// // Create a POI entity
function createPOIEntity(poi, userLatitude, userLongitude) {
  const entity = document.createElement('a-entity');
  entity.setAttribute('id', poi.name.replace(/\s+/g, '-').toLowerCase());
  
  const sphere = document.createElement('a-sphere');
  sphere.setAttribute('color', 'red');
  sphere.setAttribute('radius', '1');
  sphere.setAttribute('material', 'opacity: 0.5');
  entity.appendChild(sphere);
  
  const text = document.createElement('a-text');
  text.setAttribute('value', poi.name);
  text.setAttribute('color', 'black');
  text.setAttribute('position', '0 1.5 0');
  text.setAttribute('scale', '5 5 5');
  entity.appendChild(text);
  
  entity.setAttribute('gps-entity-place', `latitude: ${poi.latitude}; longitude: ${poi.longitude};`);

  const distance = calculateDistance(userLatitude, userLongitude, poi.latitude, poi.longitude);
  updateScale(entity, distance);

  // Update look-at attribute after entity is added to the scene
  entity.addEventListener('loaded', () => {
    text.setAttribute('look-at', "[gps-camera]");
  });

  return entity;
}

//  // Query the FeatureLayer based on the selected State (Works on VR. Not on Mobile yet)

function loadPOIData(latitude, longitude, selectedState) {
  require([
    "esri/layers/FeatureLayer"
  ], function(FeatureLayer) {

    const modifiedUrl = featureLayerUrl + "0";
    const featureLayer = new FeatureLayer({
      url: modifiedUrl,
      outFields: ["*"]
    });

   // Apply filter by selected state
    featureLayer.definitionExpression = `STATE = '${selectedState}'`;

    featureLayer.queryFeatures()
      .then(function(result) {
        console.log('FeatureLayer data loaded:', result.features); // Debugging log
        result.features.forEach(function(feature) {
          const poi = {
            name: feature.attributes.NAME,
            latitude: feature.geometry.latitude,
            longitude: feature.geometry.longitude
          };

          // Calculate distance between current location and POI
          const distance = calculateDistance(latitude, longitude, poi.latitude, poi.longitude);

            const poiEntity = createPOIEntity(poi, latitude, longitude);
            document.querySelector('a-scene').appendChild(poiEntity);
        });
        
      })
      .catch(function(error) {
        console.error('Error loading FeatureLayer data:', error); // Debugging log
        document.getElementById("debug-overlay").innerText = "Error loading POI data.";
      });
  });
}

function updateDisplay() { // This is where AR Screen gets refreshed
  // Show Both fluctuating GPS & Noise-reduced GPS in debugOverlay on mobile
  // const displayText = `Lat: ${lat.toFixed(10)}\nLng: ${lon.toFixed(10)}\nHeading: ${heading.toFixed(2)}°`;
  const displayText = `
  Lat: ${lat.toFixed(10)}\nLng: ${lon.toFixed(10)}\nHeading: ${heading.toFixed(2)}°\n\n
  Filtered Lat: ${filteredLat.toFixed(10)}\nFiltered Lng: ${filteredLon.toFixed(10)}`;
  // infoText.setAttribute("value", displayText);

  // Corrected: Include heading in gps-entity-place
  // infoText.setAttribute("gps-entity-place", `latitude: ${lat}; longitude: ${lon}; heading: ${heading}`);

  debugOverlay.innerHTML = displayText;

  // Clear existing POIs
  const existingPOIs = document.querySelectorAll('[gps-entity-place]');
  existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));

  // Load new POI data (Interim function to test)
  // loadPOIData(filteredLat, filteredLon, selectedState);
  loadPOIData(lat, lon, selectedState);
  console.log(`Updated GPS:
    Lat: ${lat.toFixed(10)}, Lng: ${lon.toFixed(10)}
    Filtered GPS:
    Lat: ${filteredLat.toFixed(10)}, Lng: ${filteredLon.toFixed(10)}`);
}

//** Noise Reduction 1: Kalman Filters
const kalmanLat = new KalmanFilter({ R: 0.01, Q: 3 });
const kalmanLon = new KalmanFilter({ R: 0.01, Q: 3 });

//** Noise Reduction 2: Smooth out the data and reduce the impact
// Moving average filter parameters
const movingAverageWindow = 3; // Store the last 3 latitude and longitude values.
let latHistory = [];
let lonHistory = [];

// Keeping track of previous GPS values
let previousLat = null;
let previousLon = null;
const changeThreshold = 0.00001; // Threshold for significant change in GPS

function updateGPS() { 
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        // GPS Values from GPS Hardware
        lat = position.coords.latitude;
        lon = position.coords.longitude; 
        // updateDisplay();
        // console.log(`Updated GPS: Lat ${lat}, Lng ${lon}`);

        // Apply Kalman filter to smooth values (Noise Reduction)
        filteredLat = kalmanLat.filter(lat);
        filteredLon = kalmanLon.filter(lon);

        // Round the values to N decimal places 
        filteredLat = parseFloat(filteredLat.toFixed(10));
        filteredLon = parseFloat(filteredLon.toFixed(10));

        // Add to history to keep track of moving average
        latHistory.push(filteredLat);
        lonHistory.push(filteredLon);

        // Maintain history window size (remove the oldest entry if length > movingAverageWindow)
        if (latHistory.length > movingAverageWindow) latHistory.shift();
        if (lonHistory.length > movingAverageWindow) lonHistory.shift();

        // Calculate moving average - sums of the values in array/length
        filteredLat = latHistory.reduce((a, b) => a + b, 0) / latHistory.length;
        filteredLon = lonHistory.reduce((a, b) => a + b, 0) / lonHistory.length;

        // UpdateDisplay, if the change exceeds the threshold
        if (previousLat === null || previousLon === null || 
            Math.abs(filteredLat - previousLat) > changeThreshold || 
            Math.abs(filteredLon - previousLon) > changeThreshold) {
          updateDisplay();
          previousLat = filteredLat;
          previousLon = filteredLon;
          // console.log(`Updated GPS: Lat ${lat}, Lng ${lon}, Filtered GPS:  Lat ${filteredLat}, Lng ${filteredLon}`);
        }
      },
      (error) => {
        console.error("Geolocation error: ", error);
        debugOverlay.innerHTML = "GPS Error: " + error.message;
      },
      // timeout: the device has up to 5 seconds to get the GPS position
      // maximumAge: No cached positions; always fetch a fresh position from GPS.
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  } else {
    console.error("Geolocation not supported.");
    debugOverlay.innerHTML = "Geolocation not supported.";
  }
}

// function updateGPS() { 
//   if (navigator.geolocation) {
//     navigator.geolocation.watchPosition(
//       (position) => {
//         // lat = position.coords.latitude;
//         // lon = position.coords.longitude;
//         // Apply Kalman filter to smooth the latitude and longitude values
//         lat = kalmanLat.filter(position.coords.latitude);
//         lon = kalmanLon.filter(position.coords.longitude);
//         updateDisplay();
//         console.log(`Updated GPS: Lat ${lat}, Lng ${lon}`);
//       },
//       (error) => {
//         console.error("Geolocation error: ", error);
//         debugOverlay.innerHTML = "GPS Error: " + error.message;
//       },
//       { enableHighAccuracy: true }
//     );
//   } else {
//     console.error("Geolocation not supported.");
//     debugOverlay.innerHTML = "Geolocation not supported.";
//   }
// }

function updateHeading(event) {
  if (event.alpha !== null) {
    heading = 360 - event.alpha; // Convert to compass heading
    updateDisplay();
    console.log(`Updated Heading: ${heading}°`);
  } else {
    debugOverlay.innerHTML = "No compass data available.";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const start = async () => {
    // Enable resizing the bottom panel with touch and drag
    enablePanelResizing();

    // Initialize the ArcGIS SceneView
    initSceneView();
  }
  start();
});

function enablePanelResizing() {
  const bottomContainer = document.getElementById('bottom-container');
  const resizer = document.getElementById('resizer');
  const arContainer = document.getElementById('my-ar-container');

  let isResizing = false;
  let startY = 0;
  let startHeight = 0;
  let startArHeight = 0;

  const startResize = (event) => {
    isResizing = true;

    // Support both mouse and touch events
    startY = event.touches ? event.touches[0].clientY : event.clientY;
    startHeight = bottomContainer.offsetHeight;
    startArHeight = arContainer.offsetHeight;

    document.body.style.cursor = 'ns-resize';
    event.preventDefault(); // Prevents page scrolling
  };

  const resize = (event) => {
    if (!isResizing) return;

    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const dy = clientY - startY;

    const newBottomHeight = Math.max(50, startHeight - dy);
    const newArHeight = Math.max(50, startArHeight + dy);

    // Apply updated sizes
    bottomContainer.style.height = `${newBottomHeight}px`;
    arContainer.style.height = `${newArHeight}px`;

    event.preventDefault(); // Prevents touch scrolling issues in Chrome
  };

  const endResize = () => {
    isResizing = false;
    document.body.style.cursor = 'default';
  };

  // Apply event listeners with passive: false for Chrome
  resizer.addEventListener('mousedown', startResize);
  resizer.addEventListener('touchstart', startResize, { passive: false });

  document.addEventListener('mousemove', resize);
  document.addEventListener('touchmove', resize, { passive: false });

  document.addEventListener('mouseup', endResize);
  document.addEventListener('touchend', endResize);
}

function initSceneView() {
  require([
    // "esri/widgets/Track", // Track widget is being deprecated
    "esri/WebScene",
    "esri/layers/FeatureLayer",
    "esri/views/SceneView",
    "esri/widgets/Legend",
    "esri/widgets/Search",
    "esri/widgets/Expand",
  ], (
    // Track,
    WebScene,
    FeatureLayer,
    SceneView,
    Legend,
    Search,
    Expand,
  ) => {

    //********************** Set up a Web Scene **********************//
    // Load the webscene 
    const webscene = new WebScene({
      portalItem: {
        id: "1960f4386fd549bb82f8ac1bf2b7b087"
      }
    });

    const view = new SceneView({
      container: "viewDiv",
      map: webscene,
      environment: {
        lighting: {
          directShadowsEnabled: true
        }
      }
    });

    //********************** Symbols, Points Rendering, Points Layer  **********************//
    // Symbols for the points of interest
    const verticalOffset = {
      screenLength: 40,
      maxWorldLength: 200,
      minWorldLength: 35
    };

    function getUniqueValueSymbol(name, color) {
      return {
        type: "point-3d",
        symbolLayers: [
          {
            type: "icon",
            resource: {
              href: name
            },
            size: 20,
            outline: {
              color: "white",
              size: 2
            }
          }
        ],
        verticalOffset: verticalOffset,
        callout: {
          type: "line",
          color: "white",
          size: 1,
          border: {
            color: color
          }
        }
      };
    }

    const pointsRenderer = {
      type: "unique-value",
      field: "STATE",
      uniqueValueInfos: [
        {
          value: "HI",
          symbol: getUniqueValueSymbol("labels/Museum.png", "#D13470")
        },
        {
          value: "CA",
          symbol: getUniqueValueSymbol("labels/Hotel.png", "#56B2D6")
        },
        {
          value: "NY",
          symbol: getUniqueValueSymbol("labels/Church.png", "#884614")
        }
      ],
      defaultSymbol: getUniqueValueSymbol("labels/Park.png", "#40C2B4")
    };

    const pointsLayer = new FeatureLayer({
      url: featureLayerUrl,
      title: "Disaster Shelter Locations by States",
      popupTemplate: {
        title: "{Name}",
        content: `<b>Address</b>:{STREET}, {CITY}, {STATE}, {ZIP}<br>
              <b>Coordinates</b> (Lat, Lng): {LAT}, {LON}`
      },
      elevationInfo: {
        mode: "relative-to-scene"
      },
      renderer: pointsRenderer,
      outFields: ["*"],
      featureReduction: {
        type: "selection"
      },
      labelingInfo: [
        {
          labelExpressionInfo: {
            value: "{Name}"
          },
          symbol: {
            type: "label-3d",
            symbolLayers: [
              {
                type: "text",
                material: {
                  color: "white"
                },
                halo: {
                  size: 1,
                  color: [50, 50, 50]
                },
                size: 10
              }
            ]
          }
        }
      ]
    });

    webscene.add(pointsLayer);

    //********************** Points Symbol Style with Call-Outs **********************//
    document.getElementById("cityStyle").addEventListener("change", (event) => {
      if (event.target.id === "declutter") {
        const type = {
          type: "selection"
        };
        pointsLayer.featureReduction = event.target.checked ? type : null;
      } else if (event.target.id === "perspective") {
        pointsLayer.screenSizePerspectiveEnabled = event.target.checked;
      } else if (event.target.id === "callout") {
        const renderer = pointsLayer.renderer.clone();
        renderer.uniqueValueInfos.forEach((valueInfo) => {
          valueInfo.symbol.verticalOffset = event.target.checked ? verticalOffset : null;
        });
        pointsLayer.renderer = renderer;
      } else if (event.target.id === "relative-to-scene") {
        const mode = event.target.checked ? "relative-to-scene" : "relative-to-ground";
        pointsLayer.elevationInfo = {
          mode: mode
        };
      }
    });

    view.ui.add(document.getElementById("cityStyle"), "bottom-left");

    //********************** Legend with State Info **********************//
    const legend = new Legend({
      view: view,
      layerInfos: [
        {
          layer: pointsLayer,
          title: "Shelter Locations by States"
        }
      ]
    });

    const legendExpand = new Expand({
      view: view,
      content: legend,
      expanded: false
    });

    view.ui.add(legendExpand, "top-right");

    // Add a drop down to filter feature layer by state
    view.when(() => {
      const stateSelect = document.createElement("select");
      stateSelect.id = "stateSelect";
      stateSelect.innerHTML = `
    <option value="AL">Alabama</option>
    <option value="AK">Alaska</option>
    <option value="AZ">Arizona</option>
    <option value="AR">Arkansas</option>
    <option value="CA">California</option>
    <option value="CO">Colorado</option>
    <option value="CT">Connecticut</option>
    <option value="DE">Delaware</option>
    <option value="FL">Florida</option>
    <option value="GA">Georgia</option>
    <option value="HI" selected>Hawaii</option>
    <option value="ID">Idaho</option>
    <option value="IL">Illinois</option>
    <option value="IN">Indiana</option>
    <option value="IA">Iowa</option>
    <option value="KS">Kansas</option>
    <option value="KY">Kentucky</option>
    <option value="LA">Louisiana</option>
    <option value="ME">Maine</option>
    <option value="MD">Maryland</option>
    <option value="MA">Massachusetts</option>
    <option value="MI">Michigan</option>
    <option value="MN">Minnesota</option>
    <option value="MS">Mississippi</option>
    <option value="MO">Missouri</option>
    <option value="MT">Montana</option>
    <option value="NE">Nebraska</option>
    <option value="NV">Nevada</option>
    <option value="NH">New Hampshire</option>
    <option value="NJ">New Jersey</option>
    <option value="NM">New Mexico</option>
    <option value="NY">New York</option>
    <option value="NC">North Carolina</option>
    <option value="ND">North Dakota</option>
    <option value="OH">Ohio</option>
    <option value="OK">Oklahoma</option>
    <option value="OR">Oregon</option>
    <option value="PA">Pennsylvania</option>
    <option value="RI">Rhode Island</option>
    <option value="SC">South Carolina</option>
    <option value="SD">South Dakota</option>
    <option value="TN">Tennessee</option>
    <option value="TX">Texas</option>
    <option value="UT">Utah</option>
    <option value="VT">Vermont</option>
    <option value="VA">Virginia</option>
    <option value="WA">Washington</option>
    <option value="WV">West Virginia</option>
    <option value="WI">Wisconsin</option>
    <option value="WY">Wyoming</option>
  `;

      // Create a div
      const filterDiv = document.createElement("div");
      filterDiv.id = "filterDiv";
      filterDiv.innerHTML = `<label for="stateSelect">View by State:</label>`;
      filterDiv.appendChild(stateSelect);

      // Add it to the legendContainer (Hard-coded - May not be the best way?)
      const legendContainer = document.querySelector(".esri-legend"); // esri-expand__popover-content

      if (legendContainer) {
        legendContainer.appendChild(filterDiv);
      } else {
        console.error("Legend container not found.");
      }

      stateSelect.addEventListener("change", updateStateFilter);

      function updateStateFilter() {
        selectedState = stateSelect.value; // Update selectedState global variable from dropDown
        if (selectedState) {
            pointsLayer.definitionExpression = `STATE = '${selectedState}'`;
            console.log("Updated US state: " + `${selectedState}`);
    
            // Clear existing POIs
            const existingPOIs = document.querySelectorAll('[gps-entity-place]');
            existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));
    
            // Load new POI data based on the selected state
            loadPOIData(lat, lon, selectedState);
        } else {
            console.log("No state selected");
        }
    }

      updateStateFilter();
    });


    
    //********************** Search  **********************//
    const searchWidget = new Search({
      view: view
    });

    view.ui.add(searchWidget, {
      position: "top-right"
    });

    //********************** User Location Tracking (Blue Dot) **********************//
    // const track = new Track({
    //   view: view
    // });

    // view.ui.add(track, "top-left");

    // view.when(() => {
    //   track.start();
    // });

    //********************** Travel Between Three Preset Locations **********************//
    const locations = {
      oahu: {
        center: [-157.8583, 21.3069]
      },
      redlands: {
        center: [-117.1825, 34.0556]
      },
      brooklyn: {
        center: [-73.9442, 40.6782]
      }
    };

    window.goToLocation = function (location) {
      view.goTo({
        center: locations[location].center
      }).catch((error) => {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      });
    };

    //********************** Toggle between Bird eye & Top Views  **********************//
    const button = document.getElementById("toggleView");
    button.addEventListener("click", () => {
      if (button.innerHTML == "Top view") {
        button.innerHTML = "Bird eye's view";
      } else {
        button.innerHTML = "Top view";
      }
      view.goTo(view.camera.tilt < 1 ? { tilt: 80 } : { tilt: 0 }).catch((error) => {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      });
    });
  });
}
// Listen for device orientation events (compass)
window.addEventListener("deviceorientationabsolute", updateHeading, true);

// Start GPS updates
updateGPS();
