# GeoAR (Work In Progress)
GeoAR Team's Mobile Web AR Codebase Documentation 

Current codebase is maintained at this [github](https://github.com/inhye-lee/GeoAR) 

---

## Overview

This codebase implements a cross-platform **Mobile Web AR Location Viewer** using **Vanilla JavaScript**  with **AR.js/A-Frame** for AR and **ArcGIS Maps SDK for JavaScript** for geospatial data queries and mapping. The app is built without any front-end frameworks, relying on standard JavaScript, browser APIs, and third-party libraries to enable users to view and interact with location-based POIs in both a Camera view (AR) and a synchronized 3D web map (WebScene in our case).

We chose AR.js for its broad compatibility and ease of use in cross-browser web AR applications. However, it is less advanced than alternatives like WebXR (more mature on Android) or 8th Wall (a paid, cross-browser solution). At the moment, AR.js offers a balance between accessibility and functionality for (cost-effective) basic location-based application.

This document describes the libraries used in this project and details the ongoing design and engineering strategies we are employing to address specific challenges and technical limitations encountered during development. 

  *(TBD) Detailed code snippets will be added to relevant sections as the project progresses and reaches a more stable and mature development stage.*

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

However, this dataset is quite literally is a collection of school locations only and not specifically tailored for shelter use. For instance, it lacks critical attributes such as real-time availability, capacity, or elevation, which would be essential in scenarios like severe storm surge. To develop a fully functional shelter viewer app, the dataset would need to be enhanced or re-created with one that includes these key details and the content will have to be maintained periodically.

## Libraries in Use

### [AR.js](https://ar-js-org.github.io/AR.js-Docs/)
- Enables location-based AR experiences directly in the browser.
- Provides access to the device camera, orientation sensors, and basic AR rendering.
- For location-based AR Labels, the classic location-based component from Ar.js [gps-entity-place] (a component provided by the AR.js library for A-Frame) is used.  This component places AR entities at real-world coordinates based on the user's current GPS location. Internally, it likely uses the Haversine formula to calculate distances between coordinates, which comes in w/known limitation (described below in Achieving Location & Directional Accuracy section)

### [A-Frame](https://aframe.io/)
- Declarative 3D scene framework built on top of Three.js.
- Used to define virtual objects (a-entities), custom components (e.g., POI labels, popups, raycasting), and manage AR interactions.
- For location-based AR, we currently use [gps-entity-place] and use custom entity structure (AR Label's Line + Image Symbol + POI Title) and custom scaling logic based on distance.  

### [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/)
- Renders a 3D WebScene using geospatial data hosted on ArcGIS Online
- Provides APIs for:
    - Feature querying and rendering
    - Reverse geocoding
    - Real-time location tracking
    - Category-based filtering and dynamic map updates

### [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- Used to retrieve the user's real-time location.
- Feeds location data to both the AR scene and the ArcGIS WebScene for synchronized positioning.

### [GeographicLib](https://geographiclib.sourceforge.io/)
- Used for precise geodesic distance calculations between two geographic coordinates. (User's current Location & POI Coordinates)
- Unlike the Haversine formula (which assumes a spherical Earth), GeographicLib uses Karney’s algorithm, which models the Earth as an ellipsoid (WGS84), offering higher accuracy—especially over long distances or near the poles.
- In this project, we use GeographicLib to:
  - Display accurate distances between the user and POIs.
  - Dynamically scale AR symbols (gps-entity-place) based on distance.
- Note: *We currently do not override the internal distance calculations of gps-entity-place, which appears to use the Haversine formula by default.* (June 12 2025)
  
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

- **Platform and Compatibility Issues:**
  - Sensor APIs (compass, orientation) behave differently on iOS and Android, requiring platform-specific code and sometimes leading to inconsistent experiences.
  - (_TBD: Elaborate on the differences here)_
  - Not all browsers or devices support identical features, which may limit functionality or cause inconsistent behavior.
    - Haptic Response is unavailable on most iOS mobile web-browsers

- **Performance:**
  - Rendering a large number of POIs in AR can be demanding, especially on low-end or older devices, potentially resulting in lag or browser instability.
  - Have noticed app crashing with new updates or with no updates - Reason unknown 

---

## 📱 App Overview *(Writing WORK IN PROGRESS AS OF JUNE 23 2025)*
This AR + Map hybrid application delivers a Split View experience, combining a more intuitive, immersive AR interface with a comprehensive map-based spatial overview. 

In this section, we outline the general progress of the app for the end user and provide explanations of how each step is implemented.

### 1. Device Calibration
Upon launching the app for the first time, users are prompted to perform a figure-8 motion to calibrate their device sensors by following the animation. 
Oh wait, is figure 8 motion still relevant? You might be wondering... This "motion-based" calibration step is added to reduce magnetic field noise in device compass (magnetometer) and improve orientation accuracy, especially since the app does not use vision-based location accuracy improvement techniques like VPS. 

A "Skip" button is available to avoid user drop-off.

It is recommended to move the device in all directions to expose sensors to a full range of motion, against the [known reluctance of the general users](https://www.reddit.com/r/GooglePixel/comments/fejwlw/the_compass_figure_8_thing_for_location_accuracy/). 

### 2. Permissions (TBD: CHECK THE FLOW ON DIFFERENT DEVICES)
Once user taps on  "Skip" or done with timed calibration, user is prompted to active geolocation after camera permission prompt. 
First-time users must grant the following permissions:

- Location access
- Camera access
- Device orientation
- Permission flows differ slightly between iOS and Android platforms.

Although the app is designed to request permissions sequentially, we’ve observed that on some devices or platforms, multiple permission prompts may appear simultaneously.

### 3. Nearby POIs (Points of Interest)
Once all permissions are granted, the app displays nearby POIs based on the user’s current location within the U.S. state, along with a reminder.

### 4. Scene Adjustment
Users are reminded they can adjust the AR scene if it appears misaligned with the environment. If you are an iOS user, you will be prompted the potential directional inaccuracy. 

#### Absolute orientation (Most Android) vs relative orientation (iOS)

#### webKitCompassHeading in iOS for rescue

A slider allows for scene translation.
This feature is currently supported only with the classic gps-entity-place component from A-Frame.
⚠️ With the newer gps-new-entity-place (recommended by AR.js), this adjustment is not yet functional. We're actively investigating this limitation.

### 5. Filter By Distance
The Default radius is 3000 meters around the user as a threshold for filtering. We notice that this may be slight too wide range of area. 

Users can filter POIs by closer distance. 

### 6. The GeoSpatial Quality of the AR Labels. 


### 7. Webscene Integration
The app uses a dataset hosted on ArcGIS Online (AGO), which is also viewable in a Webscene:

Default view: Honolulu
Tap the "Track" button to center the map near your current location and view POIs.
### 8. Compass Mode: Dual View
Tapping the "Compass" button activates a complementary view between the AR scene and the Webscene:

Active POIs are highlighted in both views
Enhances spatial awareness by bridging real-world and map-based perspectives
### 9. UI Flexibility
The popup window can be collapsed to reduce screen clutter and improve visibility.
🧩 Code Snippets & Examples
Coming soon: We'll provide code snippets for key components like permission handling, POI filtering, AR scene adjustment, and Webscene integration.

## Design, Engineering, and Performance Considerations

### Migration from ArcGIS Widgets to Components
- **Why:**  
  - Location [Tracking Widget](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Track.html) in particular is deprecated, and caused jitter and performance issues when used in the WebScene or in the WebMap.
  - Location Tracking Component showed a signficant improvement in stability.
  - Moreover, Esri is moving towards a component-based architecture for better modularity and future support.
    - [Transition Plan](https://developers.arcgis.com/javascript/latest/components-transition-plan/)  
- **How:**  
  - Replaced widgets with ES6 ArcGIS components and direct API usage.
  - Improved control over location updates

### Location Tracking Widget Jitter Problem (TBD - Combine it w/other section)
- **Prior Problem:**  
  - As addressed in Migration from ArcGIS Widgets to Components, the built-in widget caused frequent, erratic jumps in the user's location on the map.
- **Current Solution:**  
  - Directly use the Geolocation API and ArcGIS Track component for smoother, more reliable updates.
  - Apply Kalman filtering to GPS data for further smoothing.

### Achieving Location & Directional Accuracy

#### Current Location Tracking
- Uses the browser’s Geolocation API and ArcGIS Track component for real-time user location in the WebScene.

#### GPS & Orientation Usage
- **GPS Value Smoothing:**  
  - Problem: Raw GPS data is noisy, causing AR labels to blink w/subtle changes if not noise-filtered.
  - Solution: Use Kalman filtering (`filteredLat`, `filteredLon`) to smooth GPS input before updating AR and map positions.
- **Camera permissions and sensor access:** 
  - Camera permissions and sensor access can behave differently across platforms.
- **iOS & Android Compass Differences:**  
  - iOS: Uses `webkitCompassHeading` for more accurate heading.
  - Android: Uses `deviceorientationabsolute` alpha value, with custom smoothing and normalization.
- **A-Frame Orientation:**  
  - Custom components handle device orientation and update AR label facing and placement.

### Creating Geo-cognizant AR Labels

#### Utilizing `gps-entity-place`
- Places AR entities at real-world coordinates using latitude/longitude.

#### Scaling & Sizing Options
- Dynamic scaling of AR labels and lines based on distance to user, to maintain readability and spatial context.
- Current Distance Range-based scaling (Near - MidRange - Far) when displaying POIs
- Clamp the size for near distance
- Proportionally change the size for POIs after far distance threshold
- Text Label stays the same for all ranges to help with legibility
- Good enough scaling method at the moment
- *Improved behavior may need to be developed later*

### Filtering AR Labels by Distance
- Only displays POIs within a user-defined distance threshold, improving performance and reducing clutter.

### Performance Improvements: Batch Processing
- **Prior Problem:**  
  - Rendering many POIs at once caused UI freezes and slowdowns.
- **Current Solution:**  
  - Loads POIs in batches using a `while` loop and `setTimeout`, keeping the UI responsive.

### Complementary Geographic Understanding

#### AR-WebScene Split View
- Users can see both the AR scene and the 3D map simultaneously.
- Enhances spatial awareness and context.

#### Synchronized POI Interaction
- Selecting a POI in AR highlights and opens it in the WebScene, and vice versa.
- Only one POI is "pinned" at a time; closing a popup unpins all.
- Achieved via custom events (`ar-poi-selected`, `web-poi-selected`, etc.) and shared OBJECTID identifiers.

### UI/UX Concerns
#### Providing Easy to Comprehend Feedback for Users to indicate the stage of their experience

#### Limited Real Estate on Mobile Screen 

#### Busy AR Screen 


(More to be added... TBD)

---


---
