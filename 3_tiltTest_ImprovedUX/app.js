window.module= {}; // Fix for KalmanJS

// Temp API Key for Location Services (inc. Geocoding): Expires May 31 2025
const esriConfig = {
  apiKey: "AAPTxy8BH1VEsoebNVZXo8HurLRYsIcdvKKWcuOv2pgkoPa83X5203hTMNmkIserOf2KoTOvhIDCRTfPBVVZFGSqJB38gyWw0suv8ZEot3UdGycvb_MOTYUopiDmL5voe7DPXDb4e4ueUJI0tj2eY0myefU2NosMLnZC_IpblBRwnNE6IS4x0ApqghVfdUisrVA-Fr5U8LOym_Tuh70OdUFVxmCJXXaN4pbEe6VWVpfzZVs.AT1_CiCOhLmU" 
};

const featureLayerUrl = "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Locations_Current/FeatureServer/" ;

let webscene; // Declare globally
// let view; // Declare globally *Fix for iOS WebScene not responsive to heading change
let pointsLayer; // Declare globally

const infoText = document.getElementById("info-text");
const debugOverlay = document.getElementById("debug-overlay");

const compassButton = document.getElementById('compassButton');
const toggleViewButton = document.getElementById('toggleView'); // Get the toggleView button

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

//Tracking Compass Heading in updateOrientation
let heading = 0;
let smoothedHeading = null; // Variable to store the smoothed heading
const smoothingFactor = 0.2; // Weight given for smoothing (0 < sFactor <= 1). Lower val = mo' smoothing; slower response
const headingChangeThreshold = 5; // Minimum change in degrees to trigger an update
let previousHeading = null; // Store the previous heading value

// Tracking Motion Sensor Data
// let tilting, rolling; // Pitch & Roll from Motion Sensor
let smoothedTilting = null; // Variable to store the smoothed tilting value
let smoothedRolling = null; // Variable to store the smoothed rolling value
let previousTilting = null; // Store the previous tilting value 
let previousRolling = null; // Store the previous rolling value
const tiltingChangeThreshold = 2;
const rollingChangeThreshold = 2; // Minimum change in degrees to trigger an update 

let compensatedHeading = null;
let compensatedRolling = null;
let compensatedTilting = null;

let isCompassActive = false; // Tracks whether the WebScene should follow the device's heading
const defaultHeading = 0; // Default heading when the compass is toggled off

let isInitialLocationAcquired = false; // Flag to track if the initial location is acquired

// Kalman Filter for smoothing sensor data
let kalmanLat, kalmanLon; // For GPS data

// Check if the brower sensors are ready 
let motionReady = false;
let gpsReady = false;

let thresholdDistance = 3000; // Default value (Dynamic via Slider)

let currentlyExpandedPOI = null;
let userInteracted = false; // Tracks if the user has interacted with a POI

// Temporarily using an absolute path to get away issues in public repo
const symbol_HI = 'https://inhye-lee.github.io/_/labels/Museum.png';
const symbol_CA = 'https://inhye-lee.github.io/_/labels/Hotel.png';
const symbol_NY = 'https://inhye-lee.github.io/_/labels/Church.png';
const symbol_default = 'https://inhye-lee.github.io/_/labels/Park.png';

let activePopUpPOI = null; // Global variable to track the currently active POI with a pop-up

  // Add fake POIs for testing scaling method
