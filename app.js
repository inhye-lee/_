// Temp API Key for Location Services (inc. Geocoding): Expires May 31 2025
const esriConfig = {
  apiKey: "AAPTxy8BH1VEsoebNVZXo8HurLRYsIcdvKKWcuOv2pgkoPa83X5203hTMNmkIserOf2KoTOvhIDCRTfPBVVZFGSqJB38gyWw0suv8ZEot3UdGycvb_MOTYUopiDmL5voe7DPXDb4e4ueUJI0tj2eY0myefU2NosMLnZC_IpblBRwnNE6IS4x0ApqghVfdUisrVA-Fr5U8LOym_Tuh70OdUFVxmCJXXaN4pbEe6VWVpfzZVs.AT1_CiCOhLmU" 
};

let view; // Declare globally *Fix for iOS WebScene not responsive to heading change

const infoText = document.getElementById("info-text");
const debugOverlay = document.getElementById("debug-overlay");
let stateSelect; // DOM to be created 
let isUSStateAssigned = false; // Check if the default US state has been assigned
let defaultUSState; // default State
let selectedState; // selected State

let useFilteredData = true; // Track the gps data source to compare raw & filtered
let lat = 0, lon = 0; 
let filteredLat = null, filteredLon = null;
let previousLat = null, previousLon = null;
const changeThreshold = 0.0001; // Threshold for significant change in GPS (0.0001 = approx 11.13 meters)

let curLat = 0, curLon = 0; // Chosen between raw & filtered data

//Tracking Compass Heading in updateHeading
let heading = 0;
let smoothedHeading = null; // Variable to store the smoothed heading
const smoothingFactor = 0.2; // Weight given for smoothing (0 < sFactor <= 1). Lower val = mo' smoothing; slower response
const headingChangeThreshold = 5; // Minimum change in degrees to trigger an update
let previousHeading = null; // Store the previous heading value

// Check if the brower sensors are ready 
let motionReady = false;
let gpsReady = false;

let thresholdDistance = 3000; // Default value (Dynamic via Slider)

let currentlyExpandedPOI = null;
let userInteracted = false; // Tracks if the user has interacted with a POI

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

  // Distance calculation & Scaling
  const distance = calculateDistance(userLatitude, userLongitude, poi.latitude, poi.longitude);
  const proportionalScale = calculateProportionalScale(distance); 
  const reverseScale = calculateReverseScale(distance); 

  // Image Source for Label
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

  // Height val, offset
  const imageHeight = 2; 
  let lineHeight = imageHeight * 1.5;
  let lineYOffset = (lineHeight/2);
  let imageYOffset = lineHeight - imageHeight - 0.1;
  
  // (0) Entity - Create a new entity for the POI
  const entity = document.createElement('a-entity');
  entity.setAttribute('id', poi.name.replace(/\s+/g, '-').toLowerCase());
  entity.setAttribute('position', `0 0 0`);
  entity.setAttribute('visible', true);
  entity.setAttribute('look-at', '[gps-camera]'); // Look at the camera

  // (1) white line 
  const line = document.createElement('a-plane');
  line.setAttribute('color', 'white');
  line.setAttribute('width', 0.1); 
  line.setAttribute('height', lineHeight); // Length
  line.setAttribute('position', `0 -${lineYOffset} 0`); // anchor is in the center 
  line.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow
  entity.appendChild(line);

  //(2) image
  const image = document.createElement('a-image');
  image.setAttribute('src', imageSrc);
  image.setAttribute('width', imageHeight); 
  image.setAttribute('height', imageHeight);
  image.setAttribute('geometry', 'primitive: plane; width: 2; height: 2'); // Set the geometry
  image.setAttribute('position', `0 ${imageYOffset} 0`); // Position the image on top of the line
  image.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow
  image.setAttribute('material', 'alphaTest: 0.5'); // Add alphaTest for transparency
  entity.appendChild(image);

  // (3) Text

  // Create Parent Entity for Text (* Fix for using look-at with rotation)
  const textParent = document.createElement('a-entity');
  textParent.classList.add('text-parent')

  // offset
  let textYOffset = imageHeight + 2.0*reverseScale; //offset - image height  & scaled margin
  textParent.setAttribute('position', `0 ${textYOffset} 0`);

  // Shorten the text to the first two words and add "..." if there are more than two words
  const fullText = poi.name;
  const words = poi.name.split(' ');
  const shortenedText = words.length > 0 ? words.slice(0, 1).join(' ') + '...' : poi.name || 'Unnamed POI';

  // Check if text already exists (*Fix for duplicate error)
  const existingText = textParent.querySelector('.poi-text');
  if (!existingText) {
    const text = document.createElement('a-text');
    text.classList.add('poi-text'); // Add a class to identify the text

    text.setAttribute('text', {
      value: fullText || 'Default Text',
      color: 'black',
      align: 'center',
      wrapCount: 57, // Preventing Wrapping. Optional: Adjust the number of characters per line
      font: 'roboto', // Optional: Use a specific font
      baseline: 'center'
    });

    text.setAttribute('position', `0 0 0`);
    text.setAttribute('rotation', '0 0 0'); // Adjust rotation for diagonal display
    text.setAttribute('text-background', {
      color: 'white',
      padding: 0.2,
      opacity: 0.9
    }); // Apply the custom component
    
    textParent.appendChild(text);
  }

  // Append the text parent to the entity
  textParent.setAttribute('visible', false); // Hide the text by default
  entity.appendChild(textParent);

  // (4) Connecting Line
  const connectingLine = createLine(entity, { x: 0, y: textYOffset-0.15, z: 0 }, { x: 0, y: imageYOffset+imageHeight/2, z: 0 }, 'white');
  connectingLine.setAttribute('visible', false); // Hide the line by default

  // Apply reverse scaling based on Distance
  textParent.setAttribute('scale', `${reverseScale} ${reverseScale} ${reverseScale}`);

  entity.setAttribute('gps-entity-place', `latitude: ${poi.latitude}; longitude: ${poi.longitude};`);
  // Update Entity Scaliing
  updateScale(entity, distance);  

  entity.classList.add('clickable');
  image.classList.add('clickable'); //* Fix: clickable class had to be added to the child
  // Add the toggle-title attribute to the entity
  entity.setAttribute('toggle-title', `full: ${fullText};`); // Only full text for now
  entity.setAttribute('show-popup', 'content: Pop Up Data will be shown here'); // Show Pop up on click
  // Add look-at behavior after the entity is loaded
  entity.addEventListener('loaded', () => {
    if (image) {
      image.setAttribute('look-at', '[gps-camera]');
      textParent.setAttribute('look-at', '[gps-camera]'); // Apply look-at to the parent
      line.setAttribute('look-at', '[gps-camera]');
    } else {
      console.error('Image element is null when trying to set look-at.');
    }
  });
  
  return entity;
}

