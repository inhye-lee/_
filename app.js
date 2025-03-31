// Temp API Key for Location Services (inc. Geocoding): Expires May 31 2025
const esriConfig = {
  apiKey: "AAPTxy8BH1VEsoebNVZXo8HurLRYsIcdvKKWcuOv2pgkoPa83X5203hTMNmkIserOf2KoTOvhIDCRTfPBVVZFGSqJB38gyWw0suv8ZEot3UdGycvb_MOTYUopiDmL5voe7DPXDb4e4ueUJI0tj2eY0myefU2NosMLnZC_IpblBRwnNE6IS4x0ApqghVfdUisrVA-Fr5U8LOym_Tuh70OdUFVxmCJXXaN4pbEe6VWVpfzZVs.AT1_CiCOhLmU" 
};

const infoText = document.getElementById("info-text");
const debugOverlay = document.getElementById("debug-overlay");
let stateSelect; // DOM to be created 
let isUSStateAssigned = false; // Check if the default US state has been assigned
let defaultUSState; // default State
let selectedState; // selected State

let useFilteredData = true; // Track the gps data source to compare raw & filtered
let lat = 0, lon = 0, heading = 0;
let filteredLat = null, filteredLon = null;
let previousLat = null, previousLon = null;
const changeThreshold = 0.0001; // Threshold for significant change in GPS (0.0001 = approx 11.13 meters)

const featureLayerUrl = "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Locations_Current/FeatureServer/" ;

// Temporarily using an absolute path to get away issues in public repo
const symbol_HI = 'https://inhye-lee.github.io/_/labels/Museum.png';
const symbol_CA = 'https://inhye-lee.github.io/_/labels/Hotel.png';
const symbol_NY = 'https://inhye-lee.github.io/_/labels/Church.png';
const symbol_default = 'https://inhye-lee.github.io/_/labels/Park.png';

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
    // console.log("NEAR distance: ", distance, "POI ID", entity.id, "scale: ", scale);
  }
}

function createPOIEntity(poi, userLatitude, userLongitude) {
  // Label Image
  const image = document.createElement('a-image');
  let imageSrc;
  switch (selectedState) {
    case 'HI':
      imageSrc = symbol_HI;
      break;
    case 'CA':
      imageSrc = symbol_CA;
      break;
    case 'NY':
      imageSrc = symbol_NY;
      break;
    default:
      imageSrc = symbol_default;
  }
  
  // Entity
  const entity = document.createElement('a-entity');
  entity.setAttribute('id', poi.name.replace(/\s+/g, '-').toLowerCase());
  
  // Height val, offset
  const imageHeight = 2; 
  let lineHeight = imageHeight * 2;
  let imageYOffset = imageHeight / 2;

  // white line 
  const line = document.createElement('a-plane');
  line.setAttribute('color', 'white');
  line.setAttribute('width', 0.1); 
  line.setAttribute('height', imageHeight * 2); // Length
  line.setAttribute('position', `0 -${lineHeight / 2} 0`); // anchor is in the center 
  line.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow
  entity.appendChild(line);

  // image
  image.setAttribute('src', imageSrc);
  image.setAttribute('width', imageHeight); 
  image.setAttribute('height', imageHeight);
  image.setAttribute('position', `0 ${imageYOffset} 0`); // Position the image on top of the line
  image.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow
  image.setAttribute('material', 'alphaTest: 0.5'); // Add alphaTest for transparency
  entity.appendChild(image);

  const text = document.createElement('a-text');
  text.setAttribute('value', poi.name);
  text.setAttribute('color', 'black');
  text.setAttribute('position', '0 3 0'); // Adjusted position to be above the image
  text.setAttribute('scale', '5 5 5');
  text.setAttribute('align', 'center'); // Center align the text
  text.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow
  entity.appendChild(text);
  
  entity.setAttribute('gps-entity-place', `latitude: ${poi.latitude}; longitude: ${poi.longitude};`);

  const distance = calculateDistance(userLatitude, userLongitude, poi.latitude, poi.longitude);
  updateScale(entity, distance);

  // Update look-at attribute after entity is added to the scene
  entity.addEventListener('loaded', () => {
    text.setAttribute('look-at', "[gps-camera]");
    image.setAttribute('look-at', "[gps-camera]");
  });

  return entity;
}
function adjustTextScale(text, distance) {
  const baseScale = 5; // Increased base scale for text
  const scaleFactor = 1 / distance; // Scale factor based on distance
  text.setAttribute('scale', `${baseScale * scaleFactor} ${baseScale * scaleFactor} ${baseScale * scaleFactor}`);
}