const distantSigns = [
  {
    name: "(300m East)",
    latitude: curLat,
    longitude: curLon + (300 / (111320 * Math.cos(curLat * Math.PI / 180))) // 300 meters east
  },
  {
    name: "(500m North-East)",
    latitude: curLat + (500 / 111320), // 500 meters north
    longitude: curLon + (500 / (111320 * Math.cos(curLat * Math.PI / 180))) // 500 meters east
  },
  {
    name: "(750m South-West)",
    latitude: curLat - (750 / 111320), // 750 meters south
    longitude: curLon - (750 / (111320 * Math.cos(curLat * Math.PI / 180))) // 750 meters west
  },
  {
    name: "(1000m North)",
    latitude: curLat + (1000 / 111320), // 1000 meters north
    longitude: curLon // Same longitude
  },
  {
    name: "(1300m South-East)",
    latitude: curLat - (1300 / 111320), // 1300 meters south
    longitude: curLon + (1300 / (111320 * Math.cos(curLat * Math.PI / 180))) // 1300 meters east
  },
  {
    name: "(1500m West)",
    latitude: curLat,
    longitude: curLon - (1500 / (111320 * Math.cos(curLat * Math.PI / 180))) // 1500 meters west
  },
  {
    name: "(2000m North-West)",
    latitude: curLat + (2000 / 111320), // 2000 meters north
    longitude: curLon - (2000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 2000 meters west
  },
  {
    name: "(2200m South)",
    latitude: curLat - (2200 / 111320), // 2200 meters south
    longitude: curLon // Same longitude
  },
  {
    name: "(2500m East)",
    latitude: curLat,
    longitude: curLon + (2500 / (111320 * Math.cos(curLat * Math.PI / 180))) // 2500 meters east
  },
  {
    name: "(3000m North-East)",
    latitude: curLat + (3000 / 111320), // 3000 meters north
    longitude: curLon + (3000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 3000 meters east
  },
  {
    name: "(5000m South-West)",
    latitude: curLat - (5000 / 111320), // 5000 meters south
    longitude: curLon - (5000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 5000 meters west
  },
  {
    name: "(7000m North-West)",
    latitude: curLat + (7000 / 111320), // 7000 meters north
    longitude: curLon - (7000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 7000 meters west
  },
  {
    name: "(East)",
    latitude: curLat, // Same latitude
    longitude: curLon + (250 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 250 meters east
  },
  {
    name: "(North East)",
    latitude: curLat + (100 / 111320), // Approximate 100 meters north
    longitude: curLon + (100 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 100 meters east
  },
  {
    name: "(South West)",
    latitude: curLat - (50 / 111320), // Approximate 50 meters south
    longitude: curLon - (50 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 50 meters west
  },
  {
    name: "(South West)",
    latitude: curLat - (25 / 111320), // Approximate 25 meters south
    longitude: curLon - (25 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 25 meters 
  },
  {
    name: "(North East)",
    latitude: curLat + (5 / 111320), // Approximate 5 meters north
    longitude: curLon + (5 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 5 meters
  },
  {
    name: "(South East)",
    latitude: curLat - (1 / 111320), // Approximate 1 meters south
    longitude: curLon + (1 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 1 meters 
  }
];

// Intialize Kalman Filters for smoothing sensor data
function initializeKalmanFilters() {
  import('https://cdn.jsdelivr.net/npm/kalmanjs@1.1.0/lib/kalman.min.js').then((_) => {

    const KalmanFilter = module.exports; // access the default export
    // Initialize Kalman filters for GPS data
    kalmanLat = new KalmanFilter({ R: 0.01, Q: 3 });
    kalmanLon = new KalmanFilter({ R: 0.01, Q: 3 });
  }).catch((error) => { 
    console.error("Error loading KalmanJS:", error);
  });
}

initializeKalmanFilters();

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

// scaling function to compensate the distance
function updateScale(distance) {
  let updatedScale; 
  let baseScale = 15; // Scaling that works for mid-range objects
  // Define the reference distance to clamp size for short & far
  const farThreshold = 2000; // (Based on Testing)
  const nearThreshold = 200; //

   // Case 1: For distances greater than farThreshold
  if (distance > farThreshold) { // keep it at base size
    updatedScale = baseScale * 10; // Scale up by a factor of 10 for far distances
  }  // Case 2: For distances between short and far
  else if (distance <= farThreshold) {
    const scaleFactor = distance * 0.005; // Adjust scale for better scaling effect
    updatedScale = baseScale * scaleFactor; // A single scale used for linear-proportional scaling 
  }  // Case 3: Handle invalid distances (e.g., 0 or negative)
  else {
    console.warn("Distance is zero or negative. Returning base scale.");
    updatedScale = baseScale; 
  }
  return updatedScale;
}

// Text Scaling to compensate the differences
function updateTextScale(distance) {
  let updatedScale; 
  let baseScale = 4.0; // Scaling that works for mid-range objects
  // Define the reference distance to clamp size for short & far
  const farThreshold = 2000; // (Based on Testing)
  const nearThreshold = 200; // Base Distance
  const scaleFactor = 0.5; // Adjust scale

  updatedScale = baseScale;
  // Case 1: For distances greater than farThreshold
  if (distance > farThreshold) { // keep it at base size
    updatedScale = baseScale * (distance/farThreshold) * scaleFactor;   // OutPut same size 
    }  // Case 2: For distances between short and far
    else if (distance <= farThreshold) {
      updatedScale = baseScale * scaleFactor;
    }  // Case 3: Handle invalid distances (e.g., 0 or negative)
    else {
    //   console.warn("Distance is zero or negative. Returning base scale.");
      updatedScale = baseScale; 
    }
  return updatedScale;
}

//Custom Placement
function createPOIEntity(poi, userLatitude, userLongitude) {
  // Distance calculation & Scaling
  const distance = calculateDistance(userLatitude, userLongitude, poi.latitude, poi.longitude);
  const entityScale = updateScale(distance); // Scale based on distance (Dynamic with Clamping )
  const textParentScale = updateTextScale(distance); // Scale based on distance (Dynamic with Clamping )
  
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
  let lineHeight = imageHeight * 0.75*textParentScale ; 
  let lineYOffset = imageHeight * 0.75 ; // Deducted
  let imageYOffset = lineHeight/2 - imageHeight/4- 0.1;
  let textYOffset = (imageYOffset + imageHeight/2)+0.5*textParentScale;//offset
  let connectingLineOffset = imageYOffset +imageHeight/2;

  // (0) Entity - Create a new entity for the POI
  const entity = document.createElement('a-entity');
  entity.setAttribute('id', poi.name.replace(/\s+/g, '-').toLowerCase());
  entity.setAttribute('position', `0 0 0`); // Entity cannot be translated (Child elements have to be)
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

  // Reverse scale adds an identical offset to the end user
  // Limit textYOffset to ensure it fits within the screen
  textParent.setAttribute('position', `0 ${textYOffset} 0`);

  // Format the distance (e.g., "100 m" or "1.2 km")
  const formattedDistance = distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${Math.round(distance)} m`;

  // Combine POI name, distance, and screen size
  const fullText = `${poi.name} (${formattedDistance})`;

  // Check if text already exists (*Fix for duplicate error)
  const existingText = textParent.querySelector('.poi-text');
  if (!existingText) {
    const text = document.createElement('a-text');
    text.classList.add('poi-text'); // Add a class to identify the text

    text.setAttribute('text', {
      value: fullText || 'Default Text',
      color: 'white',
      align: 'center',
      wrapCount: 57, // Preventing Wrapping. Optional: Adjust the number of characters per line
      font: 'roboto', // Optional: Use a specific font
      baseline: 'center'
    });

    text.setAttribute('position', `0 0 0`);
    text.setAttribute('rotation', '0 0 0'); // Adjust rotation for diagonal display
    text.setAttribute('text-background', {
      color: 'black',
      padding: 0.2,
      opacity: 0.9
    }); // Apply the custom component
    
    textParent.appendChild(text);
  }

  // Append the text parent to the entity
  textParent.setAttribute('visible', false); // Hide the text by default
  entity.appendChild(textParent);

  // (4) Connecting Line
  const connectingLine = createLine(entity, { x: 0, y: textYOffset-0.25, z: 0 }, { x: 0, y: connectingLineOffset, z: 0 }, 'white');
  connectingLine.setAttribute('visible', false); // Hide the line by default

  // Apply reverse scaling based on Distance
  textParent.setAttribute('scale', `${textParentScale} ${textParentScale} ${textParentScale}`);
  textParent.setAttribute('position', `0 ${textYOffset} 0`); // Position the text parent on top of the line

  entity.setAttribute('gps-entity-place', `latitude: ${poi.latitude}; longitude: ${poi.longitude};`);

  // Apply the pre-calculated entity scale to the entity
  entity.setAttribute('scale', `${entityScale} ${entityScale} ${entityScale}`); 

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

// AFRAME.registerComponent('raycaster-handler', {
//   init: function () {
//     const raycasterEl = document.querySelector('#raycaster-camera');
//     console.log('raycasterEl', raycasterEl);

//     raycasterEl.addEventListener('raycaster-intersected', (evt) => {
//       console.log('Raycaster intersected with:', evt.detail.el);
//     });

//     raycasterEl.addEventListener('raycaster-intersected-cleared', (evt) => {
//       console.log('Raycaster cleared for:', evt.detail.el);
//     });

//     raycasterEl.addEventListener('click', (evt) => {
//       const intersections = raycasterEl.components.raycaster.intersectedEls;
//       if (intersections.length > 0) {
//         console.log('Clicked on:', intersections[0]);
//       }
//     });
//   }
// });

// // * Show the title of the POI when it is centered
// AFRAME.registerComponent('toggle-title', {
//   schema: {
//     full: { type: 'string', default: '' }, // Full text for the POI
//     threshold: { type: 'number', default: THREE.MathUtils.degToRad(5) } // Threshold in radians (5 degrees by default)
//   },

//   init: function () {
//     const el = this.el; // The current POI
//     const camera = document.querySelector('[gps-camera]').object3D; // Get the camera's 3D object

//     this.camera = camera;

//     // Get the text element and connecting line inside the POI
//     const textEntity = el.querySelector('.poi-text');
//     const textParent = textEntity ? textEntity.parentNode : null;
//     const connectingLine = el.querySelector('.connecting-line');

//     // Initialize the text and connecting line visibility
//     if (textParent) {
//       textParent.setAttribute('visible', false); // Hide the text by default
//     }
//     if (connectingLine) {
//       connectingLine.setAttribute('visible', false); // Hide the connecting line by default
//     }

//     this.textParent = textParent;
//     this.connectingLine = connectingLine;

//     // State to track animation
//     this.isFading = false; // Tracks if the POI is currently fading in or out
//   },

//   tick: function () {
//     const camera = this.camera;
//     const threshold = this.data.threshold;

//     // Get all POIs
//     const pois = document.querySelectorAll('.clickable');
//     let smallestAngle = Infinity;

//     pois.forEach((poi) => {
//       const position = new THREE.Vector3();
//       poi.object3D.getWorldPosition(position);

//       // Calculate the direction vector from the camera to the POI
//       const directionToPOI = new THREE.Vector3();
//       directionToPOI.subVectors(position, camera.position).normalize();

//       // Get the camera's forward direction
//       const cameraDirection = new THREE.Vector3();
//       camera.getWorldDirection(cameraDirection);

//       // Calculate the horizontal angle between the camera's forward direction and the POI
//       const horizontalAngle = Math.atan2(directionToPOI.x, directionToPOI.z);
//       const cameraHorizontalAngle = Math.atan2(cameraDirection.x, cameraDirection.z);

//       // Calculate the absolute difference between the angles
//       const angleDifference = Math.abs(
//         ((horizontalAngle - cameraHorizontalAngle + Math.PI) % (2 * Math.PI))
//       );

//       // Check if this POI is closer to the center than the current closest POI
//       if (angleDifference < smallestAngle && angleDifference <= threshold) {
//         smallestAngle = angleDifference;
//         centeredPOI = poi;
//       }
//     });

//     // Update visibility for the current POI
//     if (this.el === centeredPOI) {
//       this.fadeIn(); // Always show the title for the centered POI
//     } else {
//       this.fadeOut(); // Hide the title if the POI is not centered
//     }
//   },

//   fadeIn: function () {
//     if (this.isFading) return; // Prevent overlapping animations
//     this.isFading = true; // Mark as fading

//     if (this.textParent) {
//       const textElement = this.textParent.querySelector('.poi-text'); // Get the text element
//       const backgroundElement = textElement.querySelector('a-plane'); // Get the background element

//       if (textElement) {
//         textElement.setAttribute('visible', true); // Make the text visible
//         textElement.setAttribute('animation__fadein', {
//           property: 'opacity',
//           to: 1,
//           dur: 500, // Duration of fade-in (500ms)
//           easing: 'easeInOutQuad'
//         });
//       }

//       if (backgroundElement) {
//         backgroundElement.setAttribute('visible', true); // Make the background visible
//         backgroundElement.setAttribute('animation__fadein', {
//           property: 'opacity',
//           to: 0.9, // Target opacity for the background
//           dur: 500, // Duration of fade-in (500ms)
//           easing: 'easeInOutQuad'
//         });
//       }

//       this.textParent.setAttribute('visible', true); // Ensure the parent is visible
//     }

//     if (this.connectingLine) {
//       this.connectingLine.setAttribute('visible', true); // Make the connecting line visible
//       this.connectingLine.setAttribute('animation__fadein', {
//         property: 'opacity',
//         to: 1,
//         dur: 500, // Duration of fade-in (500ms)
//         easing: 'easeInOutQuad'
//       });
//     }

//     setTimeout(() => {
//       this.isFading = false; // Reset fading state after fade-in
//     }, 500);
//   },

//   fadeOut: function () {
//     if (this.isFading) return; // Prevent overlapping animations
//     this.isFading = true; // Mark as fading

//     if (this.textParent) {
//       const textElement = this.textParent.querySelector('.poi-text'); // Get the text element
//       const backgroundElement = textElement.querySelector('a-plane'); // Get the background element

//       if (textElement) {
//         textElement.setAttribute('animation__fadeout', {
//           property: 'opacity',
//           to: 0,
//           dur: 500, // Duration of fade-out (500ms)
//           easing: 'easeInOutQuad'
//         });
//         setTimeout(() => {
//           textElement.setAttribute('visible', false); // Hide the text after fade-out
//         }, 500); // Match the duration of the fade-out animation
//       }

//       if (backgroundElement) {
//         backgroundElement.setAttribute('animation__fadeout', {
//           property: 'opacity',
//           to: 0,
//           dur: 500, // Duration of fade-out (500ms)
//           easing: 'easeInOutQuad'
//         });
//         setTimeout(() => {
//           backgroundElement.setAttribute('visible', false); // Hide the background after fade-out
//         }, 500); // Match the duration of the fade-out animation
//       }

//       this.textParent.setAttribute('visible', false); // Hide the parent container
//     }

//     if (this.connectingLine) {
//       this.connectingLine.setAttribute('animation__fadeout', {
//         property: 'opacity',
//         to: 0,
//         dur: 0, // * Fix for lingering line issue
//         easing: 'easeInOutQuad'
//       });
//       setTimeout(() => {
//         this.connectingLine.setAttribute('visible', false); // Hide the connecting line after fade-out
//       }, 0); //  * Fix for lingering line issue
//     }

//     setTimeout(() => {
//       this.isFading = false; // Reset fading state after fade-out
//     }, 500);
//   }
// });

// AFRAME.registerComponent('text-background', {
//   schema: {
//     color: { type: 'string', default: 'black' }, // Background color
//     padding: { type: 'number', default: 0.2 },  // Padding around the text
//     opacity: { type: 'number', default: 0.9 }   // Background opacity
//   },

//   init: function () {
//     const textEl = this.el; // The entity with the text
//     const backgroundEl = document.createElement('a-plane'); // Background plane

//     // Set initial background properties
//     backgroundEl.setAttribute('color', this.data.color);
//     backgroundEl.setAttribute('opacity', this.data.opacity);

//     // Append the background plane as a child of the text entity
//     textEl.appendChild(backgroundEl);

//     // Adjust the background size dynamically after the text is loaded
//     textEl.addEventListener('loaded', () => {
//       this.updateBackgroundSize(textEl, backgroundEl);
//     });

//     // Adjust the background size dynamically when the text changes
//     textEl.addEventListener('componentchanged', (event) => {
//       if (event.detail.name === 'text') {
//         this.updateBackgroundSize(textEl, backgroundEl);
//       }
//     });
//   },

//   updateBackgroundSize: function (textEl, backgroundEl) {
//     // Get the computed dimensions of the text
//     const textData = textEl.getAttribute('text');
//     const textValue = textData.value || '';
//     const charWidth = 0.14; // Approximate character width
//     const textWidth = textValue.length * charWidth || 2; // Calculate width based on character count
//     const textHeight = textData.height || charWidth; // Default height if not set
//     const padding = this.data.padding;

//     // console.log("Text Width: ", textWidth, "Text Height: ", textHeight);
//     // Set the background size based on the text dimensions and padding
//     backgroundEl.setAttribute('width', textWidth + padding * 2);
//     backgroundEl.setAttribute('height', textHeight + padding);

//     // Align the background to the left using offsetX
//     // const offsetX = (textWidth / 2);
//     const offsetX =0; 
//     backgroundEl.setAttribute('position', `${offsetX} 0 -2.5`); // Adjust position to center the background; Z-flicker fix
//   }
// });
  
//  Query the FeatureLayer based on the selected State (Old Code)
function loadPOIData() {
  console.log("loadPOIData is called");
  document.getElementById('loadingIndicator').style.display = 'block';
  require([
    "esri/layers/FeatureLayer"
  ], function(FeatureLayer) {
    console.log("FeatureLayer loaded successfully"); // Debugging log

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
  console.log("updateDisplay is called");
  // Clear existing POIs
  const existingPOIs = document.querySelectorAll('[gps-entity-place]');
  existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));

  updateOverlayText();
  if (isUSStateAssigned)  // Prevent not calling the function when there is no default US state 
    {
    loadPOIData();
  }




  // Add fake POIs for testing scaling method
  // distantSigns.forEach(distantSign => {
  //   const distantSignEntity = createPOIEntity(distantSign, curLat, curLon);
  //   document.querySelector('a-scene').appendChild(distantSignEntity);
  // });
  
}

function updateGPS() { 


  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        // Values from GPS Hardware
        lat = position.coords.latitude;
        lon = position.coords.longitude; 
        gpsReady = true; 




        // import('https://cdn.jsdelivr.net/npm/kalmanjs@1.1.0/lib/kalman.min.js').then(_ => {
        //   // console.log(module.exports);
        //   const KalmanFilter = module.exports;
          // Initialize Kalman filters for latitude and longitude (Noise Reduction)
          // const kalmanLat = new KalmanFilter({ R: 0.01, Q: 3 });
          // const kalmanLon = new KalmanFilter({ R: 0.01, Q: 3 });

          // Apply Kalman filter to the raw GPS values
          filteredLat = kalmanLat.filter(lat);
          filteredLon = kalmanLon.filter(lon);
        // });
     
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
        debugOverlay.innerHTML = `GPS Error: ${error.message}`;

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
    "esri/layers/FeatureLayer",
  ], (
    FeatureLayer,
  ) => {
    // References to the map components in index.html
    webscene = document.querySelector("arcgis-scene");
    const track = document.getElementById("track");
    const legendExpand = document.getElementById("legend-expand");
    const legend = document.getElementById("legend"); 

   //********************** Set up a Web Scene **********************//
    Object.assign(webscene, {
      basemap: "topo-vector", // Use the "Topographic" basemap
      ground: "world-elevation", // Enable elevation for 3D effects
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
        tilt: 0, // Tilt the camera 
        heading: 90  // Initial heading (0 degrees)
      }
    })

    //********************** Symbols, Points Rendering, Points Layer  **********************//
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

    pointsLayer = new FeatureLayer({
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

    //**********************  Listen for the map's view to be ready
    webscene.addEventListener("arcgisViewReadyChange", () => {
      //**********************  Add PointsLayer to the map
      webscene.map.add(pointsLayer); // webscene.map is the map object

      //********************** Legend with State Info **********************//
      legendExpand.expanded = false;
      legend.layerInfos = [
        {
          layer: pointsLayer,
          title: "Shelter Locations by States"
        }
      ];

      // Wait for the Legend component to render, then add a stateSelect Filter
      setTimeout(() => {
        const legendContainer = document.querySelector(".esri-legend"); // esri-expand__popover-content
        if (legendContainer) {
          // Create a div
          const filterDiv = document.createElement("div");
          filterDiv.id = "filterDiv";
          filterDiv.innerHTML = `<label for="stateSelect">View by State:</label>`;
          // Create a select Element
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
          //Append select to div
          filterDiv.appendChild(stateSelect);

          // Add it to the legendContainer (Hard-coded - May not be the best way?)
          legendContainer.appendChild(filterDiv);
          if (stateSelect && stateSelect.innerHTML.trim !== "") {
            // Get Current Location and State to update Filter
            getCurrentLocationAndState();
          } else {
            console.error("State Select is empty.");
          }
          
        } else {
          console.error("Legend container not found.");
        }
      }, 1000); // Delay to ensure the Legend widget is rendered

      //********************** Toggle between Bird eye & Top Views  **********************//
      // if (!isCompassActive) {
        toggleViewButton.addEventListener("click", () => {
          webscene.view.goTo(webscene.view.camera.tilt < 1 ? { tilt: 80 } : { tilt: 0 }).catch((error) => {
            if (error.name !== "AbortError") {
              console.error(error);
            }
          });
        });
      // } //
     
    }); // end of event listener
     
  }
)}

//********************** Update State Filter Function **********************//
function updateStateFilter() {
  selectedState = stateSelect.value; // Update selectedState global variable from dropDown
  console.log("selectedState in updateStateFilter", selectedState);
  // dynamically update the map and POIs whenever the user selects a different state
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

//********************** Get Current State from geolocation API & Locator **********************//
function getCurrentLocationAndState() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Reverse Geocoding to Get the State
        const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

        // Only assign default US state once
        if (!isUSStateAssigned) {
          require(["esri/rest/locator"], (locator) => {
            locator.locationToAddress(locatorUrl, {
              location: {
                x: longitude,
                y: latitude
              }
            })
              .then(function(response) {
                defaultUSState = response.attributes.RegionAbbr; // Get the state abbreviation
                console.log("US State from Location Tracking:", defaultUSState);

                // Update the selected state
                selectedState = defaultUSState;
                if (stateSelect) {
                  stateSelect.value = defaultUSState; // Update the dropdown
                }

                // Set the flag to true after assigning the state
                isUSStateAssigned = true;

                // Call updateStateFilter only after assigning defaultUSState
                updateStateFilter();
              })
              .catch(function(error) {
                console.error("Error in reverse geocoding:", error);
              });
          });
        } else {
          console.log("Default US state is already assigned:", defaultUSState);
        }

      },
      (error) => {
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          console.error("User denied the request for Geolocation.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.error("Position unavailable.");
        } else if (error.code === error.TIMEOUT) {
          console.error("Geolocation request timed out.");
        }
      },
      { enableHighAccuracy: true }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
  }
}



//** Compass Heading *//
// Update Heading Function
function updateOrientation(event) {
  //alpha - Z (Yaw) Range 0 to 360 - rotation on z axis: direction device faces relative to magnetic north
  //beta - Y (Pitch) Range -90 to 90 - rotation on y axis: tilting up/down
  //gamma - X (Roll) Range -180 to 180 - rotation on x axis (0: Device is flat on ground)
  if (event.alpha !== null) {
    motionReady = true; // Set motionReady to true when heading is updated

    // Calculate the raw heading
    const rawHeading = 360 - event.alpha; // Convert to compass heading (-> counterclockwise rotation)
    
    // Apply smoothing to Heading (yaw) 
    if (smoothedHeading === null) {
      smoothedHeading = rawHeading; // Initialize smoothedHeading
    } else {
      // Calculate the shortest angular difference
      let delta = rawHeading - smoothedHeading;
      delta %= 360; // Normalize to (-360, 360) range
      if (delta < -180) {
        delta += 360; // Normalize to (-180, 180] range
      } else if (delta > 180) {
        delta -= 360; // Normalize to (-180, 180] range
      }
      // Apply smoothing to the angular difference
      smoothedHeading += smoothingFactor * delta;
    }
    smoothedHeading = (smoothedHeading + 360) % 360;

   // Apply smoothing to tilting (pitch)
   if (smoothedTilting === null) {
      smoothedTilting = event.beta; // Initialize smoothedTilting
    } else {
       // Calculate the shortest angular difference for tilting
      let delta = event.beta - smoothedTilting;
      delta %= 360; // Normalize to (-360, 360) range
      if (delta < -180) {
        delta += 360; // Normalize to (-180, 180] range
      } else if (delta > 180) {
        delta -= 360; // Normalize to (-180, 180] range
      }
      // Apply smoothing to the angular difference
      smoothedTilting += smoothingFactor * delta;
    }
    // Normalize smoothedHeading to the range to fit vals into [0, 360)
    smoothedTilting = (smoothedTilting + 360) % 360;

    // Apply smoothing to rolling (roll)
    if (smoothedRolling === null) {
      smoothedRolling = event.gamma; // Initialize smoothedRolling
    } else {
      // Calculate the shortest angular difference for rolling
      let delta = event.gamma - smoothedRolling;

      // Handle the boundary transition between -90 and 90
      if (delta > 90) {
        delta -= 180; // Adjust for crossing the boundary
      } else if (delta < -90) {
        delta += 180; // Adjust for crossing the boundary
      }
      // Apply smoothing to the angular difference
      smoothedRolling += smoothingFactor * delta;
    }

    console.log(
      `Smoothed Values - Heading: ${smoothedHeading.toFixed(2)}, 
       Tilting: ${smoothedTilting.toFixed(2)}, 
       Rolling: ${smoothedRolling.toFixed(2)}`
    );

    // Compensating Values after visual test to use it for the 3d object in AR view
    const virtualHeading = smoothedHeading; // 
    const virtualTilting = -smoothedTilting; // (Y axis)
    const virtualRolling = smoothedRolling;

    // For WebScene Value Translation
    let correctedTilting;
    if (smoothedTilting > 0 && smoothedTilting <= 90) { // Within the usual viewing range
       correctedTilting = Math.min(90, Math.abs(virtualTilting));
    } else if (smoothedTilting > 90 && smoothedTilting <= 180) { // When phone's facing past upright point 
      correctedTilting = 90;  // tilted up
    } else if (smoothedTilting > 180 && smoothedTilting <= 270) { // When phone's facing more or less the ground
      correctedTilting =  0; // 2d View
    } else if (smoothedTilting > 270 && smoothedTilting <= 360) { // When phone's facing more or less the ground
      correctedTilting = Math.min(90, Math.abs(virtualTilting))- 90; // Clamp negative tilts
    }
    else { // if negative
      correctedTilting = Math.min(90, virtualTilting); // Clamp positive tilts
    }

    // Update the rotation of the phone representation - A little issue when rolling, otherwise fine
    const phoneRepresentation = document.querySelector('#phone-representation');
    if (phoneRepresentation) {
        phoneRepresentation.setAttribute( // x y z rotation
            'rotation',
            `${virtualTilting.toFixed(2)} 
            ${virtualRolling.toFixed(2)}  
            ${virtualHeading.toFixed(2)}` 
      );
    }

    // Track if GPS location has moved significantly
    const gpsLat = useFilteredData ? filteredLat : lat;
    const gpsLon = useFilteredData ? filteredLon : lon;
    const gpsSignificantChange =
      previousLat === null || previousLon === null || // First time
      Math.abs(gpsLat - previousLat) > changeThreshold || // Significant latitude change
      Math.abs(gpsLon - previousLon) > changeThreshold; // Significant longitude change

    // Update the WebScene camera heading
    // webcene.view.camera.heading is immutable
    // Detect platform (iOS or Android)
    const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "iOS"
    : /Android/i.test(navigator.userAgent)
    ? "Android"
    : "Other";
 
    // Apply platform-specific logic only when the compass is active 
    // * Fix - a single logic not working for all compasses 
    if (isCompassActive) {
      switch (platform) {
        case "iOS":
          console.log("Platform: iOS");
          webscene.view.goTo({
            position: {
              latitude: gpsLat,
              longitude: gpsLon,
              z: webscene.view.camera.position.z // Preserve the current altitude
            },
            heading: smoothedHeading,
            tilt: correctedTilting, 
          }, { animate: false }).catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Error updating WebScene heading on Android:", error);
            }
            console.log("WebScene camera heading updated:", smoothedHeading);
          });
          break;

        case "Android":
          console.log("Platform: Android");
          webscene.view.goTo({
            position: {
              latitude: gpsLat,
              longitude: gpsLon,
              z: webscene.view.camera.position.z // Preserve the current altitude
            },
            heading: smoothedHeading,
            tilt: correctedTilting, 
          }, { animate: false }).catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Error updating WebScene heading on Android:", error);
            }
          });
          break;

        default:
          console.log("Platform: Other");
          webscene.view.goTo({
            position: {
              latitude: gpsLat,
              longitude: gpsLon,
              z: webscene.view.camera.position.z // Preserve the current altitude
            },
            heading: smoothedHeading,
            tilt: correctedTilting, 
          }, { animate: false }).catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Error updating WebScene heading:", error);
            }
          });
          break;
      }
    } else {
      console.log("Compass is inactive. WebScene heading will not be updated.");
    }

    // Check if the heading change exceeds the threshold
    const headingSignificantChange =
    previousHeading === null || Math.abs(smoothedHeading - previousHeading) > headingChangeThreshold;    

    const tiltingSignificantChange =
    previousTilting === null || Math.abs(smoothedTilting - previousTilting) > tiltingChangeThreshold;

    const rollingSignificantChange =
    previousRolling === null || Math.abs(smoothedRolling - previousRolling) > rollingChangeThreshold;

    // Trigger `updateDisplay` only if it's the first heading or 
    // if there is a significant change in both heading and GPS location (gpsSignificantChange)
    if ((headingSignificantChange) ||
      (tiltingSignificantChange) ||
      (rollingSignificantChange)) {
      heading = smoothedHeading;
      console.log(
        `Significant change detected. 
        GPS Change: ${gpsSignificantChange}, 
        Heading Change: ${headingSignificantChange},
        Tilting Change: ${tiltingSignificantChange},
        Rolling Change: ${rollingSignificantChange}`
      );
      // updateDisplay(); // Trigger updateDisplay
     
      // Update previous values
      previousHeading = smoothedHeading;
      previousTilting = smoothedTilting;
      previousRolling = smoothedRolling;
      previousLat = gpsLat;
      previousLon = gpsLon;
    }
  } else {
    // Handle cases where compass data is unavailable
    debugOverlay.innerHTML = "No compass data available.";
    console.error("Compass data is unavailable.");
  }
  updateOverlayText();
  updateCompassButtonState(); // Location tracking state checked here continuously -> Impact on compass button visibility
}

function updateCompassButtonState() {
  const track = document.getElementById('track'); // Get the track component
  if (!track) {
    console.error("Track component not found.");
    return;
  }
  // Button State
  const updateCompassButton = (isVisible, isActive, text, opacity, backgroundColor) => {
    compassButton.style.display = isVisible ? 'block' : 'none';
    compassButton.classList.toggle('active', isActive);
    compassButton.textContent = text;
    compassButton.style.opacity = opacity;
    compassButton.style.backgroundColor = backgroundColor;
  };

  // Check if the initial location is acquired after the app begins
  if (isInitialLocationAcquired) { 
    if (track.tracking) {
      console.log("Track is enabled. State:", track.state);
      if (isCompassActive) {
        updateCompassButton(true, true, 'Compass On', '1', '#28a745'); // Show and activate the compass button
      } else {
        updateCompassButton(true, false, 'Compass Off', '1', '#979898'); // Show and deactivate the compass button
      }     
    } else {
      console.log("Track is inactive. State:", track.state);
      updateCompassButton(false, false, 'Compass Off', '0.75', '#979898'); // Hide and deactivate the compass button
      deactivateCompass();
    }
  } else { // If the initial location is not acquired YET
    if (track.tracking && track.state !== "waiting") {
      console.log("Initial location acquired. Track state:", track.state);
      isInitialLocationAcquired = true;
      if (isCompassActive) {
        updateCompassButton(true, true, 'Compass On', '1', '#28a745'); // Show and activate the compass button
      } else {
        updateCompassButton(true, false, 'Compass Off', '1', '#979898'); // Show and deactivate the compass button
      }
    } else {
      console.log("Waiting for initial location or track state is 'waiting'.");
      updateCompassButton(false, false, 'Compass Off', '0.75', '#979898'); // Hide and deactivate the compass button
      deactivateCompass();
    }
  }
}

function deactivateCompass() {
  if (isCompassActive) {
    isCompassActive = false; // Deactivate the compass
    console.log("Compass deactivated because tracking is inactive.");

    // Reset the WebScene to the default heading
    webscene.view.goTo({
      position: {
        latitude: webscene.view.camera.position.latitude,
        longitude: webscene.view.camera.position.longitude,
        z: webscene.view.camera.position.z // Preserve the current altitude
      },
      heading: defaultHeading
    }, { animate: false }).catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Error resetting WebScene heading:", error);
      }
    });
  }
}

// Calculate the offset based on the tilt angle
function calculateTiltOffset(tilt, altitude) {
  const tiltInRadians = tilt * (Math.PI / 180); // Convert tilt to radians
  const offsetDistance = Math.tan(tiltInRadians) * altitude; // Calculate the offset distance
  return offsetDistance; // Return the offset distance in meters
}

// Clamp altitude to a reasonable range (e.g., 0 to 10,000 meters)
function validateAltitude(altitude) {
  const minAltitude = 0; // Minimum altitude (ground level)
  const maxAltitude = 10000; // Maximum altitude (10 km)
  return Math.max(minAltitude, Math.min(maxAltitude, altitude));
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
      Tilting: ${smoothedTilting !== null ? smoothedTilting.toFixed(2) : "N/A"}°,
      Rolling: ${smoothedRolling !== null ? smoothedRolling.toFixed(2) : "N/A"}° <br>
      [MAP] Heading: ${webscene.view.camera.heading.toFixed(2)}°,
      Tilting: ${webscene.view.camera.tilt.toFixed(2)},
      Altitude: ${webscene.view.camera.position.z.toFixed(0)+ "m"}<br>
      Lat: ${gpsLat !== null ? gpsLat.toFixed(5) : "N/A"}, 
      Lon: ${gpsLon !== null ? gpsLon.toFixed(5) : "N/A"}
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
      Tilting: ${smoothedTilting !== null ? smoothedTilting.toFixed(2) : "N/A"}°,
      Rolling: ${smoothedRolling !== null ? smoothedRolling.toFixed(2) : "N/A"}°<br>
      [MAP] Heading: ${webscene.view.camera.heading.toFixed(2)}°,
      Tilting: ${webscene.view.camera.tilt.toFixed(2)},
      Altitude: ${webscene.view.camera.position.z.toFixed(0)+ "m"}<br>
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
    window.addEventListener("deviceorientationabsolute", updateOrientation, true);
  } else {
    window.addEventListener("deviceorientation", updateOrientation, true);
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
//           window.addEventListener("deviceorientation", updateOrientation, true);
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
//     window.addEventListener("deviceorientation", updateOrientation, true);
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


//** */ Custom Compass Button Toggle
document.getElementById('compassButton').addEventListener('click', () => {
  isCompassActive = !isCompassActive; // Toggle the compass state

  if (isCompassActive) {
    compassButton.classList.add('active'); // Add the active class
    compassButton.style.backgroundColor = '#28a745'; // Set color to green (Compass On)
    compassButton.style.opacity = '1';
    compassButton.textContent = 'Compass On'; // Update button text
    toggleViewButton.style.display = 'none'; // Hide the toggleView button (View tilt controlled by motion)
    console.log("Compass activated. WebScene will follow device heading.");
  } else {
    compassButton.classList.remove('active'); // Remove the active class
    compassButton.style.backgroundColor = '#979898'; // Set color to grey (Compass Off)
    compassButton.style.opacity = '0.75';
    compassButton.textContent = 'Compass Off'; // Update button text
    toggleViewButton.style.display = 'block'; // Show the toggleView button

    // Reset to the default heading
    webscene.view.goTo({
      position: {
        latitude: webscene.view.camera.position.latitude,
        longitude: webscene.view.camera.position.longitude,
        // latitude: curLat,
        // longitude: curLon,
        z: webscene.view.camera.position.z // Preserve the current altitude
      },
      heading: defaultHeading
    }, { animate: false }).catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Error resetting WebScene heading:", error);
      }
    });
    console.log("Compass deactivated. Reset to default heading:", defaultHeading);
  }
});

// Start GPS updates 
updateGPS();