// (4) Connection Line using a-plane
function createLine(entity, start, end, color = 'white') {
  const line = document.createElement('a-plane');
  line.classList.add('connecting-line'); // Add the class

  // Calculate the midpoint between start and end
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const midZ = (start.z + end.z) / 2;

  // Calculate the length of the line
  const length = Math.sqrt(
    Math.pow(end.x - start.x, 2) +
    Math.pow(end.y - start.y, 2) +
    Math.pow(end.z - start.z, 2)
  );

  // Set the attributes for the plane
  line.setAttribute('color', color);
  line.setAttribute('width', 0.05); // Thickness (adjust as needed)
  line.setAttribute('height', length); // Set the height to the length of the line
  line.setAttribute('position', `${midX} ${midY} ${midZ}`);
  line.setAttribute('rotation', `0 0 0`); // Rotate the plane to align with the start and end points

  entity.appendChild(line);
  return line;
}

AFRAME.registerComponent('raycaster-handler', {
  init: function () {
    const raycasterEl = document.querySelector('#raycaster-camera');
    console.log('raycasterEl', raycasterEl);

    raycasterEl.addEventListener('raycaster-intersected', (evt) => {
      console.log('Raycaster intersected with:', evt.detail.el);
    });

    raycasterEl.addEventListener('raycaster-intersected-cleared', (evt) => {
      console.log('Raycaster cleared for:', evt.detail.el);
    });

    raycasterEl.addEventListener('click', (evt) => {
      const intersections = raycasterEl.components.raycaster.intersectedEls;
      if (intersections.length > 0) {
        console.log('Clicked on:', intersections[0]);
      }
    });
  }
});


let activePopUpPOI = null; // Global variable to track the currently active POI with a pop-up