//  // Query the FeatureLayer based on the selected State
function loadPOIData() {
  // Show the loading indicator
  document.getElementById('loadingIndicator').style.display = 'block';
  
  require([
    "esri/layers/FeatureLayer"
  ], function(FeatureLayer) {

    const modifiedUrl = featureLayerUrl + "0";
    const featureLayer = new FeatureLayer({
      url: modifiedUrl,
      outFields: ["*"]
    });

    // Assign which lat & lon to use
    const curLat = useFilteredData ? filteredLat : lat;
    const curLon = useFilteredData ? filteredLon : lon;

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
          const distance = calculateDistance(curLat, curLon, poi.latitude, poi.longitude);
          // Define a threshold distance 
          const thresholdDistance = 3000; // 3 kilometers
          // Only draw POIs that are within the threshold distance
          if (distance <= thresholdDistance) {
            const poiEntity = createPOIEntity(poi, curLat, curLon);
            document.querySelector('a-scene').appendChild(poiEntity);
          }
        });
        
        // Hide the loading indicator once data is loaded
        document.getElementById('loadingIndicator').style.display = 'none';

      })
      .catch(function(error) {
        console.error('Error loading FeatureLayer data:', error); // Debugging log
        document.getElementById("debug-overlay").innerText = "Error loading POI data.";
      });
  });
}

function updateDisplay() { // This is where AR Screen gets refreshed
  // Display Raw GPS & Noise-reduced GPS in debugOverlay
  const displayText = `
  Lat: ${lat.toFixed(10)}\nLng: ${lon.toFixed(10)}\nHeading: ${heading.toFixed(2)}°\n\n
  Filtered Lat: ${filteredLat.toFixed(10)}\nFiltered Lng: ${filteredLon.toFixed(10)}`;

  infoText.setAttribute("value", displayText);
  // Corrected: Include heading in gps-entity-place
  infoText.setAttribute("gps-entity-place", `latitude: ${lat}; longitude: ${lon}; heading: ${heading}`);

  debugOverlay.innerHTML = displayText;

  // Clear existing POIs
  const existingPOIs = document.querySelectorAll('[gps-entity-place]');
  existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));

  if (isUSStateAssigned) { // Prevent not calling the function when there is no default US state 
    loadPOIData();
  }

}

