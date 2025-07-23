window.module= {}; // Fix for KalmanJS

// Temp API Key for Location Services (inc. Geocoding): Expires Aug 31 2025
const esriConfig = {
  apiKey: "AAPTxy8BH1VEsoebNVZXo8HurLRYsIcdvKKWcuOv2pgkoPYQPHIiPFzH2xvjakDucHdviT3wm9Mw5GPU9J1-Sfs2s4gFQ3HKCtCY6XKqIyK1p1FraqO_JUQKNtvFJpATS849D9q_wBZL-ZL2-W48n7O6Gg_MHuR5mOA7U_FBEiugOISRU1yviYULDPksNJMnH5uZBmo-kkyP8ZRWniJZm-V26uW2fbmxc_T5zrlZiof9gt8.AT1_uo6j2J3A" 
};

const featureLayerUrl = "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Locations_Current/FeatureServer/" ;

let webscene; // Declare globally
let pointsRenderer; // Declare globally
let pointsLayer; // Declare globally
let pointHighlighter = null;

const infoText = document.getElementById("info-text");
const debugOverlay = document.getElementById("debug-overlay");

let isLegendExpanded = false; // Track whether the legend is expanded

const compassButton = document.getElementById('compassButton');
const toggleViewButton = document.getElementById('toggleView'); // Get the toggleView button
let trackButton = document.getElementById('track'); // Custom Track Button
let isTracking = false; // Track whether tracking is active. First OFF

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

//Tracking Compass Heading & other motion sensor data in updateOrientation
let heading = 0;
const smoothingFactor = 0.2; // Weight given for smoothing (0 < sFactor <= 1). Lower val = mo' smoothing; slower response

let smoothedHeading = null; // Variable to store the smoothed heading
let smoothedTilting = null; // Variable to store the smoothed tilting value
let smoothedRolling = null; // Variable to store the smoothed rolling value
let previousHeading = null; // Store the previous heading value
let previousTilting = null; // Store the previous tilting value 
let previousRolling = null; // Store the previous rolling value
const headingChangeThreshold = 5; // Minimum change in degrees to trigger an update
const tiltingChangeThreshold = 2;
const rollingChangeThreshold = 2; // Minimum change in degrees to trigger an update 

let compensatedHeading = null;
let compensatedRolling = null;
let compensatedTilting = null;

let isCompassActive = false; // Tracks whether the WebScene should follow the device's heading
const defaultHeading = 0; // Default heading when the compass is toggled off

let isInitialLocationAcquired = false; // Flag to track if the initial location is acquired
let isCompassCalibrated = false; // Flag to track if the compass is calibrated w/figure 8 motion in the beginning of the program

// Kalman Filter for smoothing sensor data
// let kalmanLat, kalmanLon; // For GPS data

// Check if the brower sensors are ready 
let motionReady = false;
let gpsReady = false;

let thresholdDistance = 3000; // Default value (Dynamic via Slider)

// Temporarily using an absolute path to get away issues in public repo
const symbol_HI = 'https://inhye-lee.github.io/_/labels/Museum.png';
const symbol_CA = 'https://inhye-lee.github.io/_/labels/Hotel.png';
const symbol_NY = 'https://inhye-lee.github.io/_/labels/Church.png';
const symbol_default = 'https://inhye-lee.github.io/_/labels/Park.png';

let selectedPOI = null; // Global variable to track the selected POI for pop-up
let compassOn_NoPOI = false; // Track if compass is on when no POI is selected
let compassOn_POI = false; // Track if compass is on when a POI is selected
let POIselectedFromMap = false; // Track if POI is selected from POI
let lastSelectedPOIId = null; // Track the last selected POI ID in case POI in AR gets refreshed

// (1) Haversine formula: Calculate distance between two coordinates 
// function calculateDistance(userLat, userLon, poiLat, poiLon) {
//   const R = 6378137; // Based on Equatorial Radius Now: 
//   // 6371e3.. Radius of the Earth in meters (*****HAVE TO BE REALLY ACCURATE) - 6 digits ...Earth is not a perfect sphere!
//   // There will be ...another method but too complicated for this ( < 11 meters...)
//   const p1 = userLat * Math.PI / 180;
//   const p2 = poiLat * Math.PI / 180;
//   const deltaLat = (poiLat - userLat) * Math.PI / 180;
//   const deltaLon = (poiLon - userLon) * Math.PI / 180;

//   const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
//             Math.cos(p1) * Math.cos(p2) *
//             Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   const distance = R * c;
//   return distance;
// }

// (2) Vincenty Formula (Ellipsoidal Model): More accurate than the Haversine formula
// Weakness:
// - It can fail for antipodal points (points on opposite sides of the Earth)
// - It is more complex and computationally intensive than the Haversine formula (Could be slower)
// - No support for altitude differences (assumes points are on the same ellipsoid surface)
// function calculateDistance(userLat, userLon, poiLat, poiLon) {
//  const a = 6378137; // Semi-major axis (meters)
//  const f = 1 / 298.257223563; // Flattening
//  const b = (1 - f) * a;

//  const φ1 = userLat * Math.PI / 180;
//  const φ2 = poiLat * Math.PI / 180;
//  const L = (poiLon - userLon) * Math.PI / 180;

//  let λ = L;
//  let λPrev;
//  let iterLimit = 100;
//  let sinσ, cosσ, σ, sinα, cos2α, cos2σm, C;

//  const U1 = Math.atan((1 - f) * Math.tan(φ1));
//  const U2 = Math.atan((1 - f) * Math.tan(φ2));

//  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
//  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

//  do {
//  const sinλ = Math.sin(λ), cosλ = Math.cos(λ);
//  sinσ = Math.sqrt(
//  (cosU2 * sinλ) ** 2 +
//  (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) ** 2
//  );
//  if (sinσ === 0) return 0; // co-incident points

//  cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
//  σ = Math.atan2(sinσ, cosσ);
//  sinα = cosU1 * cosU2 * sinλ / sinσ;
//  cos2α = 1 - sinα ** 2;
//  cos2σm = cosσ - 2 * sinU1 * sinU2 / cos2α;

//  if (isNaN(cos2σm)) cos2σm = 0; // equatorial line

//  C = f / 16 * cos2α * (4 + f * (4 - 3 * cos2α));
//  λPrev = λ;
//  λ = L + (1 - C) * f * sinα *
//  (σ + C * sinσ * (cos2σm + C * cosσ * (-1 + 2 * cos2σm ** 2)));
//  } while (Math.abs(λ - λPrev) > 1e-12 && --iterLimit > 0);

//  if (iterLimit === 0) return NaN; // formula failed to converge

//  const u2 = cos2α * (a ** 2 - b ** 2) / (b ** 2);
//  const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
//  const B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
//  const Δσ = B * sinσ * (cos2σm + B / 4 * (
//  cosσ * (-1 + 2 * cos2σm ** 2) -
//  B / 6 * cos2σm * (-3 + 4 * sinσ ** 2) * (-3 + 4 * cos2σm ** 2)
//  ));

//  const s = b * A * (σ - Δσ);
//  return s; // distance in meters
// }

// (3) GeographicLib: Karney’s algorithm - Accurate & More Robust
// Using 	WGS-84 ellipsoid Model
// Works on Antipodal or polar calculations
// GeographicLib is slightly more precise than Vincenty Formula and guaranteed to converge.
const geod = GeographicLib.Geodesic.WGS84;