AFRAME.registerComponent('show-popup', {
  schema: {
    content: { type: 'string', default: 'Pop Up Data will be shown here' } // Full text for the POI
  },

  init: function () {
    const el = this.el; // The current POI

    // Define the click handler
    this.clickHandler = () => {
      console.log('Clicked on POI:', el.id);
      if (activePopUpPOI === el) {
        // If this POI is already active, close its pop-up
        console.log('Closing pop-up for:', el.id);
        this.hidePopUp();
        activePopUpPOI = null; // Clear the active POI
      } else {
        // If another POI is active, close its pop-up
        if (activePopUpPOI) {
          console.log('Closing previous pop-up for:', activePopUpPOI.id);
          activePopUpPOI.components['show-popup'].hidePopUp();
        }
        // Show the pop-up for the current POI
        console.log('Opening pop-up for:', el.id);
        this.showPopUp();
        activePopUpPOI = el; // Set the current POI as the active one
      }
    };

    // Add the click event listener
    el.addEventListener('click', this.clickHandler);
  },

  showPopUp: function () {
    // console.log('Showing pop-up for:', this.el.id);
  },

  hidePopUp: function () {
    // console.log('Hiding pop-up for:', this.el.id);
  },

  remove: function () {
    // Remove the pop-up from the DOM when the component is removed

    // Remove the click event listener
    this.el.removeEventListener('click', this.clickHandler);
  }
});


let centeredPOI = null; // Global variable to track the closest POI to the center

AFRAME.registerComponent('toggle-title', {
  schema: {
    full: { type: 'string', default: '' }, // Full text for the POI
    threshold: { type: 'number', default: THREE.MathUtils.degToRad(5) } // Threshold in radians (5 degrees by default)
  },

  init: function () {
    const el = this.el; // The current POI
    const camera = document.querySelector('[gps-camera]').object3D; // Get the camera's 3D object
    this.camera = camera;

    // Get the text element and connecting line inside the POI
    const textEntity = el.querySelector('.poi-text');
    const textParent = textEntity ? textEntity.parentNode : null;
    const connectingLine = el.querySelector('.connecting-line');

    // Initialize the text and connecting line visibility
    if (textParent) {
      textParent.setAttribute('visible', false); // Hide the text by default
    }
    if (connectingLine) {
      connectingLine.setAttribute('visible', false); // Hide the connecting line by default
    }

    this.textParent = textParent;
    this.connectingLine = connectingLine;
  },

  tick: function () {
    const camera = this.camera;
    const threshold = this.data.threshold;

    // Get all POIs
    const pois = document.querySelectorAll('.clickable');
    let smallestAngle = Infinity;

    pois.forEach((poi) => {
      const position = new THREE.Vector3();
      poi.object3D.getWorldPosition(position);

      // Calculate the direction vector from the camera to the POI
      const directionToPOI = new THREE.Vector3();
      directionToPOI.subVectors(position, camera.position).normalize();

      // Get the camera's forward direction
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      // Calculate the horizontal angle between the camera's forward direction and the POI
      const horizontalAngle = Math.atan2(directionToPOI.x, directionToPOI.z);
      const cameraHorizontalAngle = Math.atan2(cameraDirection.x, cameraDirection.z);

      // Calculate the absolute difference between the angles
      const angleDifference = Math.abs(
        ((horizontalAngle - cameraHorizontalAngle + Math.PI) % (2 * Math.PI))
      );

      // Check if this POI is closer to the center than the current closest POI
      if (angleDifference < smallestAngle && angleDifference <= threshold) {
        smallestAngle = angleDifference;
        centeredPOI = poi;
      }
    });

    // Update visibility for the current POI
    if (this.el === centeredPOI) {
      this.showTitle(); // Always show the title for the centered POI
    } else {
      this.hideTitle(); // Hide the title if the POI is not centered
    }
  },

  showTitle: function () {
    console.log(`Showing title for: ${this.el.id}`);
    if (this.textParent) {
      this.textParent.setAttribute('visible', true); // Show the text
    }
    if (this.connectingLine) {
      this.connectingLine.setAttribute('visible', true); // Show the connecting line
    }
  },

  hideTitle: function () {
    if (this.textParent) {
      this.textParent.setAttribute('visible', false); // Hide the text
    }
    if (this.connectingLine) {
      this.connectingLine.setAttribute('visible', false); // Hide the connecting line
    }
  }
});

