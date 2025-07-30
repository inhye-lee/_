# AR Location Viewer w/AGO-hosted Point Data 

GeoAR Team's Mobile Web AR Codebase Documentation 

[Live Demo](https://inhye-lee.github.io/_/17_UC25Demo_WebARIntegration/) (Expires in Aug 31 2025)

---

## Ongoing Updates 
**July 18**- Migrated to new location based components 
- gps-entity-place → gps-new-entity-place
- gps-camera → gps-new-camera
- index.html to include the new AR.js libraries
**July 17**
- Implemented the selected POI state to persist in the reloaded AR scene by checking poi ID in reloads
**July 17**
- Improvement on the AR-WebScene integration
  - Maintaining Zoom Level on POI/Tracking Selection:
  - User can fully utilize the map 2d and 3d and interact
  - Refining Compass Behavior with POI Selection (Honoring the last user action)
  - Zoom: zoom in and out in all views without snapping back
  - Removed featureReduction to prevent an AR-selected POI invisible in the webscene due to feature layer decluttering
  - Unresolved Issue: User Location Positioning 
**July 15**
- Replaced Maps SDK's track component w/custom current location tracking (geolocation API) & Maps SDK graphic
**July 14**
- Debounce logic for distant slide to prevent from crashing

---

## Overview (As of July 11 2025)

This codebase implements a cross-platform **Mobile Web AR Location Viewer** using **Vanilla JavaScript**  with **AR.js/A-Frame** for AR and **ArcGIS Maps SDK for JavaScript** for geospatial data queries and mapping. The app is built without any front-end frameworks, relying on standard JavaScript, browser APIs, and third-party libraries to enable users to view and interact with location-based POIs in both a Camera view (AR) and a synchronized 3D web map (WebScene in our case).

We chose AR.js for its broad compatibility and ease of use in cross-browser web AR applications. However, it is less advanced than alternatives like WebXR (more mature on Android) or 8th Wall (a paid, cross-browser solution). At the moment, AR.js offers a balance between accessibility and functionality for (cost-effective) basic location-based application.

This document describes the libraries used in this project and details the ongoing design and engineering strategies we are employing to address specific challenges and technical limitations encountered during development. 

**Note**: _This code is a work in progress and is being developed through rapid prototyping to explore location-based Web AR solutions and to demonstrate a proof of concept. It has not undergone the formal code review process typically required for production-ready software._

---

## Data in Use
For this demo, we are using the [Point Locations of 2023–2024 Public Elementary and Secondary Schools](https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Locations_Current/FeatureServer/) dataset publicly available on ArcGIS Online. We chose this dataset because it includes schools from all U.S. states, making it ideal for testing across diverse geographic locations—especially helpful given our distributed team. 

<div align="center">
<img width="600" alt="image" src="https://github.com/user-attachments/assets/557e9cd1-7163-47b1-a057-0c9e4ec5b2de" />
  <p><em>Point Locations</em></p>
</div>

<div align="center">
 <img width="600" alt="image" src="https://github.com/user-attachments/assets/78d31fdb-513f-484e-9284-7251606b4e5e" />
  <p><em>Fields Available (Queriable) in the Dataset</em></p>
</div>

We also envision this app as a prototype for a disaster shelter location viewer. In that context, the school location dataset serves as a useful placeholder, since some of these school locations can be used as actual shelters in a real-world scenario.

However, this dataset is quite literally is a collection of school locations and not specifically created as a dataset for shelter information. For instance, it lacks critical attributes such as real-time availability, capacity, or elevation, which would be essential in scenarios like severe storm surge. To develop a fully functional shelter viewer app, the dataset would need to be enhanced or re-created with one that includes these key details and the content will have to be maintained periodically.

## Libraries in Use

### [AR.js](https://ar-js-org.github.io/AR.js-Docs/)
- Enables location-based AR experiences directly in the browser.
- Provides access to the device camera, orientation sensors, and basic AR rendering.
- For location-based AR Labels, the classic location-based component from Ar.js [gps-entity-place] (a component provided by the AR.js library for A-Frame) is used.  This component places AR entities at real-world coordinates based on the user's current GPS location. Internally, it likely uses the Haversine formula to calculate distances between coordinates, which comes in w/known limitation (described below in Achieving Location & Directional Accuracy section)

### [A-Frame](https://aframe.io/)
- Declarative 3D scene framework built on top of Three.js.
- Used to define virtual objects (a-entities), custom components (e.g., POI labels, popups, raycasting), and manage AR interactions.
- For location-based AR label display, we currently use custom entity structure (AR Label's Line + Image Symbol + POI Title) within [gps-entity-place] entity and use custom scaling logic based on distance.  

### [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/)
- Renders a 3D WebScene using geospatial data hosted on ArcGIS Online
- Provides APIs for:
    - Feature querying and rendering
    - Reverse geocoding
    - Real-time location tracking
    - Category-based filtering and dynamic map updates
      
- This codebase referenced a few available ArcGIS Maps SDK for JS Tutorial Examples: 
    - Create a webscene:
       - https://developers.arcgis.com/documentation/mapping-and-location-services/mapping/tutorials/tools/create-a-web-scene/ 
    - Change point symbols of a feature layer in the web scene:
       - https://developers.arcgis.com/javascript/latest/sample-code/visualization-point-styles/
    - Add an UI to toggle views:
       - https://developers.arcgis.com/javascript/latest/sample-code/visualization-label-callout/
    - Track the current user location (Works on WebScene as well):
       - https://developers.arcgis.com/javascript/latest/sample-code/widgets-track-basic/
    - Simple Query & Pop Up Display in a webscene from a feature layer data field:
       - https://developers.arcgis.com/javascript/latest/sample-code/query/
    - Use custom graphic for user location (track)
       - https://developers.arcgis.com/javascript/latest/tutorials/display-your-location/ 

### [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- Used to retrieve the user's real-time location.
- Feeds location data to both the AR scene and the ArcGIS WebScene for synchronized positioning.

### [GeographicLib](https://geographiclib.sourceforge.io/)
- Used for precise geodesic distance calculations between two geographic coordinates. (User's current Location & POI Coordinates)
- Unlike the Haversine formula (which assumes a spherical Earth), GeographicLib uses Karney’s algorithm, which models the Earth as an ellipsoid (WGS84), offering higher accuracy—especially over long distances or near the poles.
- In this project as of now, we only used GeographicLib to:
  - Display accurate distances between the user and POIs.
  - Dynamically scale AR symbols () based on distance.
- Note: *We currently do not override the internal distance calculations of gps-entity-place by aframe, which appears to use the Haversine formula by default.* (June 12 2025)
  
--- 

## Known Limitations
- **AR.js Limitations:**
  - AR.js relies mainly on GPS and compass data & does not use advanced computer vision techniques (like SLAM or VPS) for tracking, as a result: 
    - No persistent anchors or advanced pose estimation.
    - No occlusion or world understanding
      - Virtual objects always appear on top of the camera feed and do not interact with real-world geometry.
      - No world understanding (cannot detect surfaces, anchor to them, or understand depth).
    - Tracking is less robust than platforms like WebXR or 8th Wall, leading to possible drifting or instability of virtual objects.
  - [gps-entity-place] vs [gps-projected-entity-place]: According to AR.js's [documentation](https://ar-js-org.github.io/AR.js-Docs/location-based/#:~:text=This%20component%20makes%20each%20entity,negative%20the%20current%20camera%20height.), newer location-based component [gps-projected-entity-place] is supposed to be more accurate for POIs in longer distance than the classic component [gps-entity-place]. Other differences: it uses Spherical Mercator Projection for lat/lon; it Supports AR polylines and polygons (This can be a good reason to switch); it is more modular. 
    - While ongoing updates on other functional improvements are being made on ES6-conversion branch, we have tested the newer component in a separate Github Branch ([gps-new-entity-place-test](https://github.com/inhye-lee/GeoAR/tree/gps-new-entity-place-test)), as part of our ongoing efforts to improve location accuracy. The following changes are made:
    - gps-entity-place → gps-new-entity-place
    - gps-camera → gps-new-camera
    - Added the required AR.js library in index.html
  - Testing Results:
    - The new setup works well overall.
    - In the internal team's testing, visual output looks nearly identical to the previous version, when the custom scaling is applied. 
  - Issues:
    - Manual cameraRig adjustment (using a slider for AR scene heading offset) no longer works to translate the scene. It looks like the new component internally doesn't let the [gps-new camera]'s parent (an empty a-entity called #cameraRig) to change the rotation w/headingOffset. For, [gps-camera] in the old component, exact same code would work. As an alternative, the team was trying to set a wrapper for individual POIs and make offset to be applied to that wrapper, it doesn't seem to work either.
    - Suggestion from Tech lead: (June 16 2025) Instead of using "look-at" attribute, explore alternative methods or properties that allow the entity to orient parallel to the screen. This suggestion hasn't been tried. We'll revisit this component later. 
    - Spherical projection may cause distortion near the poles. (This may be the same for the classic component)

- **Performance Issue & Known bugs:**
  - Rendering a large number of POIs in AR can be demanding, especially on low-end or older devices, potentially resulting in lag or browser instability.
  - Have noticed app crashing with new updates or with no updates
     - This may be due to multiple reasons, though we are not too sure:
        - Webscene can be taxiing
        - There may be invisible POIs when "refreshing" with distance slider
  - App & Webscene Integration needs improvement
     - Comments we got from internl review session:
        - Webscene needs to behave as in a navigation app, where blue dot stays in user location.
        - User should zoom or drag to different part of the web without getting forced back to the center.
           - This has not been resolved with maps sdk's track component
           - May need to write our own "user location" display?
  - Scene manual translation only works with `gps-entity-place` for now
     - If we want to incorporate polygon or path data, we'll either have to resolve this issue or ditch the scene translation (manual adjustment of the AR Scene)
     - Otherwise, switching to `gps-new-entity-place` has been tested and works fine
  - There's some differing level of inaccuracy for each device's compass
     - This can cause inaccurate orientation ("Where is the north") in AR view
     - There can be heading difference between AR view and Map View 
 - When the AR scene refreshes, the selected (pinned) state doesn't get transferred to the next
 - The distance text does appear on top of the POI does not seem to get refreshed when user walks along towards the POI. Something to investigate into.
 - Edge case: Though it was necessary to use the "state" data to query POIs near the user, if a user is close to multiple states, it may not be the best experience in AR to pull data from only one US state, Querying has to be based on distance, but also needs to be performant.  

- **Platform and Compatibility Issues:**
  - Sensor APIs (compass, orientation) behave differently on iOS and Android, requiring platform-specific code and sometimes leading to inconsistent experiences.
  - Not all browsers or devices support identical features, which may limit functionality or cause inconsistent behavior.
    - For example, Haptic Response is unavailable on most iOS mobile web-browsers while it is available on android.

---

## Design, Engineering, and Performance Considerations 
Some of these points are covered in the App Overview in more detail in some cases, but here are key considerations we’ve taken into account during design & development:

### Migration from ArcGIS Widgets to Components
- **Why:**  
  - Location [Tracking Widget](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Track.html) in particular is deprecated, and caused jitter and performance issues when used in the WebScene or in the WebMap.
  - Location Tracking Component showed a signficant improvement in stability.
  - Moreover, Esri is moving towards a component-based architecture for better modularity and future support.
    - [Transition Plan](https://developers.arcgis.com/javascript/latest/components-transition-plan/)  
- **How:**  
  - Replaced widgets with ES6 ArcGIS components and direct API usage.
  - Improved control over location updates

### User's Current Location Tracking 
- **Prior Problem:**  
  - As addressed in Migration from ArcGIS Widgets to Components, the built-in widget caused frequent, erratic jumps in the user's location on the map.
- **Current Solution:**  
  - Directly use the Geolocation API and ArcGIS Track component for smoother, more reliable updates.
  - Apply Kalman filtering to GPS data for further smoothing.
- **What can be improved**
  - Currently, we are using the track componenet in webscene. In our attempt to provide a complementary experience between AR & Webscene, however, we realized some of the built in track component's behavior may need to be rewritten. 

### Improving GPS & Orientation Accuracy 
- **GPS Value Smoothing:**  
  - Problem: Raw GPS data is noisy, causing AR labels to blink w/subtle changes if not noise-filtered.
  - Solution:
    -  Use Kalman filter (`filteredLat`, `filteredLon`) to smooth GPS input before updating AR and map positions.
    -  Update GPS only when there's significant change 
- **iOS & Android Compass Differences:**  (Mentioned in more detail in app overview)
  - iOS: Uses `webkitCompassHeading` for more accurate heading.
  - Android: Uses `deviceorientationabsolute` alpha value, with custom smoothing and normalization
    
### Creating Geo-cognizant AR Labels 
- Mentioned in App Overview POI display 

#### Utilizing `gps-entity-place`
- Places AR entities at real-world coordinates using latitude/longitude.
#### Scaling & Sizing Options
- Dynamic scaling of AR labels and lines based on distance to user, to maintain readability and spatial context.
- Current Distance Range-based scaling (Near - MidRange - Far) when displaying POIs
- Clamp the size for near distance
- Proportionally change the size for POIs after far distance threshold
- Text Label stays the same for all ranges to help with legibility
- Good enough scaling method at the moment but not perfect
- *Improved behavior may need to be developed later*

### Filtering AR Labels  
- Only displays POIs within a user-defined distance threshold
- Improving User experience, performance and reducing clutter.

### Performance Improvements: Batch Processing
- **Prior Problem:**  
  - Rendering many POIs at once caused UI freezes and slowdowns.
- **Current Solution:**  
  - Loads POIs in batches using a `while` loop and `setTimeout`, keeping the UI responsive.

### Provide Complementary Geographic Understanding

#### AR-WebScene Split View
- Users can see both the AR scene and the 3D webscene simultaneously to enhance their spatial awareness.
- However, in the version developed as of now, we realize the complementary screen can introduce some confusion to the users as well, especially when the Map (Webscene) does not work as users expect. This issue is to be further investigated. _(More Work TBD)_

#### Synchronized POI Interaction
- Selecting a POI in AR highlights and opens it in the WebScene, and vice versa.
- Only one POI is "pinned" at a time; closing a popup unpins all.
- Achieved via custom events (`ar-poi-selected`, `web-poi-selected`, etc.) and shared OBJECTID identifiers.

### UI/UX: 
**Providing Easy to Comprehend Feedback for Users to indicate the stage of their experience**
It can be unclear for users what is happening in the background so we tried to include clear feedback when data is still being loaded or the app is waiting for sensor inputs. 

**Managing Limited Screen Real Estate on Mobile: Reducing AR Clutter**
The AR screen can easily become visually overwhelming, especially since the user’s interface is essentially the real world which exists beyond the controlled environment of UI design. In our app, this challenge is amplified by containing the two worlds - split view (AR + Map) - and the fact that it runs in a web browser, where the address bar further reduces usable screen space. To create a cleaner and more user-friendly experience, we’ve made the following design decisions:
- Collapsible Pop-up Windows: Users can collapse pop-ups to free up screen space when not needed.
- Distance-Based POI Filtering: Only POIs within a user-defined distance threshold are displayed. This can help reduce visual clutter and improves performance and also help user with decision making, as too many POIs can overwhelm rather than help.
  
**Upcoming Improvements**
- We plan to refactor UI elements (e.g. redesign the debug screen) to further reduce clutter and enhance usability. 

---

## 📱 App Overview 
This AR + Map hybrid application delivers a complementary Split View experience, combining a more intuitive, immersive AR interface with a comprehensive map-based spatial overview. 

This section outlines the general progress of the app for the end user and provides explanations of how each step is implemented, alongside relevant information and research we have done that can be referenced by other teams. 

### 0. Split View and WebScene Config
When `DOMContentLoaded`, a split view is set up via `enablePanelResizing()`.  `initSceneView()`  is where the app loads the ArcGIS Maps SDK api modules, configures the webscene and overwrites the default behavior of the track component of Maps SDK. 

```
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
```

### 1. Device Calibration
The `showCalibrationModal()` function is triggered within the `DOMContentLoaded` event listener, giving users a chance to calibrate their device by performing a figure-8 motion. This exposes the device’s magnetometer to a full range of directions, helping improve orientation accuracy. This calibration step takes place before:
- Any permission prompts appear when the AR scene is loaded.
- The user accesses the Split View screen.

**Is the "figure 8" motion still relevant?**
When the mobile app doesn't use more advanced techniques like Visual Positioning Systems (VPS) or external GNSS receivers with centimeter-level accuracy, this basic motion-based calibration method is known to be helpful. This method serves as a fallback when absolute orientation data is unavailable or when users are reluctant to perform more involved calibration steps. 

This step is added in the beginnning of the user experience, as moving the device in a figure 8 pattern can help the magnetometer (compass) in the following ways: 
- Samples the magnetic field from multiple angles
- Identifies and corrects for local magnetic interference
- Recalibrates its internal model of the magnetic environment
- Improves orientation accuracy

A "Skip" button is added to avoid user drop-off, knowing the [reluctance of the general users](https://www.reddit.com/r/GooglePixel/comments/fejwlw/the_compass_figure_8_thing_for_location_accuracy/).

_Reference: More advanced motion-based calibration methods exist, even for basic mobile devices. For example, some GIS applications guide users to specific waypoints on a map to perform calibration. This allows the app to align the user's real-world position with their virtual location, enabling orientation adjustments (offsetting) based on the comparison. While this approach can offer higher accuracy, it can be too complex for casual users due to the structured calibration steps. For this reason, we chose not to implement this method in our current demo._

### 2. Update GPS, Orientation setup, Add AR Scene, Permission Request 

```
function showCalibrationModal() {
 // Existing Code...

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

    // Code to call proceedToAR() when user skips the calibration or finishes it..
  }
}
```

When the user proceeds from the calibration modal, the app starts GPS and orientation tracking, injects the AR scene.
App executes the following in `proceedToAR()` inside `showCalibrationModal()` quoted above. 

#### (1) **prepareOrientationSetup()**
   - **updateGPS():**
     - Starts watching the device’s GPS.
     - Continuously updates the user’s latitude and longitude (with Kalman filtering for smoothing).
     - Triggers `updateDisplay()` when location changes significantly and calibration is complete.
   - **Check device orientation:**
     - Adds event listeners for device orientation events (`deviceorientationabsolute` or `deviceorientation`).
     - Detects if the device provides absolute or relative orientation.
   - **updateOrientation(event):**
     - Receives raw sensor values (heading, tilting, rolling) from the device.
     - Smooths these values for stability.
     - Updates the AR camera rig’s rotation and, if compass mode is active, updates the map camera as well.

#### (2) **injectARSceneAndWaitForCamera(onCameraReady)**
   - Injects the AR scene (`<a-scene>`) into the DOM if not already present.
   - Waits for the AR camera to be ready (i.e., for the first GPS fix).
   - Once ready, calls the provided callback (`onCameraReady`).

#### (3) **updateDisplay()**
   - Called after the AR camera is ready.
   - Clears any existing AR POIs.
   - Loads and displays new POIs based on the user’s current location and state.
   - Ensures the AR scene is populated with geolocated POIs.

**GPS Sensor Noise Filtering**

When you first test out, your location-based POIs may flicker, it's most likely because the gps receiver would give us continuous stream of changing data for every little change. As mentioned above, Kalman filter is used for smoothing GPS values for noise filtering and also a significant change in GPS value (`changeThreshold`) is checked so we don't update the AR scene too often.

In the function updateGPS(): 
```
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
```

Below is a scene from our debugging proccess. 

<div align="center" style="border:none; box-shadow:none;"> 
 <video src="https://github.com/user-attachments/assets/232028fd-114d-4a7f-81c5-3de8972bd208" controls width="300"></video>
 <p><em>Raw VS Filtered</em></p>
</div>

**a-scene**

When an HTML page containing the `<a-scene>` tag is loaded, the browser immediately prompts the user for access to the camera or device orientation sensors. In the current code implementation above, the AR scene is dynamically injected using the `injectARSceneAndWaitForCamera()` function. This approach allows a calibration animation to be shown before the user is prompted with a series of permission dialogs, creating less overwhelming user experience.

However, **if your priority is faster loading of AR Points of Interests**, 
you may prefer to embed the basic AR scene directly into the HTML, as shown below, or may remove the calibration guildelines entirely, and call updateGPS() as soon as the app.js loads. Choose the approach that best aligns with your priority.

```
<body>
<!-- other code in html -->
  <div id="control-container">
  ...
  </div>

  <a-scene vr-mode-ui='enabled: false' arjs='sourceType: webcam; videoTexture: true; debugUIEnabled: false' renderer='antialias: true; alpha: true;'>
    <a-entity id="cameraRig">
      <a-camera gps-camera rotation-reader>
        <a-entity
          id="raycaster-entity"
          cursor="fuse: false; rayOrigin: mouse"
          geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03"
          material="color: black; shader: flat"
          position="0 0 -1"
          visible ="false"
          raycaster="objects: .clickable; near: 0.1; far: 100000"
          >
        </a-entity>
    </a-camera>
    </a-entity>
  </a-scene>

  <div id="bottom-container">
  ...
  </div>
</body>
```

**Device Permission Requests** 

First-time app users are requested to grant the permissions in the following order:
- Location access (Via `updateGPS()`. Currently, it pops up a little after the animation)
- Camera access (when user hits the skip button or timed animation is completed)
- Device orientation access (after camera access)

During our testing, we noticed the user permission asking process defers whether user is on Android or iphone. 
  - iOS (tested on Safari/Chrome): The permission prompt for device orientation appears after camera access. Users may see duplicate system messages related to permissions.
  - Android (tested on Chrome): The orientation permission prompt may be skipped, depending on the browser or device behavior.

<div align="center" style="border:none; box-shadow:none;"> 
 <video src="https://github.com/user-attachments/assets/838b702d-cf18-4cd5-81b1-caf5bbc2eb23" controls width="300"></video>
 <p><em>From Calibration Guidelines to Permission Requests (iOS Safari) </em></p>
</div>

### 3. POIs (Points of Interest) display
Once all permissions are granted, the app loads nearby points of interest (POIs) that are within the user's current U.S. state. The user sees nearby POIs (default threshold was set at 3000 meters) relevant to their current state and location, each rendered as an interactive AR marker with distance-aware scaling and labeling.

Following is the general flow in this process.

#### **(1) Geolocation and Reverse Geocoding**

**Geolocation:**  
  The app uses the browser's `navigator.geolocation` API to get the user's current latitude and longitude (`lat`, `lon`).

**Reverse Geocoding:**  
  The function `getCurrentLocationAndState()` uses the [ArcGIS Locator service](https://developers.arcgis.com/javascript/latest/tutorials/reverse-geocode/) to convert the user's coordinates into a US state abbreviation (`defaultUSState`).  
  This state is used to filter which POIs are shown.

---

#### **(2) Loading POI Data**

**FeatureLayer Query:**  
  The function `loadPOIData()` queries an ArcGIS FeatureLayer for POIs that match the selected state (`selectedState`), which is set by geolocation or user selection in the dropdown included in the webscene.

**Distance Filtering:**  
  For each POI returned, the app calculates the distance from the user's current location using `calculateDistance`.  
  Only POIs within a certain `thresholdDistance` (e.g., 3000 meters) are displayed.

---

#### **(3) Creating and Displaying POIs**

**Batch Processing:**  
  POIs are processed in batches and with while loop for better performance.
 
**Entity Creation:**  
  For each POI within range, `createPOIEntity(poi, curLat, curLon)` is called:
  - This function creates an `<a-entity>` (A-Frame entity) for the AR scene.
  - It sets the POI's position, scale (based on distance), label image (based on US state), and text.
  - It attaches attributes for interactivity (e.g., `toggle-title`, `show-popup`).
  - The entity is appended to the AR scene (`<a-scene>`).

---

#### **(4) POI Visual hierarchy, POI Scaling, Design Questions, Mock Dataset for test**

**POI Entity Visual Elements**
- Based on the design concept, following is the visual elements that are used, to structure the POI dynamically.
  - A vertical line
  - An image (icon) representing the POI type/state.
  - A text label with the POI name and distance
  - A halo for active state

<div align="center">
<img width="300" alt="image" src="https://github.com/user-attachments/assets/cde71e39-53b4-478f-bb9a-65c43d19d3ad" />
<img width="300" alt="image" src="https://github.com/user-attachments/assets/c3dbcc76-c53d-4be0-a43f-740670c9b7ad" />
<p><em>Initial Design (Ideal): Each POI symbol sits atop a lollipop-style line. POI sizes vary by distance and are grounded on the AR plane/terrain VS POIs in coded demo (Test): POI sizing and direction respond to coordinates (the base of the lollipop line does not align with the actual terrain)</em></p>
</div>

**POI Scaling for The GeoSpatial Quality of the AR Labels**  
For POI display with the location-based componenet `gps-entity-place` or `gps-new-entity-place`, you would, however, start simple with a basic object like a `sphere` or `box`. This helps you confirm that the virtual object appears correctly in the AR scene and allows you to experiment with its general scale before applying any custom designs. Below code describes a box will be appearing at the set lat, long. 

```
<a-box material="color: yellow" gps-entity-place="latitude: <your-latitude>; longitude: <your-longitude>"/>
```

When an `<a-entity>` uses a location-based component like `gps-entity-place` as above, AR.js automatically scales the object based on its distance from the user — closer objects appear larger, while distant ones appear smaller. The `scale` attribute allows you to adjust this automatic scaling by applying a multiplier (scale factor). This is especially helpful when your location point is far away from your current geolocation, and the object becomes too small to see clearly or seem invisible. In this case, you can increase the entity's size using a multiplier:

```
entity.setAttribute('scale', "100 100 100");
```

This will scale the entity 100 times along the X, Y, and Z axes, making it much more visible in the AR scene.

<div align="center" style="border:none; box-shadow:none;"> 
 <img width="300" alt="image" src="https://github.com/user-attachments/assets/95b7a9c1-e194-4358-926d-79111d1fab1f" />
 <p><em>Location Points as simple 3d spheres with uniform scale multiplier</em></p>
</div>

On the flip side, using a uniform scale multiplier (which amplifies AR.js’s internal distance-based scaling) can cause nearby objects to appear too large. To handle this, you might consider implementing custom scaling logic based on distance range—for example, assigning different scaling logic for near, mid, and far distances. Alternatively, you may choose to make all POIs (Points of Interest) appear the same size in your screen space, regardless of their distance from the user.

Ultimately, whether you rely on AR.js’s default scaling or implement your own custom logic depends on your design goals and the results of user testing. 

We initially aimed to implement clamping logic—scaling far-away POIs up to keep them visible, and scaling nearby POIs down to avoid overwhelming the user’s view, by implementing range based scaling in function `updateScale(distance)` (returning a scale factor based on the distance between the user and the POI) which is then used in `createPOIEntity()` for entity scale as below.

```
const entityScale = updateScale(distance); // Scale based on distance
entity.setAttribute('scale', `${entityScale} ${entityScale} ${entityScale}`);
```

**Remaining issues**
Though we made some improvement over different experiments, the results are not yet _exactly_ what we want. In some cases, nearby objects still appeared too large, with clamping in place. We think POI scaling logic needs more field testing and rewriting. 

**Current POI Scaling steps**
  
| Step                | Function/Variable      | Purpose                                      |
|---------------------|-----------------------|----------------------------------------------|
| Distance Calculation| `calculateDistance`   | Find distance between user and POI           |
| Scaling             | `updateScale(distance)`| Get scale factor for POI entity (Otherwise, the internal scaling by ar js is used)             |
| Apply Scale         | `entity.setAttribute('scale', ...)` | Visually scale POI in AR scene   |
| Text Scaling        | `updateTextScale(distance)` | Scale text label for readability so they all appear in uniform size         |

**Intention in Scaling:**  
  - **Far POIs:** Are scaled up (appear larger) so they remain visible in the AR scene.
  - **Mid Range** Are scaled proportionally
  - **Near POIs:** Are scaled down (appear smaller) to avoid overwhelming the user’s view.
  - **Clamping:** The scaling is clamped to prevent POIs from becoming too large or too small.

**Design Questions for POI display:** 
That said, the right approach also depends on the type of application you're designing, the dataset you have curated, and how many POIs you want to display at once.

For example:
- Do you (really) need to show more than 10 POIs in a single AR view?
- Does it make sense to display both a POI that’s 10 meters away and one that’s 5000 meters away in the same application?
- If so, how will you visually distinguish between them?
- What do you expect to see when a point enters from middle range distance to the near distance as you walk on the street? 

These can be some of possible questions that each project must answer based on its specific goals. In this demo, we worked with a very large generic dataset (U.S. school locations), and we aimed to apply a generalized scaling logic that could work across a wide range of points.

**Tip: Mock Dataset**  
One helpful testing tip for scaling is to use a mock dataset so your POIs can be placed at a controlled distance from your current location. This allows you to fine-tune visibility and scaling behavior without relying on real-world data, making it easier to debug and iterate.

``` const exampleMockDataset = [
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
```

### 4.1 AR Scene Manual Adjustment for Compass Inaccuracy
Upon entering the Split View, the app **reminds users they can adjust the AR scene** if it appears misaligned with the real environment. This feature is added because device compass(magnetometer) can be inaccurate and can function differently per each device, causing the AR overlay to not match the real-world directions as expected. 

An adjustment slider is added for AR scene translation. 

<div align="center">
<video src="https://github.com/user-attachments/assets/3c7c8b9d-30f4-4735-b6df-a54e0550d696" controls width="300"></video>
  <p><em>Compass discrepancy; Slider for Manual Adjustment</em></p>
</div>

We wanted to implement manual translation by user in case user can recognize a landmark nearby to adjust. UI-wise, this is not the best implementation. Some of the better known examples of manual calibration of AR Scene are:
- Photopills ([Video](https://www.youtube.com/watch?v=OwBrH0IzOQ8)): Using the sun's position as the reference point to calibrate in AR
- [Peakvisor](https://peakvisor.com/): User is allowed to nudge the mountain ridge to match the landscape in AR
 
_**Note**: This feature is currently supported only with the classic `gps-entity-place` component from AR js. (As of July 9 2025)
⚠️ With the newer location based component `gps-new-entity-place` (recommended by AR.js), this adjustment is not yet functional. We are planning to investigate into this limitation._

### 4.2 More on Compass Heading: Absolute Orientation vs Relative Orientation 
We first started building the app using `deviceorientationabsolute` event to read compass heading input as below.

```
// Listen for device orientation events (compass)
window.addEventListener("deviceorientationabsolute", updateHeading, true);

function updateHeading(event) {
    if (event.alpha !== null) {
        heading = 360 - event.alpha; // Convert to compass heading
        updateDisplay();
        console.log(`Updated Heading: ${heading}°`);
    } else {
        debugOverlay.innerHTML = "No compass data available.";
    }
  }
```
On iOS, however, we discovered that the standard `DeviceOrientationEvent` does not provide a true compass heading to tell us where north is. Instead, it gives a relative orientation, where the device's initial direction is treated as "north" (0°). To get an actual compass heading, we had to use the `webkitCompassHeading` property which is specific to iOS. 

Reference on DeviceOrientation Event: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent

**What is absolute orientation vs relative orientation?**

**Absolute Orientation** 
- What it is: Orientation data relative to a fixed global reference, typically magnetic north or true north.
- How it works: Combines gyroscope, accelerometer, and magnetometer data.
- Benefit : Provides a consistent heading aligned with the real world. 
- Platform: Available on Android via `deviceorientationabsolute`, and on iOS via `webkitCompassHeading`.

**Relative Orientation**
- What it is: Orientation data relative to the device’s initial position when the sensor started 
- How it works: Uses the device’s internal gyroscope and accelerometer to track rotation.
- Problem: It drifts over time and doesn’t know where “north” is.
- Platform: This is the default behavior on iOS when using deviceorientation without `webkitCompassHeading`

**Our current approach to get "north" (heading)**
- Use `deviceorientationabsolute` when available, extracting the _alpha_ value as the compass heading.
   - Reference on deviceorientationabsolute: https://developer.mozilla.org/en-US/docs/Web/API/Window/deviceorientationabsolute_event
   - alpha, beta, gamma each refers to three sensor values (ywa, pitch, roll) from the orientation sensors, which can be retrieved as follows 
      - Reference: https://www.sitepoint.com/using-device-orientation-html5/#:~:text=Key%20Takeaways,determine%20the%20device's%20current%20position. 
```
window.addEventListener("deviceorientationabsolute", (event) => {
  const alpha = event.alpha; // rotation around z-axis
  const beta = event.beta;   // x-axis
  const gamma = event.gamma; // y-axis
  const absolute = event.absolute; // true if absolute
}, true);
```
- Use `**webkitCompassHeading**` (on iOS) when `deviceorientationabsolute` is not supported.
   - If the compass accuracy is low (e.g., more than 10° off), the app **can give you the range of directional inaccuracy** (`webkitCompassAccuracy` value from the device orientation event) and suggests manual adjustment, the process of which is shown in the section above **(AR Scene Manual Adjustment)**  The potential range of the compass inaccuracy is shown in the orientation indicator and helps users understand up to how much the AR scene might not be perfectly aligned.
   - On a side note, when using _event.alpha_, we are not yet able to access the compass sensor reliability yet. As a result, users may not see a specific warning, but they can still manually adjust the AR scene. 
   - The `webkitCompassHeading` property is a non-standard feature says [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent). Modern browsers are moving towards the standard AbsoluteOrientationSensor API for obtaining absolute orientation data, according to [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/AbsoluteOrientationSensor), but it is not supported on iOS. 
   - alpha,beta, gamma are still available on iOS 

**Shown in Code**
In the function prepareOrientationSetup(), we separate the two cases for absolute orientation: 
```
    if ("ondeviceorientationabsolute" in window) {
      isAbsoluteOrientation = true;
      window.addEventListener("deviceorientationabsolute", (event) => {
       // Code for Updating Orientation
        updateOrientation(event);
        motionReady = true;
      }, true);
    } else {
      isAbsoluteOrientation = false;
        window.addEventListener("deviceorientation", (event) => {
        // Code for Updating Orientation
         updateOrientation(event);
          motionReady = true;
      }, true);
    }
  ```

Then in updateOrientation(event): 
```
let rawHeading; // Raw value from device
    if (event.webkitCompassHeading !== undefined) {
      console.log("Using webkitCompassHeading for iOS");
      rawHeading = event.webkitCompassHeading;
      } else  { // Check for alpha value for Android devices
      console.log("Using alpha for Android");
      rawHeading = (360 - event.alpha); // Convert to compass heading  (counter-clockwise rotation)
    } 
```

The code may need to be re-written, but so far it works okay on most devices we tested.

### 5. POI Interaction 
Users can preview the location titles by panning their camera and tap on each POI to learn more about the location.

<div align="center">
<img width="300" alt="image" src="https://github.com/user-attachments/assets/0647b64d-4159-4e4b-89fe-ed7ce46e4b40" />
  <p><em>selected POI</em></p>
</div>

**POI Interaction via Custom Components**  
Interactivity is added for POI entities, via custom aframe components such as `toggle-title`, `text-background` and `show-popup`. The custom A-Frame components are defined in the `aframe-component.js` file as below.

| Component         | Role/Feature                                                                 |
|-------------------|------------------------------------------------------------------------------|
| `toggle-title`    | Manages label visibility (when POI is centered, title shows up, when it's selected gets pinned), animation, and halo (selected state) for POIs              |
| `text-background` | Adds/updates background for text labels for readability; When selected text bg changes                      |
| `show-popup`      | Handles showing/hiding POI popups and syncing with pinning          |
| Event Listeners   | Sync POI selection/highlighting between AR and web scene                     |
| `unpinAllTitles`  | Utility to reset all POI label states                                        |


### 6. Filter POIs By Distance _(Should Replace Video)_
Users can filter POIs by closer or further distance. 

<div align="center" style="border:none; box-shadow:none;"> 
 <video src="https://github.com/user-attachments/assets/a081dbe9-e99f-45a4-9283-c254702e8122" controls width="300"></video>
 <p><em> Filter POIs By Distance (Street Test) </em></p>
</div>

When POIs are displayed, they are limited to a defined distance threshold—by default, 3,000 meters (`let thresholdDistance = 3000`) around the user's location. This radius helps manage performance and reduce visual clutter. However, the threshold should be adjusted based on specific use cases or performance requirements. In fact, 3000 meters (3km) can be too much of a wide search. 

```
document.getElementById('distanceSlider').addEventListener('input', function(event) {
  thresholdDistance = event.target.value;
  updateDistanceValue(thresholdDistance);
  updateDisplay(); //Update Display with new threshold
});
```

Displaying too many POIs can overwhelm users and increase cognitive load, making the experience less effective. With thoughtful data curation and the ability to filter by relevant categories, this feature can be significantly improved to better support user needs.

### 7. Complementary view via AR View and Webscene Integration
Users can explore Points of Interest (POIs) in both the AR view and the Map view, with each view offering a slightly different interaction model:

**Map View:**
- When the user taps the "Track" button, their current location is displayed on the map.
- If the user is in the United States, POIs are automatically populated based on their reverse-geocoded state.
- A dropdown menu in the legend allows users to manually select a different state to view POIs from other regions.

**AR View:**
- POIs are retrieved only based on the user’s real-time location and filtered by proximity.
- There is no manual state selection; the experience is entirely location-driven.
  
<div align="center" style="border:none; box-shadow:none;"> 
 <video src="https://github.com/user-attachments/assets/00dfa9c4-dc2b-4fa9-b2d7-9f6cf0cddd9c" controls width="300"></video>
 <p><em> POI interaction while immersive compass is on in WebScene (July 2 v) </em></p>
</div>

**AR-WebScene Integration**
The app uses a dataset hosted on ArcGIS Online (AGO), which is also viewable in a WebScene. We're integrating two views—AR and WebScene—to enhance geospatial awareness. While this dual-view setup offers complementary perspectives, it can also introduce some user confusion. The integration is still in progress, but here’s what we’ve implemented so far:

**Camera Control Logic**
- getCameraOffsetPosition(): Offsets the camera to position it slightly above and behind the target (e.g., the user’s blue location dot), similar to a third-person shooter perspective.
- focusCamera(): Manages camera transitions with a set parameters in the WebScene when triggered by:
  - Tapping the track button
  - Selecting a POI
  - Closing a popup
  - Tapping the compass button (immersive view)

**Current Behaviors**
- Camera is controlled via parameters passed from each action trigger.
- POI Interaction:
  - In AR: Tapping a POI shows both the user location and POI location (track remains active).
  - In Map: Tapping a POI zooms into the POI and cancels the track.
- Tracking Behavior:
  - With track enabled, heading updates periodically.
  - With compass mode, heading updates continuously.
- Camera Offset: Adjusted to show more of the horizon._But Still experiencing issues with this._
- Track Component Customization & Remaining issues
  - Used goToOverride to cancel the default zoom behavior.
  - However, the ArcGIS Track component still re-centers with a fixed scale.
  - Natural navigation (like in Google Maps or Field Maps) is not yet achieved.
  - Some sources suggest we may need to build a custom track component.
- Visual Consistency:
  - Matched highlight colors for selected POIs across AR and Map views.
- Known Bug:
  - When the Scene refreshes (e.g., AR POIs reload), the pre-selected POI halo and pinned titles are lost, even though the highlight in the WebScene & pop up label remains active.

--