function calculateDistance(userLat, userLon, poiLat, poiLon) {
 const result = geod.Inverse(userLat, userLon, poiLat, poiLon);
 return result.s12; // distance in meters
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
  let baseScale = 3.25; // Scaling that works for mid-range objects
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
  
// Use OBJECTID as the unique identifier
  const poiId = poi.objectid; // Pass objectid from the feature

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
  entity.setAttribute('look-at', '[gps-new-camera]'); // Look at the camera

  // (1) white line 
  const line = document.createElement('a-plane');
  line.setAttribute('color', 'white');
  line.setAttribute('width', 0.1); 
  line.setAttribute('height', lineHeight); // Length
  line.setAttribute('position', `0 -${lineYOffset} 0`); // anchor is in the center 
  line.setAttribute('shadow', 'cast: true; receive: true'); // Add shadow
  entity.appendChild(line);

  // (2.5) Halo Behind Image
  const halo = document.createElement('a-circle');
  halo.setAttribute('radius', imageHeight * 1.5); // Adjust the radius of the halo
  halo.setAttribute('color', 'yellow'); // Set the halo color
  halo.setAttribute('opacity', '1'); // Set the halo opacity
  halo.setAttribute('position', `0 ${imageYOffset} -0.02`); // Position the halo slightly behind the image
  halo.setAttribute('material', 'shader: flat'); // Use a flat shader for the halo
  halo.setAttribute('visible', false); // Hide the halo by default
  entity.appendChild(halo);

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
  textParent.classList.add('text-parent');

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
      // color: 'black',
      color: null,
      padding: 0.2,
      opacity: 0.9
    }); // Apply the custom component - Initial Value
    
    textParent.appendChild(text);
  }

  // Append the text parent to the entity
  textParent.setAttribute('visible', false); // Hide the text by default
  entity.appendChild(textParent);

  // (4) Connecting Line
  // const connectingLine = createLine(entity, { x: 0, y: textYOffset-0.25, z: 0 }, { x: 0, y: connectingLineOffset, z: 0 }, 'white');
  // connectingLine.setAttribute('visible', false); // Hide the line by default
  const { line: connectingLine, start: lineStart, end: lineEnd } = createLine(
    entity,
    { x: 0, y: textYOffset - 0.25, z: 0 },
    { x: 0, y: connectingLineOffset, z: 0 },
    'white'
  );
  connectingLine.setAttribute('visible', false); // Hide the line by default

  // Apply reverse scaling based on Distance
  textParent.setAttribute('scale', `${textParentScale} ${textParentScale} ${textParentScale}`);
  textParent.setAttribute('position', `0 ${textYOffset} 0`); // Position the text parent on top of the line

  entity.setAttribute('gps-new-entity-place', `latitude: ${poi.latitude}; longitude: ${poi.longitude};`);
 // SAVE Coords AS DATA ATTRIBUTES
  entity.setAttribute('data-latitude', poi.latitude);
  entity.setAttribute('data-longitude', poi.longitude);

  // Apply the pre-calculated entity scale to the entity
  entity.setAttribute('scale', `${entityScale} ${entityScale} ${entityScale}`); 

  entity.classList.add('clickable');
  image.classList.add('clickable'); //* Fix: clickable class had to be added to the child
  // Add the toggle-title attribute to the entity
  entity.setAttribute('toggle-title',
    `poiId: ${poiId};
    full: ${fullText}; 
    lineStartY: ${lineStart.y}; 
    lineEndY: ${lineEnd.y}; 
    textParentScale: ${textParentScale}; 
    haloYPosition: ${imageYOffset}; 
    haloRadius: ${imageHeight / 2};`);

  // Add the `show-popup` component with the POI data
    const popupTitle = `<b>${poi.name}</b>`;
    const popupContent = `
    <b>Address</b>: ${poi.street || 'N/A'}, ${poi.city || 'N/A'}, ${poi.state || 'N/A'}, ${poi.zip || 'N/A'}<br>
    <b>Coordinates</b>: ${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)} (Lat, Lng)
  `;
  entity.setAttribute('poiId', poiId); // Set the poiId attribute for the entity
  entity.setAttribute('show-popup', 
    `title: ${popupTitle}; 
    distance: ${formattedDistance}; 
    content: ${popupContent}; 
    labelImage: ${imageSrc};`);
  
  // Add look-at behavior after the entity is loaded
  entity.addEventListener('loaded', () => {
    // entity.setAttribute('look-at', '[gps-new-camera]'); 
    if (image) {
      image.setAttribute('look-at', '[gps-new-camera]');
      textParent.setAttribute('look-at', '[gps-new-camera]'); // Apply look-at to the parent
      line.setAttribute('look-at', '[gps-new-camera]');
      halo.setAttribute('look-at', '[gps-new-camera]');
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
  // Return the line along with its start and end positions
  return { line, start, end };
}
  
//  Query the FeatureLayer based on the selected State (Old Code)
function loadPOIData() {
  console.log("loadPOIData is called");
  document.getElementById('loadingIndicator').style.display = 'block';
  document.getElementById('loadingIndicator').textContent = "Loading Points of Interest Near You...";
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
                objectid: feature.attributes.OBJECTID,
                name: feature.attributes.NAME,
                latitude: feature.geometry.latitude,
                longitude: feature.geometry.longitude,
                street: feature.attributes.STREET,
                city: feature.attributes.CITY,
                state: feature.attributes.STATE,
                zip: feature.attributes.ZIP,
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
              
              // HIDE THE LOADING INDICATOR
              document.getElementById('loadingIndicator').style.display = 'none'; // Hide the loading indicator once all data is processed
              
              // Show manual heading message When the loading indicator is hidden
              const headingMsg = document.getElementById('manual-heading-message');
              const headingYesBtn = document.getElementById('manual-heading-yes');
              if (!window._headingPrompted) window._headingPrompted = false;
              if (!window._headingPrompted && loadingIndicator.style.display === "none") {
                if (headingMsg) headingMsg.style.display = "block";
                window._headingPrompted = true;
              }

                // When user clicks "Yes", hide the msg block
              if (headingYesBtn) {
                headingYesBtn.addEventListener('click', () => {
                  if (headingMsg) headingMsg.style.display = "none";
                  // if (manualControls) manualControls.style.display = "block";
                });
              }

              //******** Pin the title if there is a selectedPOI in AR Scene
              if (selectedPOI && selectedPOI.id) {
                // Find the AR POI entity by poiId attribute
                console.log(`Existing selected POI ID: ${selectedPOI.id}`);
                // Asychronously pin the title when it's ready
                const arPoi = document.querySelector(`[poiId="${selectedPOI.id}"]`);
                if (arPoi) {
                  if (arPoi.hasLoaded) {
                    if (arPoi.components && arPoi.components['toggle-title']) {
                      arPoi.components['toggle-title'].pinTitle();
                    }
                  } else {
                    arPoi.addEventListener('loaded', () => {
                      if (arPoi.components && arPoi.components['toggle-title']) {
                        arPoi.components['toggle-title'].pinTitle();
                      }
                    }, { once: true });
                  }
                // const arPoi = document.querySelector(`[poiId="${selectedPOI.id}"]`);
                // if (arPoi && arPoi.components && arPoi.components['toggle-title']) {
                //   console.log("SAME AR POI exist in AR SCENE");
                //   // Asychronously pin the title when it's ready
                //   // Use setTimeout to defer pinTitle
                //   setTimeout(() => {
                //     arPoi.components['toggle-title'].pinTitle();
                //   }, 50); // 50ms delay to ensure component is ready
                } else {
                  console.log("SAME AR POI NOT exist in AR SCENE");
                }
              }
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
//******* */ Debuggin UpdateDisplay refreshing-->
// document.getElementById('debug-refresh-ar').addEventListener('click', () => {
//   updateDisplay();
//   console.log('AR display manually refreshed.');
// });

function updateDisplay() { // This is where AR Screen gets refreshed

  // Clear existing POIs
  const existingPOIs = document.querySelectorAll('[gps-new-entity-place]');
  existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));

  updateOverlayText();
  if (isUSStateAssigned && isCompassCalibrated)  // Prevent not calling the function when there is no default US state 
    {
   loadPOIData();
  }

  // Add fake POIs for testing scaling method
  // const distantSigns = [
  //   {
  //     name: "(300m East)",
  //     latitude: curLat,
  //     longitude: curLon + (300 / (111320 * Math.cos(curLat * Math.PI / 180))) // 300 meters east
  //   },
  //   {
  //     name: "(500m North-East)",
  //     latitude: curLat + (500 / 111320), // 500 meters north
  //     longitude: curLon + (500 / (111320 * Math.cos(curLat * Math.PI / 180))) // 500 meters east
  //   },
  //   {
  //     name: "(750m South-West)",
  //     latitude: curLat - (750 / 111320), // 750 meters south
  //     longitude: curLon - (750 / (111320 * Math.cos(curLat * Math.PI / 180))) // 750 meters west
  //   },
  //   {
  //     name: "(1000m North)",
  //     latitude: curLat + (1000 / 111320), // 1000 meters north
  //     longitude: curLon // Same longitude
  //   },
  //   {
  //     name: "(1300m South-East)",
  //     latitude: curLat - (1300 / 111320), // 1300 meters south
  //     longitude: curLon + (1300 / (111320 * Math.cos(curLat * Math.PI / 180))) // 1300 meters east
  //   },
  //   {
  //     name: "(1500m West)",
  //     latitude: curLat,
  //     longitude: curLon - (1500 / (111320 * Math.cos(curLat * Math.PI / 180))) // 1500 meters west
  //   },
  //   {
  //     name: "(2000m North-West)",
  //     latitude: curLat + (2000 / 111320), // 2000 meters north
  //     longitude: curLon - (2000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 2000 meters west
  //   },
  //   {
  //     name: "(2200m South)",
  //     latitude: curLat - (2200 / 111320), // 2200 meters south
  //     longitude: curLon // Same longitude
  //   },
  //   {
  //     name: "(2500m East)",
  //     latitude: curLat,
  //     longitude: curLon + (2500 / (111320 * Math.cos(curLat * Math.PI / 180))) // 2500 meters east
  //   },
  //   {
  //     name: "(3000m North-East)",
  //     latitude: curLat + (3000 / 111320), // 3000 meters north
  //     longitude: curLon + (3000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 3000 meters east
  //   },
  //   {
  //     name: "(5000m South-West)",
  //     latitude: curLat - (5000 / 111320), // 5000 meters south
  //     longitude: curLon - (5000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 5000 meters west
  //   },
  //   {
  //     name: "(7000m North-West)",
  //     latitude: curLat + (7000 / 111320), // 7000 meters north
  //     longitude: curLon - (7000 / (111320 * Math.cos(curLat * Math.PI / 180))) // 7000 meters west
  //   },
  //   {
  //     name: "(East)",
  //     latitude: curLat, // Same latitude
  //     longitude: curLon + (250 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 250 meters east
  //   },
  //   {
  //     name: "(North East)",
  //     latitude: curLat + (100 / 111320), // Approximate 100 meters north
  //     longitude: curLon + (100 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 100 meters east
  //   },
  //   {
  //     name: "(South West)",
  //     latitude: curLat - (50 / 111320), // Approximate 50 meters south
  //     longitude: curLon - (50 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 50 meters west
  //   },
  //   {
  //     name: "(South West)",
  //     latitude: curLat - (25 / 111320), // Approximate 25 meters south
  //     longitude: curLon - (25 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 25 meters 
  //   },
  //   {
  //     name: "(North East)",
  //     latitude: curLat + (5 / 111320), // Approximate 5 meters north
  //     longitude: curLon + (5 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 5 meters
  //   },
  //   {
  //     name: "(South East)",
  //     latitude: curLat - (1 / 111320), // Approximate 1 meters south
  //     longitude: curLon + (1 / (111320 * Math.cos(curLat * Math.PI / 180))) // Approximate 1 meters 
  //   }
  // ];

    // Add fake POIs for testing scaling method
    // distantSigns.forEach(distantSign => {
    //   console.log("Adding distant sign:", distantSign.name);
    //   const distantSignEntity = createPOIEntity(distantSign, curLat, curLon);
    //   document.querySelector('a-scene').appendChild(distantSignEntity);
    // });

}

let userLocationGraphic = null; 

function updateGPS() { 
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        // Values from GPS Hardware
        lat = position.coords.latitude;
        lon = position.coords.longitude; 
        
        import('https://cdn.jsdelivr.net/npm/kalmanjs@1.1.0/lib/kalman.min.js').then(_ => {
          // console.log(module.exports);
          const KalmanFilter = module.exports;
          // Initialize Kalman filters for latitude and longitude (Noise Reduction)
          const kalmanLat = new KalmanFilter({ R: 0.01, Q: 3 });
          const kalmanLon = new KalmanFilter({ R: 0.01, Q: 3 });

          // Apply Kalman filter to the raw GPS values
          filteredLat = kalmanLat.filter(lat);
          filteredLon = kalmanLon.filter(lon);
        });

        gpsReady = true;  // Set GPS ready to true

        // Call updateDisplay based on useFilteredData boolean
        // Only call updateDisplay if useFilteredData is true & After Initial Calibration
        if (useFilteredData) {
          if (
            previousLat === null || previousLon === null ||
            Math.abs(filteredLat - previousLat) > changeThreshold ||
            Math.abs(filteredLon - previousLon) > changeThreshold
          ) {
            if (isCompassCalibrated) { // Only Call after calibration
              updateDisplay();
            }
            previousLat = filteredLat;
            previousLon = filteredLon;
            
          }
        } else {
          console.log("GPS data is jittery");
          // If useFilteredData is false, do nothing here
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

// ** Add Split View Resizing and Start ArcGIS SceneView
// This function is called when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const start = async () => {
    // Enable resizing the bottom panel with touch and drag
    enablePanelResizing();
    // Initialize the ArcGIS SceneView
    initSceneView();
  }
  start();
  // Call Calibration Modal -> handle AR scene injection and orientation setup after calibration
  showCalibrationModal();
});