AFRAME.registerComponent('text-background', {
  schema: {
    color: { type: 'string', default: 'white' }, // Background color
    padding: { type: 'number', default: 0.2 },  // Padding around the text
    opacity: { type: 'number', default: 0.9 }   // Background opacity
  },

  init: function () {
    const textEl = this.el; // The entity with the text
    const backgroundEl = document.createElement('a-plane'); // Background plane

    // Set initial background properties
    backgroundEl.setAttribute('color', this.data.color);
    backgroundEl.setAttribute('opacity', this.data.opacity);

    // backgroundEl.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow

    // Append the background plane as a child of the text entity
    textEl.appendChild(backgroundEl);

    // Adjust the background size dynamically after the text is loaded
    textEl.addEventListener('loaded', () => {
      this.updateBackgroundSize(textEl, backgroundEl);
    });

    // Adjust the background size dynamically when the text changes
    textEl.addEventListener('componentchanged', (event) => {
      if (event.detail.name === 'text') {
        this.updateBackgroundSize(textEl, backgroundEl);
      }
    });
  },

  updateBackgroundSize: function (textEl, backgroundEl) {
    // Get the computed dimensions of the text
    const textData = textEl.getAttribute('text');
    const textValue = textData.value || '';
    const charWidth = 0.14; // Approximate character width
    const textWidth = textValue.length * charWidth || 2; // Calculate width based on character count
    const textHeight = textData.height || charWidth; // Default height if not set
    const padding = this.data.padding;

    console.log("Text Width: ", textWidth, "Text Height: ", textHeight);
    // Set the background size based on the text dimensions and padding
    backgroundEl.setAttribute('width', textWidth + padding * 2);
    backgroundEl.setAttribute('height', textHeight + padding);

    // Align the background to the left using offsetX
    // const offsetX = (textWidth / 2);
    const offsetX =0; 
    backgroundEl.setAttribute('position', `${offsetX} 0 -2.5`); // Adjust position to center the background; Z-flicker fix
  }
});

function calculateReverseScale(distance) {
// Define the goal distance and goal scale
  const goalDistance = 1000; // 1000 meters
  const goalScale = 1.25; // Scale for a POI at 1000 meters
  if (distance === 0) {
    console.warn("Distance is zero. Returning goal scale.");
    return goalScale; // Return the goal scale for zero distance
  }
  // Adjust the scale to match the goal size
  const adjustedScale = goalScale * (distance / goalDistance);
  return adjustedScale;
}

function calculateProportionalScale(distance) {
  // Define the goal distance and goal scale
    const goalDistance = 1000; // 1000 meters
    const goalScale = 1.25; // Scale for a POI at 1000 meters
    if (distance === 0) {
      console.warn("Distance is zero. Returning goal scale.");
      return goalScale; // Return the goal scale for zero distance
    }
    // Adjust the scale to match the goal size
    const adjustedScale = goalScale * (goalDistance / distance);
    return adjustedScale;
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
    curLat = useFilteredData ? filteredLat : lat;
    curLon = useFilteredData ? filteredLon : lon;

    // Apply filter by selected state
    featureLayer.definitionExpression = `STATE = '${selectedState}'`;

    featureLayer.queryFeatures()
      .then(function(result) {
        console.log('FeatureLayer data loaded:', result.features); // Debugging log
        const features = result.features;

        const batchSize = 25; // Number of POIs to process in each batch
        const interval = 100; // Interval in milliseconds between each batch
        let index = 0;
        let poiCount = 0; // Counter for POIs
        // updatePOICounter(poiCount);

        const processBatch = () => {
          while (index < features.length) { // while loop: continuous & iterative processing
            const batch = features.slice(index, index + batchSize); // by subset
            batch.forEach(feature => {
              const poi = {
                name: feature.attributes.NAME,
                latitude: feature.geometry.latitude,
                longitude: feature.geometry.longitude,
              };
              
              // Check if a POI with the same ID already exists (* Fix for duplicates)
              const existingPOI = document.getElementById(poi.name.replace(/\s+/g, '-').toLowerCase());
              if (existingPOI) {
                // console.log(`Skipping duplicate POI: ${poi.name}`);
                return; // Skip duplicate POIs
              }

              // Calculate distance between current location and POI
              const distance = calculateDistance(curLat, curLon, poi.latitude, poi.longitude);

              // Only draw POIs that are within the threshold distance
              if (distance <= thresholdDistance) {
                const poiEntity = createPOIEntity(poi, curLat, curLon);
                document.querySelector('a-scene').appendChild(poiEntity);
                poiCount++; // Increment POI counter
                updatePOICounter(poiCount);
              }
            });
            
            index += batchSize;

            if (index >= features.length) {
              document.getElementById('loadingIndicator').style.display = 'none'; // Hide the loading indicator once all data is processed
              break;
            }
          }
        };

        setTimeout(processBatch, interval); // call to processBatch

      })
      .catch(function(error) {
        console.error('Error loading FeatureLayer data:', error); // Debugging log
        document.getElementById("debug-overlay").innerText = "Error loading POI data.";
        document.getElementById('loadingIndicator').style.display = 'none'; // Hide the loading indicator in case of an error
      });
  });
}