function updateGPS() { 
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        // Values from GPS Hardware
        lat = position.coords.latitude;
        lon = position.coords.longitude; 

        // Initialize Kalman filters for latitude and longitude (Noise Reduction)
        const kalmanLat = new KalmanFilter({ R: 0.01, Q: 3 });
        const kalmanLon = new KalmanFilter({ R: 0.01, Q: 3 });

        // Apply Kalman filter to the raw GPS values
        filteredLat = kalmanLat.filter(lat);
        filteredLon = kalmanLon.filter(lon);

        // Call updateDisplay based on useFilteredData boolean
        if (!useFilteredData) {
          updateDisplay();
        } else {// if useFilteredData is true, UpdateDisplay when the change exceeds the threshold
          if (previousLat === null || previousLon === null || 
              Math.abs(filteredLat - previousLat) > changeThreshold || 
              Math.abs(filteredLon - previousLon) > changeThreshold) {
            updateDisplay();
            previousLat = filteredLat;
            previousLon = filteredLon;
          }
        }
      },
      (error) => {
        console.error("Geolocation error: ", error);
        debugOverlay.innerHTML = "GPS Error: " + error.message;
      },
      { enableHighAccuracy: true}
    );
  } else {
    console.error("Geolocation not supported.");
    debugOverlay.innerHTML = "Geolocation not supported.";
  }
}

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

    updateGPS();
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
    "esri/widgets/Track", // Track widget is being deprecated
    "esri/WebScene",
    "esri/layers/FeatureLayer",
    "esri/views/SceneView",
    "esri/widgets/Legend",
    "esri/widgets/Search",
    "esri/widgets/Expand",
    "esri/rest/locator",
    "esri/geometry/Point",
  ], (
    Track,
    WebScene,
    FeatureLayer,
    SceneView,
    Legend,
    Search,
    Expand,
    locator,
    Point
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
          symbol: getUniqueValueSymbol(symbol_HI , "#D13470")
        },
        {
          value: "CA",
          symbol: getUniqueValueSymbol(symbol_CA, "#56B2D6")
        },
        {
          value: "NY",
          symbol: getUniqueValueSymbol(symbol_NY, "#884614")
        }
      ],
      defaultSymbol: getUniqueValueSymbol(symbol_default, "#40C2B4")
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

    //********************** User Location Tracking (Blue Dot) **********************//
    const track = new Track({
      view: view
    });

    view.ui.add(track, "top-left");

    view.when(() => {
      track.start();
    });

    track.on("track", function(event) {
      const point = new Point({
        latitude: event.position.coords.latitude,
        longitude: event.position.coords.longitude
      });

      const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
      
      // Only assign the US state once
      if (!isUSStateAssigned) {
        locator.locationToAddress(locatorUrl, {
          location: point
        })
        .then(function(response) {
          defaultUSState = response.attributes.RegionAbbr;
          console.log("US State from Location Tracking:", defaultUSState);
          
          if (stateSelect) {
            stateSelect.value = defaultUSState;
          }

          // Set the flag to true after assigning the state
          isUSStateAssigned = true;

           // Call updateStateFilter only after assigning defaultUSState
           updateStateFilter();
        })
        .catch(function(error) {
          console.error("Error in reverse geocoding:", error);
        });
      }
    });

    //********************** Update State Filter Function **********************//
    function updateStateFilter() {
      selectedState = stateSelect.value; // Update selectedState global variable from dropDown
      console.log("selectedState in updateStateFilter", selectedState);
      stateSelect.addEventListener("change", updateStateFilter);
      if (selectedState) {
          pointsLayer.definitionExpression = `STATE = '${selectedState}'`;
          console.log("Updated US state: " + `${selectedState}`);
  
          // Clear existing POIs
          const existingPOIs = document.querySelectorAll('[gps-entity-place]');
          existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));
  
          // Load new POI data based on the selected state
          loadPOIData();
      } else {
          console.log("No state selected");
      }
    } 

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
      stateSelect = document.createElement("select");
      stateSelect.id = "stateSelect";
      stateSelect.innerHTML = `
    <option value ="None">None</option>
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
    <option value="HI">Hawaii</option>
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
      
    });
    
    //********************** Search  **********************//
    const searchWidget = new Search({
      view: view
    });

    view.ui.add(searchWidget, {
      position: "top-right"
    });

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

// Function to toggle the data source
function toggleDataSource() {
  useFilteredData = !useFilteredData;
  document.getElementById('toggleGPSButton').textContent = useFilteredData ? 'Use Raw GPS' : 'Use Filtered GPS';
  console.log("useFilteredData: ", useFilteredData);
}

// Add event listener to the button
document.getElementById('toggleGPSButton').addEventListener('click', toggleDataSource);

// Start GPS updates (Called in DOM)
// updateGPS();