function enablePanelResizing() {
  const bottomContainer = document.getElementById('bottom-container');
  const resizer = document.getElementById('resizer');
  const arContainer = document.getElementById('my-ar-container');

  let isResizing = false;
  let startY = 0;
  let startHeight = 0;
  let startArHeight = 0;

  //Use a custom img for resizer
  if (resizer) {
    // Set the resizer to use flexbox for centering
    resizer.style.display = 'flex';
    resizer.style.justifyContent = 'center'; // Center horizontally
    resizer.style.alignItems = 'center'; // Center vertically
  
    // Create and style the image
    const img = document.createElement('img');
    img.src = './assets/ui/SplitDrag.svg'; // Set the image path
    img.alt = 'Resizer';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover'; 
    img.style.filter = 'drop-shadow(0px 6px 20px -4px rgba(0, 0, 0, 0.10), 0px 4px 12px -2px rgba(0, 0, 0, 0.08))'; // Apply a drop shadow

    // Append the image to the resizer
    resizer.appendChild(img);

    // Add a slight background color when pressed
    resizer.addEventListener('mousedown', () => {
      resizer.style.backgroundColor = 'white';
      img.style.transform = 'scale(1.5)'; // Increase size 
    });

    // Reset background color when released
    resizer.addEventListener('mouseup', () => {
      resizer.style.backgroundColor = ''; // Reset to default
      img.style.transform = 'scale(1)'; // Reset to original size
    });

    // Handle touch events for mobile devices
    resizer.addEventListener('touchstart', () => {
      resizer.style.backgroundColor = 'white';
      img.style.transform = 'scale(1.5)'; 
    });

    resizer.addEventListener('touchend', () => {
      resizer.style.backgroundColor = ''; 
      img.style.transform = 'scale(1)';
    });
  }

  const startResize = (event) => {
    isResizing = true;

    // Support both mouse and touch events
    startY = event.touches ? event.touches[0].clientY : event.clientY;
    startHeight = bottomContainer.offsetHeight;
    startArHeight = arContainer.offsetHeight;

    document.body.style.cursor = 'ns-resize';
    event.preventDefault(); // Prevents page scrolling
  };

  const maxProportion = 0.85; // 85% of window height
  const minProportion = 0.15; // 15% of window height

  const resize = (event) => {
    if (!isResizing) return;

    // const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    // const dy = clientY - startY;

    // const newBottomHeight = Math.max(50, startHeight - dy);
    // const newArHeight = Math.max(50, startArHeight + dy);

    // // Apply updated sizes
    // bottomContainer.style.height = `${newBottomHeight}px`;
    // arContainer.style.height = `${newArHeight}px`;

    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const dy = clientY - startY;

    const windowHeight = window.innerHeight;
    let newBottomHeight = Math.max(50, startHeight - dy);
    let newArHeight = Math.max(50, startArHeight + dy);

    // Clamp bottomContainer to min and max proportions
    const maxBottomHeight = windowHeight * maxProportion;
    const minBottomHeight = windowHeight * minProportion;
    if (newBottomHeight > maxBottomHeight) {
      newBottomHeight = maxBottomHeight;
      newArHeight = windowHeight - maxBottomHeight;
    }
    if (newBottomHeight < minBottomHeight) {
      newBottomHeight = minBottomHeight;
      newArHeight = windowHeight - minBottomHeight;
    }

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

let hasTrackedOnce = false; // Flag to ensure we only zoom once per activation

function initSceneView() {
  require([
    "esri/layers/FeatureLayer",
  ], (
    FeatureLayer,
  ) => {
    // References to the map components in index.html
    webscene = document.querySelector("arcgis-scene");
    const legendExpand = document.getElementById("legend-expand");
    const legend = document.getElementById("legend"); 

   //********************** Set up a Web Scene **********************//
    Object.assign(webscene, {
      basemap: "topo-vector", // Use the "Topographic" - basemap:  topo-vector, satellite
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

    pointsRenderer = {
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
      // ** We override w/Custom  popup
      // popupTemplate: {
      //   title: "{Name}",
      //   content: `<b>Address</b>:{STREET}, {CITY}, {STATE}, {ZIP}<br>
      //         <b>Coordinates</b> (Lat, Lng): {LAT}, {LON}`
      // },
      elevationInfo: {
        mode: "relative-to-scene"
      },
      renderer: pointsRenderer,
      outFields: ["*"],
      // ** Show all points at all times (no feature reduction | Decluttering)
      // Reason: Prevent a case where an AR-selected POI Not visible in the scene
      // featureReduction: {
      //   type: "selection"
      // },
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
    webscene.addEventListener("arcgisViewReadyChange", async () => {
      //************  Add PointsLayer to the map
      webscene.map.add(pointsLayer); // webscene.map is the map object

      //************ Legend with State Info **********************//
      legendExpand.expanded = false;
      legend.layerInfos = [
        {
          layer: pointsLayer,
          title: "Shelter Locations by States"
        }
      ];

      //******* CUSTOM TRACK BUTTON BEHAVIOR ********//
       trackButton.addEventListener('click', () => {
        if (!webscene || !webscene.view) return;

        // Toggle tracking state
        isTracking = !isTracking;

        // Track Button Icon Color (+ Text If needed)
        const trackIcon = trackButton.querySelector('calcite-icon');
        // const trackText = trackButton.querySelector('.track-text'); // No Text Used

        if (isTracking) {
          trackIcon.setAttribute('icon', 'gps-on-f'); // Use filled icon when tracking
          trackIcon.setAttribute('color', '#ffffff');
          trackButton.style.backgroundColor = '#28a745';
          trackButton.style.borderColor = "#218838";
          trackButton.style.color = '#fff';
          // if (trackText) trackText.textContent = "Tracking On";
        } else {
          trackIcon.setAttribute('icon', 'gps-on'); // Use regular icon when not tracking
          trackIcon.setAttribute('color', '#6e6e6e');
          trackButton.style.backgroundColor = '#f8f8f8';
          trackButton.style.color = '#151515';
          // if (trackText) trackText.textContent = "Tracking Off";
        }

        // 1 ------------ Track ACTIVATED------------ // 
        if (isTracking) {
          // Show/update user location graphic
          require(["esri/Graphic"], function(Graphic) {
            if (!userLocationGraphic) {
              userLocationGraphic = new Graphic({
                geometry: {
                  type: "point",
                  latitude: filteredLat ?? lat,
                  longitude: filteredLon ?? lon
                },
                symbol: {
                  type: "simple-marker",
                  style: "circle",
                  color: "green",
                  size: "16px",
                  outline: {
                    color: "#fff",
                    width: 2
                  }
                },
                elevationInfo: {
                  mode: "on-the-ground"
                }
              });
              webscene.view.graphics.add(userLocationGraphic);
            } else {
              userLocationGraphic.geometry = {
                type: "point",
                latitude: filteredLat ?? lat,
                longitude: filteredLon ?? lon
              };
              userLocationGraphic.visible = true;
            }
          });

          const camera = webscene.view.camera;
          const tilt = camera.tilt;
          const heading = camera.heading;
          const altitude = camera.position.z;
          let myOffsetBehind = altitude * Math.tan(tilt * Math.PI / 180);
          if (tilt > 1) { // Offset the camera behind the POI for oblique view
            focusCamera(
            { latitude: useFilteredData ? filteredLat : lat, longitude: useFilteredData ? filteredLon : lon }, 
            true, "curHeading", altitude, myOffsetBehind, // Offset Behind based on altitude and tilt
            true, // track active
            isCompassActive, // Use compass state
            true)  // Use midpoint to show both user and POI)
          } else { // Top-down view: center on cur loc
            webscene.view.goTo({
              position: {
                latitude: useFilteredData ? filteredLat : lat,
                longitude: useFilteredData ? filteredLon : lon,
                z: altitude
              },
              tilt: tilt,
              heading: heading
            });
          }
        // 2 //------------ Track Gets DE-ACTIVATED------------ // 
        } else {  // When isTracking === false
          // (0) Deactivate tracking: hide user location graphic (Toggle Graphic)
          if (userLocationGraphic) { userLocationGraphic.visible = false; }
        }
      });

      //*******/ Wait for the Legend component to render, then add a stateSelect Filter ********// 
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
          // Change Perspective
          webscene.view.goTo(webscene.view.camera.tilt < 1 ? { tilt: 80 } : { tilt: 0 }).catch((error) => {
            if (error.name !== "AbortError") {
              console.error(error);
            }
          });

          // Toggle icon
          const iconEl = toggleViewButton.querySelector('calcite-icon');
          const is2D = iconEl.getAttribute('icon') === '2d';
          
          iconEl.setAttribute('icon', is2D ? '3d' : '2d');
                
        });
      // } //
     
      // *** custom popups on click (Same style used in AR POI Interaction)
      webscene.view.on("click", function(event) {
        webscene.view.hitTest(event).then(function(response) {
          const graphic = response.results.find(r => r.graphic && r.graphic.layer === pointsLayer)?.graphic;
          if (graphic) {
            // Remove previous highlight if any
            if (pointHighlighter) {
              pointHighlighter.remove();
              pointHighlighter = null;
            }

            // Highlight the clicked feature
            webscene.view.whenLayerView(pointsLayer).then(function(layerView) {
              pointHighlighter = layerView.highlight(graphic);
            });

            // Calculate distance from user to POI
            const userLat = useFilteredData ? filteredLat : lat;
            const userLon = useFilteredData ? filteredLon : lon;
            const poiLat = graphic.attributes.LAT;
            const poiLon = graphic.attributes.LON;
            let distance = "";
            if (userLat && userLon && poiLat && poiLon) {
              const distMeters = calculateDistance(userLat, userLon, poiLat, poiLon);
              distance = distMeters >= 1000
                ? `${(distMeters / 1000).toFixed(1)} km`
                : `${Math.round(distMeters)} m`;
            }

            showPopup({ // imported from external js (popupWindow.js)
              title: graphic.attributes.NAME,
              distance: distance,
              content: `<b>Address:</b> ${graphic.attributes.STREET}, ${graphic.attributes.CITY}, ${graphic.attributes.STATE}, ${graphic.attributes.ZIP}<br>
                        <b>Coordinates:</b> ${graphic.attributes.LAT}, ${graphic.attributes.LON}`,
              labelImage: getLabelImageForState(graphic.attributes.STATE),
              onClose: () => {
                if (pointHighlighter) {
                  pointHighlighter.remove();
                  pointHighlighter = null;
                }
                document.dispatchEvent(new CustomEvent('web-popup-closed'));
              },
              containerId: 'popup-container'
            });

            // to Notify AR Scene everytime a POI is selected in Webscene
            // Emit a custom event for AR/WebScene sync
            const poiId = graphic.attributes.OBJECTID;
            document.dispatchEvent(new CustomEvent('web-poi-selected', { detail: { id: poiId } }));
          }
        });
      });

    }); // end of event listener
     
  }
)}

// Set a label Image based on the category (state) of the POI
function getLabelImageForState(state) {
  // Find the uniqueValueInfo for this state in the pointsRenderer
  const info = pointsRenderer.uniqueValueInfos.find(info => info.value === state);
  if (info && info.symbol && info.symbol.symbolLayers && info.symbol.symbolLayers[0].resource) {
    return info.symbol.symbolLayers[0].resource.href;
  }
  // Fallback to default symbol
  if (pointsRenderer.defaultSymbol && pointsRenderer.defaultSymbol.symbolLayers && pointsRenderer.defaultSymbol.symbolLayers[0].resource) {
    return pointsRenderer.defaultSymbol.symbolLayers[0].resource.href;
  }
  return ""; // fallback if nothing found
}

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
      const existingPOIs = document.querySelectorAll('[gps-new-entity-place]');
      existingPOIs.forEach(poi => poi.parentNode.removeChild(poi));

      // Load new POI data based on the selected state
      //* Check once more here if compass is calibrated
      if (isCompassCalibrated) {
        loadPOIData();
      }
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
// Receive and Smooth Compass, Gyro and Accelerometer Values
function updateOrientation(event) {
  //alpha - Z (Yaw) Range 0 to 360 - rotation on z axis: direction device faces relative to magnetic north
  //beta - Y (Pitch) Range -90 to 90 - rotation on y axis: tilting up/down
  //gamma - X (Roll) Range -180 to 180 - rotation on x axis (0: Device is flat on ground)
  if (event.alpha !== null) {
    // Raw values from the device
    let rawHeading;
    // ***** Check for webkitCompassHeading for iOS devices
    if (event.webkitCompassHeading !== undefined) {
      // console.log("Using webkitCompassHeading for iOS");
      rawHeading = event.webkitCompassHeading;
      } else  { // Check for alpha value for Android devices
      // console.log("Using alpha for Android");
      rawHeading = (360 - event.alpha); // Convert to compass heading  (counterclockwise rotation)
    } 

    const rawTilting = event.beta; // Tilt (pitch)
    const rawRolling = event.gamma; // Roll    

    // Always apply headingOffset to rawHeading -> (Manual Offset Not used in WebScene)
    // rawHeading = (360 - event.alpha - headingOffset + 360) % 360;

    // Always update the camera rig rotation (Adjust the AR Scene)
    // const camera = document.getElementById('cameraRig');
    // if (camera) {
    //   camera.setAttribute('rotation', `0 ${headingOffset} 0`);
    // }

    //******* Applying Manual Offset here */
    // Apply heading offset to all POI entities (gps-new-entity-place)
    const allEntities = document.querySelectorAll('[poiId]');
    allEntities.forEach(entity => {
      console.log("Updating entity with ID:", entity.getAttribute('poiId'));
      // Get the original latitude and longitude from the entity's attributes or dataset
      const poiLat = parseFloat(entity.getAttribute('data-latitude'));
      const poiLon = parseFloat(entity.getAttribute('data-longitude'));
      // If not stored, Need to store these when creating the entity
      console.log("Original Position:", poiLat, poiLon);
      // Calculate new position with offset
      const offsetAngle = -headingOffset; // degrees
      // Assign which lat & lon to use
      let curLat = useFilteredData ? filteredLat : lat;
      let curLon = useFilteredData ? filteredLon : lon;
      const offsetPos = rotateARPOIWithOffset(curLat, curLon, poiLat, poiLon, offsetAngle);
      entity.setAttribute('gps-new-entity-place', `latitude: ${offsetPos.latitude}; longitude: ${offsetPos.longitude};`);
    });

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
      smoothedTilting = rawTilting; // Initialize smoothedTilting
    } else {
       // Calculate the shortest angular difference for tilting
      let delta = rawTilting - smoothedTilting;
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
      smoothedRolling = rawRolling; // Initialize smoothedRolling
    } else {
      // Calculate the shortest angular difference for rolling
      let delta = rawRolling - smoothedRolling;

      // Handle the boundary transition between -90° and 90°
      if (delta > 90) {
        delta -= 180; // Adjust for crossing the boundary
      } else if (delta < -90) {
        delta += 180; // Adjust for crossing the boundary
      }

      // Apply smoothing to the angular difference
      smoothedRolling += smoothingFactor * delta;
    }
  
    // Track if GPS location has moved significantly
    const gpsLat = useFilteredData ? filteredLat : lat;
    const gpsLon = useFilteredData ? filteredLon : lon;
    const gpsSignificantChange =
      previousLat === null || previousLon === null || // First time
      Math.abs(gpsLat - previousLat) > changeThreshold || // Significant latitude change
      Math.abs(gpsLon - previousLon) > changeThreshold; // Significant longitude change

    // WebScene Value Translation (Tilt Stays within a set angle range)
    let correctedTilting;
    if (smoothedTilting > 0 && smoothedTilting <= 90) { // Within the usual viewing range
       correctedTilting = Math.min(90, Math.abs(-smoothedTilting));
    } else if (smoothedTilting > 90 && smoothedTilting <= 180) { // When phone's facing past upright point 
      correctedTilting = 90;  // tilted up
    } else if (smoothedTilting > 180 && smoothedTilting <= 270) { // When phone's facing more or less the ground
      correctedTilting =  0; // 2d View
    } else if (smoothedTilting > 270 && smoothedTilting <= 360) { // When phone's facing more or less the ground
      correctedTilting = Math.min(90, Math.abs(-smoothedTilting))- 90; // Clamp negative tilts
    }
    else { // if negative
      correctedTilting = Math.min(90, -smoothedTilting); // Clamp positive tilts
    }

    // Update the WebScene camera heading
    // webcene.view.camera.heading is immutable
    // Detect platform (iOS or Android)
    const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "iOS"
    : /Android/i.test(navigator.userAgent)
    ? "Android"
    : "Other";
 
    // Receive event here when COMPASS button is clicked for SmoothedHeading

    function getMidpointPosition(lat1, lon1, lat2, lon2) {
      return {
        latitude: (lat1 + lat2) / 2,
        longitude: (lon1 + lon2) / 2
      };
    }

    if (compassOn_NoPOI === true || compassOn_POI === true) {
      const camera = webscene.view.camera;
      const tilt = camera.tilt;
      const heading = camera.heading;
      const altitude = camera.position.z;
      let myOffsetBehind = altitude * Math.tan(tilt * Math.PI / 180);
 
      if (tilt > 1) { // Offset the camera behind the POI for oblique view
       // This Works! (But Camera is Centered)
        focusCamera(
          { latitude: useFilteredData ? filteredLat : lat, longitude: useFilteredData ? filteredLon : lon }, 
          true,  // animate
          "smoothedHeading", altitude, myOffsetBehind, // Offset Behind based on altitude and tilt
          true, // track active
          isCompassActive, // Use compass state
          false)  // Not Use midpoint to show both user and POI)

          // Get current camera position
        // const cameraPos = webscene.view.camera.position;
        // // Get user location
        // const userLat = useFilteredData ? filteredLat : lat;
        // const userLon = useFilteredData ? filteredLon : lon;

        // // Calculate midpoint between camera and user
        // const midpointLat = (cameraPos.latitude + userLat) / 2;
        // const midpointLon = (cameraPos.longitude + userLon) / 2;
        // const midpointZ = (cameraPos.z + cameraPos.z) / 2; // Or use user altitude if available

        // // Use midpoint as camera position
        // focusCamera(
        //   { latitude: userLat, longitude: userLon },
        //   true,  // animate
        //   "smoothedHeading",
        //   midpointZ, // Use midpoint altitude
        //   midpointZ * Math.tan(tilt * Math.PI / 180), // Offset behind based on midpoint altitude and tilt
        //   true, // track active
        //   isCompassActive,
        //   false
        // );
      } else { // Top-down view: center on POI
        webscene.view.goTo({
          position: { // Where camera is positioned
            latitude: useFilteredData ? filteredLat : lat,
            longitude: useFilteredData ? filteredLon : lon,
            z: altitude
          },
          target: { // Point camera is looking at
            latitude: useFilteredData ? filteredLat : lat,
            longitude: useFilteredData ? filteredLon : lon,
            z: 0
          },
          tilt: tilt,
          heading: smoothedHeading 
        }, {animate: true}); 
        // Dynamic offsets based on zoom/altitude
        // Clamp offset values to avoid jitter
        // const offsetDistance = Math.max(500, Math.min(altitude * 0.5, 5000)); // between 500m and 5000m
        // const offsetHeight = Math.max(-altitude * 0.2, -300); // at least -300m above

        // const offset = getCameraOffsetPosition(
        //   useFilteredData ? filteredLat : lat, 
        //   useFilteredData ? filteredLon : lon, 
        //   heading, offsetDistance, offsetHeight
        // );
        // webscene.view.goTo({
        //   position: { // Where camera is positioned
        //     latitude: offset.latitude,
        //     longitude: offset.longitude,
        //     z: altitude
        //   },
        //   target: { // Point camera is looking at
        //     latitude: useFilteredData ? filteredLat : lat,
        //     longitude: useFilteredData ? filteredLon : lon,
        //     z: 0
        //   },
        //   tilt: tilt,
        //   heading: smoothedHeading 
        // }, {animate: true}); 
      }
    } 

    // Check if the heading change exceeds the threshold
    const headingSignificantChange =
    previousHeading === null || Math.abs(smoothedHeading - previousHeading) > headingChangeThreshold;    

    const tiltingSignificantChange =
    previousTilting === null || Math.abs(smoothedTilting - previousTilting) > tiltingChangeThreshold;

    const rollingSignificantChange =
    previousRolling === null || Math.abs(smoothedRolling - previousRolling) > rollingChangeThreshold;

    // (** Not USED) Trigger `updateDisplay` only if it's the first heading or 
    // if there is a significant change in both heading and GPS location (gpsSignificantChange)
    if ((headingSignificantChange) ||
      (tiltingSignificantChange) ||
      (rollingSignificantChange)) {
      heading = smoothedHeading;
      // console.log(
      //   `Significant change detected. 
      //   GPS Change: ${gpsSignificantChange}, 
      //   Heading Change: ${headingSignificantChange},
      //   Tilting Change: ${tiltingSignificantChange},
      //   Rolling Change: ${rollingSignificantChange}`
      // );
     
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

// ********************** Focus Camera on Target **********************//
/**
 * Focuses the WebScene camera offset from the user location.
 * If useMidpoint is true and both user and POI are present, adjusts the camera's offset/altitude to ensure both are visible.
 * The user location (blue dot) will always appear horizontally centered and 10% above the bottom of the view.
 *
 * @param {Object|null} _target - The target object with { latitude, longitude } to focus on. If null and tracking is active, uses user location.
 * @param {boolean} _animate - Whether to animate the camera move (default: true).
 * @param {text} _headingInstruction- "smoothedHeading"(Compass) "customHeading" - custom heading based on user and POI location, or "north" = 0.
 * @param {number} _offsetHeight - Horizontal distance behind the user in meters (default: 1000).
 * @param {number} _offsetBehind - Height above the user in meters (default: 300).
 * @param {boolean} _isTrackActive - If true and _target is null, use current user location as target (default: false).
 * @param {boolean} _isCompassActive - (Unused in this logic, but available for future use.)
 * @param {boolean} _useMidpoint - If true and both user and POI exist, zoom/offset to show both, but camera is always offset from user.
 */
function focusCamera(
  _target = null, 
  _animate = true, 
  _headingInstruction = "north", // default 
  _offsetHeight = 5000, 
  _offsetBehind = 150, 
  _isTrackActive = false, 
  _isCompassActive = false,
  _useMidpoint = false,
) {
  // User location as the camera anchor
  const userLat = useFilteredData ? filteredLat : lat;
  const userLon = useFilteredData ? filteredLon : lon;

  // Default offset values
  let offsetHeight = _offsetHeight;
  let offsetBehind = _offsetBehind;

  // If useMidpoint and both user and POI are present, adjust offset to fit both
  if (
    _useMidpoint &&
    selectedPOI &&
    typeof selectedPOI.latitude === "number" &&
    typeof selectedPOI.longitude === "number"
  ) {
    const dist = calculateDistance(userLat, userLon, selectedPOI.latitude, selectedPOI.longitude);
    offsetHeight = Math.max(500, Math.min(dist * 1.5, 5000));
    offsetBehind = Math.max(200, Math.min(dist * 0.8, 3000));
  }

  // const heading = _useDynamicHeading ? (typeof smoothedHeading === "number" ? smoothedHeading : 0) : 0;
  // --- Heading logic ---
  let heading;

  if (_headingInstruction = "smoothedHeading") {
    // (1) Use device compass heading - SmoothedHeading
   heading = (typeof smoothedHeading === "number" ? smoothedHeading : 0);
  } else if (_headingInstruction = "customHeading") { // No SmoothedHeading
    // (2) Calculate Custom heading based on user location and selected POI
      const toRad = deg => deg * Math.PI / 180;
      const toDeg = rad => rad * 180 / Math.PI;

      const lat1 = toRad(userLat);
      const lon1 = toRad(userLon);
      
      // Fall back in case there is no selectedPOI then customHeading is called
      const lat2 = toRad(
      selectedPOI && typeof selectedPOI.latitude === "number"
       ? selectedPOI.latitude
       : userLat
      );

      const lon2 = toRad(
      selectedPOI && typeof selectedPOI.longitude === "number"
       ? selectedPOI.longitude
       : userLon
      );

      const dLon = lon2 - lon1;

      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

      heading = (toDeg(Math.atan2(y, x)) + 360) % 360;
  } else if (_headingInstruction = "north"){ // (3) Use north-up heading (0 degrees)
    heading = 0; // North-up
  } else if (_headingInstruction === "curHeading") {
    heading = webscene.view.camera.heading; // Use the current heading from the compass 
  } 
  else { // In all case
    heading = 0; 
  }
    
  // Camera offset is always from user location
  let offset;
  if (
    _target &&
    selectedPOI &&
    _target.latitude === selectedPOI.latitude &&
    _target.longitude === selectedPOI.longitude &&
    !_useMidpoint
  ) {
    // Offset from the POI (center POI, camera offset from POI)
    offset = getCameraOffsetPosition(
      selectedPOI.latitude,
      selectedPOI.longitude,
      heading,
      offsetHeight,
      offsetBehind
    );
  } else {
    // Offset from user location (default)
    offset = getCameraOffsetPosition(
      userLat,
      userLon,
      heading,
      offsetHeight,
      offsetBehind
    );
  }

  let goToTarget, goToOptions = { animate: _animate };

  // If focusing on POI (and not using midpoint), center the POI
  if (
    _target &&
    selectedPOI &&
    _target.latitude === selectedPOI.latitude &&
    _target.longitude === selectedPOI.longitude &&
    !_useMidpoint
  ) {
    goToTarget = {
      latitude: selectedPOI.latitude,
      longitude: selectedPOI.longitude,
      z: 0
    };
    // Do NOT set screenPoint, so POI is centered
  } else {
    // Focusing on user or using midpoint: keep user at fixed screen position
    goToTarget = {
      latitude: userLat,
      longitude: userLon,
      z: 0
    };
    if (
      typeof webscene.view !== "undefined" &&
      webscene.view.width && webscene.view.height
    ) {
      // 10% above the bottom of the view
      const screenX = webscene.view.width / 2;
      const screenY = webscene.view.height * 0.9;
      goToOptions.screenPoint = { x: screenX, y: screenY };
    }
  }

  let cameraZ = offset.z;
    webscene.view.goTo({
      position: {
        latitude: offset.latitude,
        longitude: offset.longitude,
        z: cameraZ
      },
      target: goToTarget,
      tilt: offset.tilt,
      heading: heading
    }, goToOptions).catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Error focusing camera:", error);
      }
    });
}


//********************** Event Listeners to Respond to AR POI Interaction **********************//
document.addEventListener('ar-poi-selected', function(e) {
  targetCameraOnSelectedPOI(e);
  POIselectedFromMap = false;
});

document.addEventListener('web-poi-selected', function(e) {
  targetCameraOnSelectedPOI(e);
  POIselectedFromMap = true;
});

document.addEventListener('ar-popup-closed', clearPOIHighlightAndSelection);
document.addEventListener('web-popup-closed', clearPOIHighlightAndSelection);

function clearPOIHighlightAndSelection() {
  POIselectedFromMap = false;
  if (pointHighlighter) {
    pointHighlighter.remove();
    pointHighlighter = null;
  }
  if (selectedPOI) {
    selectedPOI = null; // Clear the selected POI
  }

}

function targetCameraOnSelectedPOI(e) {
  const poiId = e.detail.id;
  console.log("WEB POI selected with ID:", poiId);
  webscene.view.whenLayerView(pointsLayer).then(function(layerView) {
    const query = pointsLayer.createQuery();
    query.where = `OBJECTID = ${poiId}`;
    pointsLayer.queryFeatures(query).then(function(result) {
      if (result.features.length > 0) {
        if (pointHighlighter) pointHighlighter.remove();
        pointHighlighter = layerView.highlight(result.features[0]);
        const feature = result.features[0];
        selectedPOI = {
          latitude: feature.geometry.latitude,
          longitude: feature.geometry.longitude,
          name: feature.attributes.NAME,         // Add the POI name
          id: feature.attributes.OBJECTID  
        };
        
        const camera = webscene.view.camera;
        const tilt = camera.tilt;
        const heading = camera.heading;
        const altitude = camera.position.z;
        let myOffsetBehind = altitude * Math.tan(tilt * Math.PI / 180);
      
      // ******* // Focus camera on the selected POI - WHEN USER SELECTS A POI 
      if (!isTracking && selectedPOI) { // !trackButton.tracking && selectedPOI
        console.log("Selected POI:", selectedPOI);
          // (1) Track is OFF: focus directly on POI, no midpoint, no dynamic heading
          if (tilt > 1) { // Offset the camera behind the POI for oblique view
            focusCamera(
              selectedPOI, true, "curHeading", altitude, myOffsetBehind, // Offset Behind based on altitude and tilt
              false, // track active
              isCompassActive, // Use compass state
              false)  // Use midpoint to show both user and POI)
          } else { // Top-down view: center on POI
            webscene.view.goTo({
              position: {
                latitude: selectedPOI.latitude,
                longitude: selectedPOI.longitude,
                z: altitude
              },
              tilt: tilt,
              heading: heading
            });
          }
        } else if (isTracking && !isCompassActive && selectedPOI) { // trackButton.tracking && !isCompassActive && selectedPOI
          console.log("Selected POI:", selectedPOI);
          // (2) When Track is ON, REINFORCE Compass is OFF: 
          // Track will turn off If Map is triggered on Map
            if (tilt > 1) { // Offset the camera behind the POI for oblique view
            focusCamera(
              selectedPOI, true, "curHeading", altitude, myOffsetBehind, // Offset Behind based on altitude and tilt
              true, // track active
              isCompassActive, // Use compass state
              false)  // Use midpoint to show both user and POI)
          } else { // Top-down view: center on POI
            webscene.view.goTo({
              position: {
                latitude: selectedPOI.latitude,
                longitude: selectedPOI.longitude,
                z: altitude
              },
              tilt: tilt,
              heading: heading
            });
          }
          compassButton.style.display = 'none'; // Hide compass button when popup is closed
          isCompassActive = false; // Reset compass state
          compassOn_NoPOI = false;
          compassOn_POI = false; // Reset compass state
        } else if (isTracking && isCompassActive && selectedPOI) {
          console.log("Selected POI:", selectedPOI);
          // While the compass is Active, user selects a POI
          // (1) STOP COMPASS
          isCompassActive = false; // Reset compass state
          compassOn_POI = false; // Reset compass state
          compassOn_NoPOI = false;
          resetCompassButtonProperties(true, false, '1', '#f8f8f8', '#d1d1d1', '#151515');

          // (2) Show the Track button (still tracking) && restore the compass button position 
          toggleViewButton.style.display = 'block'; // Show the toggleView button
          trackButton.style.display = 'block'; // HIDE the track button when compass is ON
          restoreCompassPosition();
          //(3) Focus Camera on the selected POI
          if (tilt > 1) { // Offset the camera behind the POI for oblique view
            focusCamera(
              selectedPOI, true, "curHeading", altitude, myOffsetBehind, // Offset Behind based on altitude and tilt
              true, // track active
              isCompassActive, // Use compass state
              false)  // Use midpoint to show both user and POI)
          } else { // Top-down view: center on POI
            webscene.view.goTo({
              position: {
                latitude: selectedPOI.latitude,
                longitude: selectedPOI.longitude,
                z: altitude
              },
              tilt: tilt,
              heading: heading
            });
          }
        } 
      }
    });
  });
}

// ** Change Compass Button Properties based on state
function resetCompassButtonProperties(isVisible, isActive, opacity, backgroundColor, borderColor, textColor) {
    const compassIcon = compassButton.querySelector('calcite-icon');
    compassButton.style.display = (isVisible && !isLegendExpanded) ? 'block' : 'none';
    compassButton.classList.toggle('active', isActive);
    if (compassIcon) compassButton.appendChild(compassIcon); // Ensure icon stays
    compassButton.style.opacity = opacity;
    compassButton.style.backgroundColor = backgroundColor;
    compassButton.style.borderColor = borderColor;
    compassButton.style.color = textColor;
    // Optionally update CSS variables for Calcite theme
    compassButton.style.setProperty('--calcite-button-background-color', backgroundColor);
    compassButton.style.setProperty('--calcite-button-border-color', borderColor);
    compassButton.style.setProperty('--calcite-button-text-color', textColor);
  }

function updateCompassButtonState() {
  if (!trackButton) {
    console.error("Track component not found.");
    return;
  }

  // **** FALL BACK FOR SETTING THE COMPASS BUTTON STATE (As this is called continuously))
  // Otherwise, a bug when track button pressed when compass is ON. 
  // Track gets deactivated, but SmoothedHeading is still used
  if (compassButton.style.display === "none" && !isTracking) { //!trackButton.tracking
    compassOn_NoPOI = false;
    compassOn_POI = false; // Reset compass state
  }

  // Check if the initial location is acquired after the app begins
  if (isInitialLocationAcquired) { 
    if (isTracking) {
      console.log("Track is enabled. State: ", isTracking);
      if (isCompassActive) { // Show and activate the compass button
        resetCompassButtonProperties(true, true, '1', '#28a745', '#218838', '#ffffff');
      } else { // Show and deactivate the compass button
        resetCompassButtonProperties(true, false, '1', '#f8f8f8', '#d1d1d1', '#151515');
      }     
    } else {  // Hide and deactivate the compass button
      console.log("Track is inactive. State: ", isTracking);
      resetCompassButtonProperties(false, false, '1', '#f8f8f8', '#d1d1d1', '#151515');
      deactivateCompass();
    }
  } else { // If the initial location is not acquired YET
    if (isTracking) {  // trackButton.tracking && trackButton.state !== "waiting"
      console.log("Initial location acquired. Track state: ", isTracking);
      isInitialLocationAcquired = true;
      if (isCompassActive) { // Show and activate the compass button
        resetCompassButtonProperties(true, true, '1', '#28a745', '#218838', '#ffffff');
      } else { // Show and deactivate the compass button
        resetCompassButtonProperties(true, false, '1', '#f8f8f8', '#d1d1d1', '#151515');
      }
    } else { // Hide and deactivate the compass button
      console.log("Waiting for initial location or track state is: ", isTracking);
      resetCompassButtonProperties(false, false, '1', '#f8f8f8', '#d1d1d1', '#151515');
      deactivateCompass();
    }
  }
}

function deactivateCompass() {
  if (isCompassActive) {
    isCompassActive = false; // Deactivate the compass
    console.log("Compass deactivated because tracking is inactive.");
  }
}

//* Handling Magnetic Interference: Check if the compass accuracy is acceptable
function isCompassReliable(event) {
  if (event.webkitCompassAccuracy && event.webkitCompassAccuracy > 10) { // Check for iOS devices
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
      [MAP] Heading: ${webscene.view.camera !== undefined ? webscene.view.camera.heading.toFixed(2) : "N/A"}°,
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
	    Rolling: ${smoothedRolling !== null ? smoothedRolling.toFixed(2) : "N/A"}° <br>
      [MAP] Heading: ${webscene.view.camera !== undefined ? webscene.view.camera.heading.toFixed(2) : "N/A"}°,
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

let isAbsoluteOrientation = false; // Flag to check if the device is in absolute orientation mode
let headingOffset = 0; // Amount of manual heading offset

// * Add Event Listeners for Device Orientation Sensors (for compass)
// ** Disable buttons initially before the "Okay" is clicked on Heading Adjustment * //
function prepareOrientationSetup() {
// Called after initial calibration is complete
    updateGPS();
    // (1) --- Orientation setup ---
    if ("ondeviceorientationabsolute" in window) {
      isAbsoluteOrientation = true;
      window.addEventListener("deviceorientationabsolute", (event) => {
        window.lastOrientationEvent = event; // Store the latest event
        updateOrientation(event);
        updateOrientationIndicator();
        motionReady = true;
      }, true);
    } else {
      isAbsoluteOrientation = false;
        window.addEventListener("deviceorientation", (event) => {
          window.lastOrientationEvent = event; // Store the latest event
          updateOrientation(event);
          updateOrientationIndicator();
          motionReady = true;
      }, true);
    }

    // (2) Add event listener for Buttons -> Pre-requisite for other buttons
    // --- Heading adjustment controls ---
    const toggleHeadingAdjBtn = document.getElementById('toggle-heading-adjust');
    const manualSlider = document.getElementById('manual-heading-slider');
    const manualValue = document.getElementById('manual-heading-value');
    const manualControls = document.getElementById('manual-heading-controls');
    const headingMsg = document.getElementById('manual-heading-message');
    const headingYesBtn = document.getElementById('manual-heading-yes');
    let adjustmentVisible = false;

    const orientationIndicator = document.getElementById('orientation-indicator');
    // Disable buttons initially
    toggleHeadingAdjBtn.disabled = true;
    document.getElementById('compassButton').disabled = true;
    document.getElementById('toggleView').disabled = true;

    headingMsg.style.display = 'none'; // Hide the manual heading message modal initially
    orientationIndicator.style.display = 'flex'; // Show the orientation indicator

    // (2.1) Enable buttons only after "Okay" is clicked
    headingYesBtn.addEventListener('click', () => {
      headingMsg.style.display = 'none';
      toggleHeadingAdjBtn.disabled = false;
      document.getElementById('compassButton').disabled = false;
      document.getElementById('toggleView').disabled = false;
    });

    // (2.2) Always add event listener for heading adjust button
    if (toggleHeadingAdjBtn) {
      toggleHeadingAdjBtn.addEventListener('click', () => {
        if (toggleHeadingAdjBtn.disabled) return; // Ignore clicks if disabled
        adjustmentVisible = !adjustmentVisible;
        if (adjustmentVisible) {
          manualControls.style.display = 'block'; // Show the manual controls
          toggleHeadingAdjBtn.textContent = 'Hide'; // Change button text to "Hide"
        } else {
          manualControls.style.display = 'none'; // Hide the manual controls
          toggleHeadingAdjBtn.textContent = 'Adjust'; // Change button text to "Adjust"
        }
      });
    }

    // Update headingOffset when slider changes
    if (manualSlider) {
      manualSlider.addEventListener('input', function() {
        headingOffset = parseInt(this.value, 10);
        if (manualValue) manualValue.textContent = headingOffset;

        updateOrientation();
    });
  }

  updateDisplay();
}

//* Rotate POI in AR around the user based on the heading offset */
function rotateARPOIWithOffset(currentLat, currentLon, poilat, poilon, headingOffsetDegrees) {
  const toRadians = deg => deg * Math.PI / 180;
  const toDegrees = rad => rad * 180 / Math.PI;
  // Convert lat/lon to Cartesian coordinates (meters)
  const earthRadius = 6378137; // in meters
  const latRad = toRadians(currentLat);
  const dx = (poilon - currentLon) * (Math.PI / 180) * earthRadius * Math.cos(latRad);
  const dy = (poilat - currentLat) * (Math.PI / 180) * earthRadius;
  // Apply 2D rotation
  const angleRad = toRadians(headingOffsetDegrees);
  const rotatedX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
  const rotatedY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
  // Convert back to lat/lon
  const newLat = currentLat + (rotatedY / earthRadius) * (180 / Math.PI);
  const newLon = currentLon + (rotatedX / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
  return {
    latitude: newLat,
    longitude: newLon
  };
}

// * Show a Message for Motion-8 Drawing Calibration * //
function showCalibrationModal() {
  const modal = document.getElementById('calibration-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Add or select a countdown element inside the modal
    let countdown = modal.querySelector('#calibration-countdown');
    if (!countdown) {
      countdown = document.createElement('div');
      countdown.id = 'calibration-countdown';
      countdown.style.fontWeight = 'bold';
      countdown.style.textAlign = 'center';
      countdown.style.color = '#ffffff';
      modal.querySelector('div').appendChild(countdown);
    }

    let secondsLeft = 10; // 10-15 Seconds countdown (If we know for sure compass is calibrated, that's better than manual waiting)
    countdown.textContent = `Taking you to AR Screen in ${secondsLeft}`;

    const proceedToAR = () => {
      modal.style.display = 'none';
      isCompassCalibrated = true;
      
      document.getElementById('loadingIndicator').style.display = 'block';
      document.getElementById('loadingIndicator').textContent = "Waiting for Camera and Orientation...";
      prepareOrientationSetup();
      injectARSceneAndWaitForCamera(() => {
        // Now it's safe to add POIs
        updateDisplay();
      });
    };

    // Countdown auto-proceed
    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        countdown.textContent = `Taking you to AR Screen in ${secondsLeft}`;
      } else {
        clearInterval(interval);
        proceedToAR();
      }
    }, 1000);

    // Handle skip button
    const skipBtn = document.getElementById('calibration-skip-btn');
    if (skipBtn) {
      skipBtn.onclick = () => {
        clearInterval(interval);
        proceedToAR();
      };
    }
  }
}

// ** Use this to get away with the AR Scene injection's problem
function injectARSceneAndWaitForCamera(onCameraReady) {
  let arScene = document.body.querySelector('a-scene');
  if (!arScene) {
    arScene = document.createElement('a-scene');
    arScene.setAttribute('vr-mode-ui', 'enabled: false');
    arScene.setAttribute('arjs', 'sourceType: webcam; videoTexture: true; debugUIEnabled: false');
    arScene.setAttribute('renderer', 'antialias: true; alpha: true');
    arScene.innerHTML = `
      <a-entity id="cameraRig">
        <a-camera gps-new-camera rotation-reader id="arCamera">
          <a-entity
            id="raycaster-entity"
            cursor="fuse: false; rayOrigin: mouse"
            geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
            material="color: black; shader: flat"
            position="0 0 -1"
            visible="false"
            raycaster="objects: .clickable; near: 0.1; far: 100000">
          </a-entity>
        </a-camera>
      </a-entity>
    `;
    const bottomContainer = document.getElementById('bottom-container');
    if (bottomContainer && bottomContainer.parentNode) {
      bottomContainer.parentNode.insertBefore(arScene, bottomContainer);
    } else {
      document.body.appendChild(arScene);
    }
    arScene.addEventListener('loaded', () => {
      // Wait for gps-new-camera to get its first position
      const gpsCamera = arScene.querySelector('[gps-new-camera]');
      if (gpsCamera) {
        gpsCamera.addEventListener('gps-new-camera-update-position', () => {
          if (typeof onCameraReady === "function") onCameraReady();
        }, { once: true });
      } else {
        if (typeof onCameraReady === "function") onCameraReady();
      }
    });
  } else {
    if (typeof onCameraReady === "function") onCameraReady();
  }
}

function updateOrientationIndicator() {
  const orientationMode = document.getElementById('orientation-mode');
  // const manualControls = document.getElementById('manual-heading-controls');
  const indicator = document.getElementById('orientation-indicator');

  if (isAbsoluteOrientation) {
    orientationMode.textContent = "";
    // orientationMode.textContent = "(Absolute Orientation) ";
    // manualControls.style.display = "none";
  } else {
    orientationMode.textContent = "";
    // orientationMode.textContent = "(Relative Orientation) ";
    // manualControls.style.display = "none";
  }

  // Compass reliability message
  let reliabilityMsg = indicator.querySelector('#compass-reliability');
  if (!reliabilityMsg) {
    reliabilityMsg.id = 'compass-reliability';
    reliabilityMsg.style.marginLeft = '8px';
    indicator.appendChild(reliabilityMsg);
  }

  if (window.lastOrientationEvent) {
  let accuracyText = "";
  // For iOS devices, display accuracy if available
  if (window.lastOrientationEvent.webkitCompassAccuracy !== undefined) {
      accuracyText = `Compass may be off by up to ${window.lastOrientationEvent.webkitCompassAccuracy.toFixed(1)}°`;
      reliabilityMsg.textContent = accuracyText;
      reliabilityMsg.style.color = "#ffffff";
    } else {
      // For Android/other devices, accuracy is not available
      reliabilityMsg.textContent = "Compass accuracy data not provided";
      reliabilityMsg.style.color = "#ffffff";
    }
  } else {
    reliabilityMsg.textContent = " Compass: Checking...";
    reliabilityMsg.style.color = "#ffffff";
  }
}

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

//**  */ Function to toggle the data source
// function toggleDataSource() {
//   useFilteredData = !useFilteredData;
//   document.getElementById('toggleGPSButton').textContent = useFilteredData ? 'Use Raw GPS' : 'Use Filtered GPS';
//   // console.log("useFilteredData: ", useFilteredData);
// }


// Add event listener to the toggleGPS button
// document.getElementById('toggleGPSButton').addEventListener('click', toggleDataSource);

// FOR ERROR LOGGING 
window.onerror = function(message, source, lineno, colno, error) {
  document.getElementById('debug-overlay').innerText =
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}, Col: ${colno}`;
};

// Use a debounce function to limit how often updateDisplay() runs:
// Prevents updateDisplay() from being called too frequently when the slider is moved rapidly.
// Improves performance and stability by reducing unnecessary DOM updates and data processing.
let debounceTimeout;
function debounceUpdateDisplay() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(updateDisplay, 200); // 200ms delay
}

// Add event listener to the slider to update thresholdDistance
document.getElementById('distanceSlider').addEventListener('input', function(event) {
  thresholdDistance = event.target.value;
  updateDistanceValue(thresholdDistance);
  // updateDisplay(); //Update Display with new threshold
  debounceUpdateDisplay();
});

function updateDistanceValue(distance) {
  document.getElementById('distanceValue').textContent = `${distance} m `;
}

function updatePOICounter(poiCount) {
  document.getElementById('poi-counter').textContent = `(${poiCount})`;
}

// Utility to animate compass button to a specific position (To Save Map Space)
function animateCompassToPosition(targetBottom, duration = 300) {
  const startBottom = parseInt(compassButton.style.bottom, 10) || 70;
  const endBottom = parseInt(targetBottom, 10);
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentBottom = startBottom + (endBottom - startBottom) * progress;
    compassButton.style.bottom = `${currentBottom}px`;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      compassButton.style.bottom = `${endBottom}px`;
    }
  }
  requestAnimationFrame(step);
}

// Utility to move compass button to track position with animation
function moveCompassToTrackPosition() {
  animateCompassToPosition(24); // Animate to bottom: 30px
}

// Utility to restore compass button to its default position with animation
function restoreCompassPosition() {
  animateCompassToPosition(68); // Animate to bottom: 70px
}


//** */ Custom Compass Button Toggle
document.getElementById('compassButton').addEventListener('click', () => {
  isCompassActive = !isCompassActive; // Toggle the compass state

  // Compass gets turned on
  if (isCompassActive === true) {
    resetCompassButtonProperties(true, true, '1', '#28a745', '#218838', '#ffffff');
    toggleViewButton.style.display = 'none'; // Hide the toggleView button (View tilt controlled by motion)
    trackButton.style.display = 'none'; // HIDE the track button when compass is ON
    moveCompassToTrackPosition();
    console.log("Compass activated. WebScene will follow device heading.");

  } else { // Compass gets turned OFF (Track is on) && 
    resetCompassButtonProperties(true, false, '1', '#f8f8f8', '#d1d1d1', '#151515');
    toggleViewButton.style.display = 'block'; // Show the toggleView button
    trackButton.style.display = 'block'; // HIDE the track button when compass is ON
    restoreCompassPosition();
    console.log("Compass deactivated. Reset to default heading:", defaultHeading);
  }

  //********/ Compass TURNS ON => Take care of this in updateOrientation()
  // (1) No POI selected, tracking is ON, Compass turns ON
  if (!selectedPOI && isTracking && isCompassActive === true) { // !selectedPOI && trackButton.tracking === true && isCompassActive === true
    compassOn_NoPOI = true; // Flag to indicate compass is ON without POI
    compassOn_POI = false;
    return;
  }

  // (2) POI selected, tracking is ON, Compass turns ON
  if (selectedPOI && isTracking && isCompassActive === true) { //selectedPOI && trackButton.tracking === true && isCompassActive === true
    compassOn_POI = true;
    compassOn_NoPOI = false;
    return;
  }

  //********/ Compass turned OFF
  // (3) Compass turns OFF, while POI selected,  tracking still ON
  if (isCompassActive === false && selectedPOI && isTracking) { // isCompassActive === false && selectedPOI &&  trackButton.tracking === true
    compassOn_NoPOI = false;
    compassOn_POI = false;
    return;
  }

  // (4) Compass turned OFF, tracking still ON, When No POI selected, 
  if (isCompassActive === false && !selectedPOI && isTracking) { // isCompassActive === false && !selectedPOI && trackButton.tracking === true
    compassOn_NoPOI = false;
    compassOn_POI = false;
    return;
  }

});

// legend-expand -> button visibility 
// To get away with problems of Buttons going on top of Expanded Window
document.addEventListener('DOMContentLoaded', () => {
  const expand = document.getElementById('legend-expand');
  const compassButton = document.getElementById('compassButton');
  const toggleView = document.getElementById('toggleView');
  const trackButton = document.getElementById('track');
  
  if (expand) {
    const observer = new MutationObserver(() => {
      isLegendExpanded = expand.hasAttribute('expanded');
      if (isLegendExpanded) {
        if (compassButton) compassButton.style.display = 'none';
        if (toggleView) toggleView.style.display = 'none';
        if (trackButton && isTracking) trackButton.style.display = 'none'; // Hide track button when legend is expanded
        if (trackButton && !isTracking) trackButton.style.display = 'none';
        if (isCompassActive) trackButton.style.display = 'none';
        // POP UP GOES INVISIBLE
        // Adding the pop up container info here, as it's not available in the initial DOM load
        const popUpContainer = document.getElementById('popup-container');
        if (popUpContainer) {
          console.log("There is a pop up")
          popUpContainer.style.display= 'none'; // Hide the popup container when legend is expanded
        }
      } else {
        // Only show compassButton if it should be visible per app logic
        updateCompassButtonState();
        if (toggleView) toggleView.style.display = '';
        if (trackButton) trackButton.style.display = ''; // Show Unless compass is active
        if (isCompassActive) trackButton.style.display = 'none'; // Hide track button when compass is active
        // POP UP GOES VISIBLE AGAIN, if it's available in DOM
        const popUpContainer = document.getElementById('popup-container');
        if (popUpContainer) {
          popUpContainer.style.display= 'block';  // Show legend is expanded
        }
      }
    });

    observer.observe(expand, { attributes: true, attributeFilter: ['expanded'] });
  }
});

// // Start GPS updates 
// updateGPS();