function updateDisplay() { // This is where AR Screen gets refreshed
  // Clear existing POIs
  const existingPOIs = document.querySelectorAll('[gps-entity-place]');
  existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));
  updateOverlayText();
  if (isUSStateAssigned)  // Prevent not calling the function when there is no default US state 
    {
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
        gpsReady = true; 

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
    "esri/widgets/Track", // Track widget is being deprecated
    "esri/WebScene",
    "esri/layers/FeatureLayer",
    "esri/views/SceneView",
    "esri/widgets/Legend",
    "esri/widgets/Search",
    "esri/widgets/Expand",
    "esri/rest/locator",
    "esri/geometry/Point"
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
    // Create a new WebScene programmatically
    const webscene = new WebScene({
    basemap: "topo-vector", // Use the "Outdoor" basemap
    ground: "world-elevation" // Enable elevation for 3D effects
  });

    view = new SceneView({
      container: "viewDiv",
      map: webscene,
      environment: {
        lighting: {
          directShadowsEnabled: true
        }
      },
      camera: {
        position: {
          latitude: 21.3069, // near Honolulu, HI
          longitude: -157.8583, // near Honolulu, HI
          z: 5000 // Height in meters (500m is near street level)
        },
        tilt: 60, // Tilt the camera 
        heading: 0 // Initial heading (0 degrees)
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

      // Update the blue dot in the WebScene
      view.goTo({
        position: {
          latitude: point.latitude,
          longitude: point.longitude,
          z: view.camera.position.z // Maintain the current zoom level
        }
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

//** Compass Heading *//
// Update Heading Function
function updateHeading(event) {
  if (event.alpha !== null) {
    
    motionReady = true; // Set motionReady to true when heading is updated

    // Calculate the raw heading
    const rawHeading = 360 - event.alpha; // Convert to compass heading
    console.log("Raw Heading:", rawHeading); // Debugging log

    // Apply smoothing to reduce jitter
    if (smoothedHeading === null) {
      smoothedHeading = rawHeading; // Initialize smoothedHeading
    } else {
      smoothedHeading = smoothedHeading + smoothingFactor * (rawHeading - smoothedHeading); // Apply smoothing
    }
    
    console.log("Smoothed Heading:", smoothedHeading); // Debugging log

    // Track if GPS location has moved significantly
    const gpsLat = useFilteredData ? filteredLat : lat;
    const gpsLon = useFilteredData ? filteredLon : lon;
    const gpsSignificantChange =
      previousLat === null || previousLon === null || // First time
      Math.abs(gpsLat - previousLat) > changeThreshold || // Significant latitude change
      Math.abs(gpsLon - previousLon) > changeThreshold; // Significant longitude change

    // Check if the heading change exceeds the threshold
    const headingSignificantChange =
    previousHeading === null || Math.abs(smoothedHeading - previousHeading) > headingChangeThreshold;    

    // Trigger `updateDisplay` only if it's the first heading or there is a significant change in both
    if (previousHeading === null || (headingSignificantChange && gpsSignificantChange)) {
      heading = smoothedHeading;
      console.log(
        `Significant change detected. GPS Change: ${gpsSignificantChange}, Heading Change: ${headingSignificantChange}`
      );
      updateDisplay(); // Trigger updateDisplay
     
      // Update previous values
      previousHeading = smoothedHeading;
      previousLat = gpsLat;
      previousLon = gpsLon;
    }
  } else {
    // Handle cases where compass data is unavailable
    debugOverlay.innerHTML = "No compass data available.";
    console.error("Compass data is unavailable.");
  }
  updateOverlayText();
}

//* Handling Magnetic Interference: Check if the compass accuracy is acceptable
function isCompassReliable(event) {
  if (event.webkitCompassAccuracy && event.webkitCompassAccuracy > 10) {
    console.warn("Compass accuracy is low. Falling back to GPS heading.");
    return false;
  }
  return true;
}

// Update Debug overlay when gps and motion data are available
function updateOverlayText() {
  // debugOverlay.innerHTML = ""; // Clear previous overlay text;

  const gpsLat = useFilteredData ? filteredLat : lat;
  const gpsLon = useFilteredData ? filteredLon : lon;

  let overlayText;

  if (gpsReady && motionReady) {
    // Both GPS and motion data are ready
    overlayText = `
      Heading: ${smoothedHeading !== null ? smoothedHeading.toFixed(2) : "N/A"}°,  
      WebScene Heading: ${view.camera.heading.toFixed(2)}°<br>
      Lat: ${gpsLat !== null ? gpsLat.toFixed(10) : "N/A"}, 
      Lon: ${gpsLon !== null ? gpsLon.toFixed(10) : "N/A"}
    `;
    debugOverlay.innerHTML = overlayText;
  } else if (gpsReady) {
    // Only GPS data is ready
    overlayText = `
      Waiting for motion data...<br>
      Lat: ${gpsLat !== null ? gpsLat.toFixed(10) : "N/A"}, 
      Lon: ${gpsLon !== null ? gpsLon.toFixed(10) : "N/A"}<br>
    `;
    debugOverlay.innerHTML = overlayText;
  } else if (motionReady) {
    // Only motion data is ready
    overlayText = `
      Heading: ${smoothedHeading !== null ? smoothedHeading.toFixed(2) : "N/A"}°,  
      WebScene Heading: ${view.camera.heading.toFixed(2)}°<br>
      Waiting for GPS data...
    `;
    debugOverlay.innerHTML = overlayText;
  } else {
    // Neither GPS nor motion data is ready
    debugOverlay.innerHTML = "Waiting for GPS and motion data...";
  }
}

// Listen for device orientation events (compass)
document.addEventListener("DOMContentLoaded", () => {
  // On some devices, the deviceorientationabsolute event provides more accurate heading data.
  if ("ondeviceorientationabsolute" in window) {
    window.addEventListener("deviceorientationabsolute", updateHeading, true);
  } else {
    window.addEventListener("deviceorientation", updateHeading, true);
  }
});

// * ((Not used)) Request motion and orientation permissions on iOS
// function requestIOSPermissions() {
//   debugOverlay.innerHTML = "Requesting motion permission...";

//   if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
//     DeviceMotionEvent.requestPermission()
//       .then((response) => {
//         if (response === "granted") {
//           console.log("Motion permission granted.");
//           window.addEventListener("deviceorientation", updateHeading, true);
//           debugOverlay.innerHTML = "Motion permission granted.";
//           updateOverlayText();// Refresh the debugOverlay
//         } else {
//           console.error("Motion permission denied.");
//           debugOverlay.innerHTML = "Motion permission denied.";
//         }
//       })
//       .catch((error) => {
//         console.error("Error requesting motion permission:", error);
//         debugOverlay.innerHTML = "Error requesting motion permission.";
//       });
//   } else {
//     console.log("DeviceMotionEvent.requestPermission not supported.");
//     window.addEventListener("deviceorientation", updateHeading, true);
//     updateOverlayText();// Refresh the debugOverlay for non-iOS devices
//   }
// }

// * (Not used) Fix for iOS devices: Request permission for motion and orientation events
// document.addEventListener("DOMContentLoaded", () => {
//   const requestPermissionButton = document.getElementById("requestPermissionButton");

//   // Check if the user is on an iOS device
//   const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

//   if (isIOS) {
//     // Show the button for iOS devices
//     requestPermissionButton.style.display = "block";

//     // Add a click event listener to the button
//     requestPermissionButton.addEventListener("click", () => {
//       requestIOSPermissions(); // Call the function to request permissions
//       requestPermissionButton.style.display = "none"; // Hide the button after it's clicked
//     });
//   } else {
//     // Hide the button for non-iOS devices
//     requestPermissionButton.style.display = "none";
//   }
// });

// Function to toggle the data source
function toggleDataSource() {
  useFilteredData = !useFilteredData;
  document.getElementById('toggleGPSButton').textContent = useFilteredData ? 'Use Raw GPS' : 'Use Filtered GPS';
  console.log("useFilteredData: ", useFilteredData);
}

// Add event listener to the toggleGPS button
document.getElementById('toggleGPSButton').addEventListener('click', toggleDataSource);

// Add event listener to the slider to update thresholdDistance
document.getElementById('distanceSlider').addEventListener('input', function(event) {
  thresholdDistance = event.target.value;
  updateDistanceValue(thresholdDistance);
  updateDisplay(); //Update Display with new threshold
});

function updateDistanceValue(distance) {
  document.getElementById('distanceValue').textContent = `${distance} m `;
}

function updatePOICounter(poiCount) {
  document.getElementById('poi-counter').textContent = `(${poiCount})`;
}

// Start GPS updates 
updateGPS();
