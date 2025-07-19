let centeredPOI = null; // Variable to track the currently centered POI
let activePopUpPOI = null; // Tracks the currently active POI with a pop-up

// Utility function to unpin all POI titles
function unpinAllTitles() {
  const allPOIs = document.querySelectorAll('[toggle-title]');
  allPOIs.forEach(poi => {
    if (poi.components['toggle-title']) {
      poi.components['toggle-title'].unpinTitle();
    }
  });
}

// Handle raycaseter events (Not used in this example, but can be useful for debugging)
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

  // * Show the title of the POI in Black when a POI is centered. On Tap, Pin the colored title 
  AFRAME.registerComponent('toggle-title', {
    schema: {
      poiId: { type: 'string', default: '' }, // Unique POI identifier
      full: { type: 'string', default: '' }, // Full text for the POI
      threshold: { type: 'number', default: THREE.MathUtils.degToRad(10) }, // Threshold in radians (5 degrees by default)
      lineStartY: { type: 'number', default: 0 }, // Initial Y position of the connecting line's start
      lineEndY: { type: 'number', default: 0 }, // Initial Y position of the connecting line's end
      textParentScale: { type: 'number', default: 1 }, // Scale of the text parent
      haloYPosition: { type: 'number', default: 0 }, // Y position of the halo
      haloRadius: { type: 'number', default: 1 }, // Radius of the halo
       // Image URL for the label`
    },
  
    init: function () {
      const el = this.el; // The current POI
      const camera = document.querySelector('[gps-new-camera]').object3D; // Get the camera's 3D object
  
      this.poiId = this.data.poiId; // Store the POI ID for later use
      this.camera = camera;
      this.isPopUpOpen = false; // Tracks if the pop-up is open
      this.isPinned = false; // Tracks if the title is pinned
      this.originalPosition = null; // Original position of the text element
      this.defaultScl = this.data.textParentScale;
      this.halo = null;
      this.haloYPos = this.data.haloYPosition;
      this.haloRadiusOuter = this.data.haloRadius*1.25;
      this.haloRadiusInner = this.data.haloRadius;

      // Get the text element and connecting line inside the POI
      const textEntity = el.querySelector('.poi-text');
      const textParent = textEntity ? textEntity.parentNode : null;
      const connectingLine = el.querySelector('.connecting-line');
  
      
      // Initialize the text and connecting line visibility
      if (textParent) {
        textParent.setAttribute('visible', false); // Hide the text by default

        // Retrieve and store the original position
        const position = textParent.getAttribute('position');
        this.originalPosition = position ? { ...position } : { x: 0, y: 0, z: 0 }; // Default to { x: 0, y: 0, z: 0 } if position is null
      }
      if (connectingLine) {
        connectingLine.setAttribute('visible', false); // Hide the connecting line by default
      }
  
      this.textParent = textParent;
      this.connectingLine = connectingLine;
      this.textEntity = textEntity;
  
        // Set the initial connecting line position and scale
      this.updateConnectingLine();

      // Listen for pop-up events
      el.addEventListener('popup-opened', () => {
        this.isPopUpOpen = true; // Set the pop-up state to open
        this.pinTitle(); // Pin the title with the colored style
      });
  
      el.addEventListener('popup-closed', () => {
        this.isPopUpOpen = false; // Set the pop-up state to closed
        this.unpinTitle(); // Reset the title style

        // Emit a custom event for AR/WebScene sync
        document.dispatchEvent(new CustomEvent('ar-popup-closed', { detail: { id: this.data.poiId } }));
      });
  
      el.addEventListener('click', () => {
        if (activePopUpPOI && activePopUpPOI !== this) {
          // If another POI is already active, unpin it
          activePopUpPOI.isPinned = false; // Unpin the previously active POI
        }
      
        if (!this.isPinned) {
          // Pin the current POI
          this.isPinned = true; // Mark the title as pinned
          this.pinTitle(); // Apply the pinned style
        } else { // alreadyPinned;
          return;
        }

        // Emit a custom event for AR/WebScene sync
        document.dispatchEvent(new CustomEvent('ar-poi-selected', { detail: { id: this.poiId } }));
      });
    },
  
    tick: function () {
      const camera = this.camera;
      const threshold = this.data.threshold;
  
      // If the current POI is the active pop-up, keep the pinned style
      if (this.el === activePopUpPOI) {
        this.pinTitle(); // Ensure the pinned style is applied
        return; // Skip further logic for the active pop-up
      }
  
      // // Get all POIs
      // const pois = document.querySelectorAll('.clickable');
      // let smallestAngle = Infinity;
  
      // pois.forEach((poi) => {
      //   const position = new THREE.Vector3();
      //   poi.object3D.getWorldPosition(position);
  
      //   // Calculate the direction vector from the camera to the POI
      //   const directionToPOI = new THREE.Vector3();
      //   directionToPOI.subVectors(position, camera.position).normalize();
  
      //   // Get the camera's forward direction
      //   const cameraDirection = new THREE.Vector3();
      //   camera.getWorldDirection(cameraDirection);
  
      //   // Calculate the horizontal angle between the camera's forward direction and the POI
      //   const horizontalAngle = Math.atan2(directionToPOI.x, directionToPOI.z);
      //   const cameraHorizontalAngle = Math.atan2(cameraDirection.x, cameraDirection.z);
  
      //   // Calculate the absolute difference between the angles
      //   const angleDifference = Math.abs(
      //     ((horizontalAngle - cameraHorizontalAngle + Math.PI) % (2 * Math.PI))
      //   );
  
      //   // Check if this POI is closer to the center than the current closest POI
      //   if (angleDifference < smallestAngle && angleDifference <= threshold) {
      //     smallestAngle = angleDifference;
      //     centeredPOI = poi;
      //   }
      // });
  
      // Get all POIs
      const pois = document.querySelectorAll('.clickable');
      let smallestAngle = Infinity;
      let closestPOI = null;

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

        // Always track the closest POI by angle
        if (angleDifference < smallestAngle) {
          smallestAngle = angleDifference;
          closestPOI = poi;
        }
      });

      // Use the closest POI if within threshold, otherwise set centeredPOI to null
      // centeredPOI = (smallestAngle <= threshold) ? closestPOI : null;

      centeredPOI = closestPOI;

      // Update visibility for the current POI
      if (this.el === centeredPOI && !this.isPopUpOpen && !this.isPinned) { // If the POI is centered and not pinned
        this.fadeInRegular(); // Show the regular style for the centered POI
      } else if (this.el !== centeredPOI && !this.isPopUpOpen && !this.isPinned) { // If the POI is not centered and not pinned
        this.fadeOut(); // Hide the title
      }

      // Dynamically update the connecting line in every frame
      this.updateConnectingLine();
    },

    updateConnectingLine: function () {
      if (this.textParent && this.connectingLine) {
        // Get the current position of the textParent
        const textPosition = this.textParent.getAttribute('position');
    
        // Get the base position of the POI 
        const basePosition = { x: 0, y: this.data.lineStartY, z: 0 };
        const endPosition = { x: 0, y: textPosition.y +0.5, z: 0 };
    
        // Calculate the distance between the textParent and the base position
        const distance = Math.sqrt(
          Math.pow(endPosition.x - basePosition.x, 2) +
          Math.pow(endPosition.y - basePosition.y, 2) +
          Math.pow(endPosition.z - basePosition.z, 2)
        );
        const originalDistance = Math.sqrt(
          Math.pow(textPosition.x - basePosition.x, 2) +
          Math.pow(this.data.lineEndY - basePosition.y, 2) +
          Math.pow(textPosition.z - basePosition.z, 2)
        );
    
        // Update the connecting line's scale to match the distance
        this.connectingLine.setAttribute('scale', `1 ${distance/originalDistance} 1`);
    
        // Adjust the connecting line's position to align with the textParent
        // this.connectingLine.setAttribute('position', {
        //   x: textPosition.x,
        //   y: textPosition.y / 2, // Position halfway between the base and the textParent
        //   z: textPosition.z
        // });
      }
    },
  
    pinTitle: function () {
      if (this.textParent) {
        this.textParent.setAttribute('visible', true); // Ensure the parent is visible
    
        // Animate the position to make the pinned title higher
        this.textParent.setAttribute('animation__position', {
          property: 'position',
          to: {
            x: this.originalPosition.x,
            y: this.originalPosition.y + 0.5, // Move the title 0.2 units higher
            z: this.originalPosition.z
          },
          dur: 200, // Duration of the animation in milliseconds
          easing: 'easeOutQuad', // Easing function for a smooth effect
          loop: false // Ensure the animation happens only once
        });

        // Animate the scale to the pinned style
        this.textParent.removeAttribute('animation__scale'); // Remove any existing scale animation
        this.textParent.setAttribute('animation__scale', {
          property: 'scale',
          from: `${this.defaultScl} ${this.defaultScl} ${this.defaultScl}`, // Start from the regular style scale
          to: `${this.defaultScl*1.5} ${this.defaultScl*1.5} ${this.defaultScl*1.5}`, // Scale up to the pinned style
          dur: 200, // Duration of the animation in milliseconds
          easing: 'easeOutQuad', // Easing function for a smooth effect
          loop: false // Ensure the animation happens only once
        });

        // Animate the text color from white to black on pin
        const textEntity = this.textParent.querySelector('.poi-text');
        if (textEntity) {
          textEntity.removeAttribute('animation__textcolor'); // Remove any existing color animation
          textEntity.setAttribute('animation__textcolor', {
            property: 'text.color',
            from: "000000",
            to: "ffffff",
            // from: '#ffffff', // White
            // to: '#000000',   // Black
            dur: 200,
            easing: 'easeOutQuad',
            loop: false
          });
        }

        // Add a white halo effect
        if (!this.halo) {
          const halo = document.createElement('a-ring');
          halo.setAttribute('radius-inner', `${this.haloRadiusInner}`); // Inner radius (smaller than the outer radius)
          halo.setAttribute('radius-outer', `${this.haloRadiusOuter}`); // Outer radius
          halo.setAttribute('opacity', 0); // Start with opacity 0
          halo.setAttribute('position', `0 ${this.haloYPos} -0.1`); // Position it slightly behind the icon
          halo.setAttribute('material', 'color: #00ffff; metalness: 0.05; roughness: 1'); // Ensure it's visible from both sides
        
          // Add an animation to transition opacity from 0 to 1
          halo.setAttribute('animation__opacity', {
            property: 'opacity',
            from: 0,
            to: 0.9,
            dur: 200, // Duration of the animation in milliseconds
            easing: 'easeOutQuad', // Easing function for a smooth effect
            loop: false // Ensure the animation happens only once
          });
        
          this.el.appendChild(halo); // Add the halo as a child of the textParent
          this.halo = halo; // Store the reference to the halo
        }

        const textBackground = this.textParent.querySelector('.poi-text');
        if (textBackground) {
          // Remove any existing color animation
          textBackground.removeAttribute('animation__color');
    
          // Animate the background color to the pinned style
          textBackground.setAttribute('animation__color', {
            property: 'text-background.color',
            // from: '#ffffff', // White
            // to: '#000000',   // Black
            from: 'black', // Start from the regular style color
            to: '#ffffff', // Transition to white
            dur: 200, // Duration of the animation in milliseconds
            easing: 'easeOutQuad', // Easing function for a smooth effect
            loop: false // Ensure the animation happens only once
          });
    
          // Update padding and opacity directly (padding animation is not supported)
          textBackground.setAttribute('text-background', {
            padding: 0.25, // Larger padding for the pinned style
            opacity: 1 // Full opacity for the pinned style
          });
        }
      }

      // Update the connecting line
      this.updateConnectingLine();
      // Show the connecting line
      if (this.connectingLine) {
        this.connectingLine.setAttribute('visible', true);
      }

      // Mark the title as pinned
      this.isPinned = true;

    },
  
    unpinTitle: function () {
      this.isPinned = false; // Mark the title as unpinned

      if (this.halo) {
        this.halo.parentNode.removeChild(this.halo); // Remove the halo
        this.halo = null; // Clear the reference
      }

        // Reset text color to white
      if (this.textParent) {
        const textEntity = this.textParent.querySelector('.poi-text');
        if (textEntity) {
          textEntity.removeAttribute('animation__textcolor');
          textEntity.setAttribute('text', 'color', '#ffffff');
          // textEntity.setAttribute('text', 'color', '#000000');
        }
      }

      if (this.el !== centeredPOI) { // If not centered
        this.fadeOut(); // Fade out the title
      } else { // If centered
        this.fadeInRegular(); // Show the regular style
      }
    },
  
    fadeInRegular: function () {
      if (this.textParent) {

        // Animate the position to make the pinned title higher
        this.textParent.setAttribute('animation__position', {
          property: 'position',
          // from: this.textParent.getAttribute('position'), // Start from the current position
          to: this.originalPosition, // Reset to the original position
          dur: 200, // Duration of the animation in milliseconds
          easing: 'easeOutQuad', // Easing function for a smooth effect
          loop: false // Ensure the animation happens only once
        });

        this.textParent.setAttribute('visible', true); // Ensure the parent is visible

        // Animate the scale to the regular style
        this.textParent.removeAttribute('animation__scale'); // Remove any existing scale animation
        this.textParent.setAttribute('animation__scale', {
          property: 'scale',
          from: `${this.defaultScl*1.5} ${this.defaultScl*1.5} ${this.defaultScl*1.5}`,// Start from the pinned style scale
          to: `${this.defaultScl} ${this.defaultScl} ${this.defaultScl}`, // Scale down to the regular style
          dur: 200, // Duration of the animation in milliseconds
          easing: 'easeOutQuad', // Easing function for a smooth effect
          loop: false // Ensure the animation happens only once
        });
    
        const textBackground = this.textParent.querySelector('.poi-text');
        if (textBackground) {
          if (this.isPinned) {
            // Animate the background color to the regular style only if it was pinned
            textBackground.setAttribute('animation__color', {
              property: 'text-background.color',
              // from: '#008080', // Start from the pinned style color
              // to: 'black', // Transition to black
              dur: 200, // Duration of the animation in milliseconds
              easing: 'easeOutQuad', // Easing function for a smooth effect
              loop: false // Ensure the animation happens only once
            });
          }
    
          // Update padding and opacity directly (padding animation is not supported)
          textBackground.setAttribute('text-background', {
            color: 'black',
            padding: 0.15, // Smaller padding for the regular style
            opacity: 0.8 // Reduced opacity for the regular style
          });
        }

        // Show the connecting line
        if (this.connectingLine) {
          this.connectingLine.setAttribute('visible', true);
        }
    
        // Reset the pinned state after transitioning to the regular style
        this.isPinned = false;
      }
    },
  
    fadeOut: function () {
      if (this.textParent) {
        // Animate the position to make the pinned title higher
        this.textParent.setAttribute('animation__position', {
          property: 'position',
          // from: this.textParent.getAttribute('position'), // Start from the current position
          to: this.originalPosition, // Reset to the original position
          dur: 200, // Duration of the animation in milliseconds
          easing: 'easeOutQuad', // Easing function for a smooth effect
          loop: false // Ensure the animation happens only once
        });

        this.textParent.setAttribute('visible', false); // Hide the parent container

        // Reset the background color to black
        const textBackground = this.textParent.querySelector('.poi-text');
        if (textBackground) {
          textBackground.setAttribute('text-background', {
            color: 'black', // Reset to default black color
            padding: 0.15, // Default padding
            opacity: 0.8 // Default opacity
          });
        }
      }

      // Update the connecting line
      this.updateConnectingLine();
      // Hide the connecting line
      if (this.connectingLine) {
        this.connectingLine.setAttribute('visible', false);
      }
    }

  });

  AFRAME.registerComponent('text-background', {
    schema: {
      color: { type: 'string', default: 'black' }, // Background color
      padding: { type: 'number', default: 0.2 },  // Padding around the text
      opacity: { type: 'number', default: 0.9 }   // Background opacity
    },
  
    init: function () {
      const textEl = this.el; // The entity with the text
      const backgroundEl = document.createElement('a-plane'); // Background plane
  
      // Set initial background properties
      this.updateBackgroundColor(backgroundEl, this.data.color);
      backgroundEl.setAttribute('opacity', this.data.opacity);
  
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

    update: function () { // Update when the component atrributes are re-set
      const textEl = this.el; // The entity with the text
      const backgroundEl = textEl.querySelector('a-plane'); // background plane
      this.updateBackgroundColor(backgroundEl, this.data.color);
      backgroundEl.setAttribute('opacity', this.data.opacity);
      this.updateBackgroundSize(textEl, backgroundEl); 
    },
  
    updateBackgroundSize: function (textEl, backgroundEl) {
      // Get the computed dimensions of the text
      const textData = textEl.getAttribute('text');
      const textValue = textData.value || '';
      const charWidth = 0.14; // Approximate character width
      const textWidth = textValue.length * charWidth || 2; // Calculate width based on character count
      const textHeight = textData.height || charWidth; // Default height if not set
      const padding = this.data.padding;
  
      // console.log("Text Width: ", textWidth, "Text Height: ", textHeight);
      // Set the background size based on the text dimensions and padding
      backgroundEl.setAttribute('width', textWidth + padding * 2);
      backgroundEl.setAttribute('height', textHeight + padding);
  
      // Align the background to the left using offsetX
      // const offsetX = (textWidth / 2);
      const offsetX =0; 
      backgroundEl.setAttribute('position', `${offsetX} 0 -2.5`); // Adjust position to center the background; Z-flicker fix
    },

    updateBackgroundColor: function (backgroundEl, color) { // Based on how the toggle-title is triggered
      if (backgroundEl) {
        backgroundEl.setAttribute('color', color); // Update the background color
      }
    }
  });

  // * Show a pop-up when the POI is clicked
  AFRAME.registerComponent('show-popup', {
    schema: {
      title: { type: 'string', default: '' },
      distance: { type: 'string', default: '' },
      content: { type: 'string', default: '' },
      labelImage: { type: 'string', default: '' },
    },
  
    init: function () {
      const el = this.el;
      // this.textParent = el.querySelector('.poi-text')?.parentNode; // Reference the textParent
      // this.connectingLine = el.querySelector('.connecting-line'); // Reference the connecting line
      el.addEventListener('click', this.onClick.bind(this)); // Handle click separately
    },
  
    onClick: function () {
      // Trigger haptic feedback (Not working on iOS)
      if (navigator.vibrate) {
        navigator.vibrate(75); // Vibrate when clicked
      }
      // Open the pop-up 
      if (activePopUpPOI && activePopUpPOI !== this) {
        activePopUpPOI.closePopup(); // Close the currently active pop-up
      }
      this.openPopup();
      activePopUpPOI = this; // Set this POI as the active pop-up
      this.el.emit('popup-opened'); // Emit event to activate the title
    },

    // SIMPLE VERSION THAT WORKS
    // openPopup: function () {
    //   // Create a pop-up container if it doesn't already exist
    //   let popup = document.querySelector('#popup-container');
    //   if (!popup) {
    //     popup = document.createElement('div');
    //     popup.id = 'popup-container';
    //     document.body.appendChild(popup);
    //   }

    //   popup.innerHTML = `
    //   <div class = "popup-grab-handle"></div>
    //   <div class="title" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex: 1 0 0; width: 100%;">
    //     <div style="display: flex;align-items: center; gap: 8px; flex: 1 0 0;">  
    //       <img width="32px" height="32px" src ='${this.data.labelImage}' width>
    //       <h2 style="margin: 0; text-align: left; font-weight: normal;"><b>Shelter</b></h2>
    //     </div>
    //     <div style="display: flex; justify-content: right; align-items: right; align-items: baseline; flex: 1 0 0; gap: 8px;">
    //       <span style="font-size: 12px; color: var(--Black, #000); text-align: right; ">${this.data.distance} away</span>
    //       <button id="popup-close" style="margin: 0; padding: 0; background: none; border: none; cursor: pointer;">
    //         <img src="./assets/ui/CloseButton_sm.svg" alt="Close" style="width: 30px; height: 30px;">
    //       </button>
    //     </div>
        
    //   </div>
    //   <div class="title2" style="text-align: left; width: 100%; margin-bottom: 10px;">${this.data.title}</div>
    //   <p style="text-align: left; width: 100%; margin-top: 0;">${this.data.content}</p>
    // `;
    //   // Add a blur effect to the background    
    //   // Add a close button to hide the pop-up
    //   const closeButton = popup.querySelector('#popup-close');
    //   closeButton.addEventListener('click', () => {
    //     this.closePopup();
    //   });
  
    //   // Show the pop-up
    //   popup.style.display = 'block';
    // },
    openPopup: function () {
      showPopup({
        title: this.data.title,
        distance: this.data.distance,
        content: this.data.content,
        labelImage: this.data.labelImage,
        onClose: () => {
          this.closePopup();
        },
        containerId: 'popup-container'
      });
    },

    closePopup: function () {
      const popup = document.querySelector('#popup-container');
      if (popup) {
        popup.style.display = 'none'; // Hide the pop-up
      }
      this.el.emit('popup-closed'); // Emit event to deactivate the title
      activePopUpPOI = null; // Clear the active pop-up reference
    }
  });


document.addEventListener('web-poi-selected', function(e) {
  const poiId = e.detail.id;
  unpinAllTitles();
  // Try to find by attribute poiId 
  const arPoi = document.querySelector(`[poiId="${poiId}"]`);
  if (arPoi && arPoi.components['toggle-title']) {
    arPoi.components['toggle-title'].pinTitle();
    if (arPoi.components['show-popup']) {
      arPoi.components['show-popup'].openPopup();
    }
  }
});

document.addEventListener('ar-poi-selected', function(e) {
  const poiId = e.detail.id;
  unpinAllTitles();
  const arPoi = document.querySelector(`[poiId="${poiId}"]`);
  if (arPoi && arPoi.components['toggle-title']) {
    arPoi.components['toggle-title'].pinTitle();
    if (arPoi.components['show-popup']) {
      arPoi.components['show-popup'].openPopup();
    }
  }
});

// document.addEventListener('poi-selected-before-reload', function(e) {
//   const selectedPOI = e.detail.poi;
//   if (selectedPOI && selectedPOI.objectid) {
//     const selectedEl = document.querySelector(`[poiId="${selectedPOI.objectid}"]`);
//     if (selectedEl && selectedEl.components['toggle-title']) {
//       selectedEl.components['toggle-title'].pinTitle();
//     }
//   }
// });

// Optionally, Add listeners for popup closed events to unpin all titles:
document.addEventListener('ar-popup-closed', unpinAllTitles);
document.addEventListener('web-popup-closed', unpinAllTitles);
