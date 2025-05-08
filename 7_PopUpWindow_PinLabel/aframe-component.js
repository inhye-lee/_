let centeredPOI = null; // Variable to track the currently centered POI
let activePopUpPOI = null; // Tracks the currently active POI with a pop-up

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
      full: { type: 'string', default: '' }, // Full text for the POI
      threshold: { type: 'number', default: THREE.MathUtils.degToRad(5) }, // Threshold in radians (5 degrees by default)
      lineStartY: { type: 'number', default: 0 }, // Initial Y position of the connecting line's start
      lineEndY: { type: 'number', default: 0 } // Initial Y position of the connecting line's end
    },
  
    init: function () {
      const el = this.el; // The current POI
      const camera = document.querySelector('[gps-camera]').object3D; // Get the camera's 3D object
  
      this.camera = camera;
      this.isPopUpOpen = false; // Tracks if the pop-up is open
      this.isPinned = false; // Tracks if the title is pinned
      this.originalPosition = null; // Original position of the text element
  
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
        const endPosition = { x: 0, y: textPosition.y + 0.75, z: 0 };
    
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
          // from: this.textParent.getAttribute('position'), // Start from the current position
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
          from: '1.5 1.5 1.5', // Start from the regular style scale
          to: '1.8 1.8 1.8', // Scale up to the pinned style
          dur: 200, // Duration of the animation in milliseconds
          easing: 'easeOutQuad', // Easing function for a smooth effect
          loop: false // Ensure the animation happens only once
        });
    
        const textBackground = this.textParent.querySelector('.poi-text');
        if (textBackground) {
          // Remove any existing color animation
          textBackground.removeAttribute('animation__color');
    
          // Animate the background color to the pinned style
          textBackground.setAttribute('animation__color', {
            property: 'text-background.color',
            from: 'black', // Start from the regular style color
            to: '#008080', // Transition to teal blue
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
        this.textParent.setAttribute('animation__scale', {
          property: 'scale',
          from: '1.8 1.8 1.8', // Start from the pinned style scale
          to: '1.5 1.5 1.5', // Scale down to the regular style
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
              from: '#008080', // Start from the pinned style color
              to: 'black', // Transition to black
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
      content: { type: 'string', default: '' }
    },
  
    init: function () {
      const el = this.el;
      // this.textParent = el.querySelector('.poi-text')?.parentNode; // Reference the textParent
      // this.connectingLine = el.querySelector('.connecting-line'); // Reference the connecting line
      el.addEventListener('click', this.onClick.bind(this)); // Handle click separately
    },
  
    onClick: function () {
      // Open the pop-up and apply the "pinning" style
      if (activePopUpPOI && activePopUpPOI !== this) {
        activePopUpPOI.closePopup(); // Close the currently active pop-up
      }
  
      this.openPopup();
      activePopUpPOI = this; // Set this POI as the active pop-up
      this.el.emit('popup-opened'); // Emit event to activate the title
    },
  
    openPopup: function () {
      // Create a pop-up container if it doesn't already exist
      let popup = document.querySelector('#popup-container');
      if (!popup) {
        popup = document.createElement('div');
        popup.id = 'popup-container';
        popup.style.position = 'fixed';
        popup.style.bottom = '0'; // Position at the bottom of the screen
        popup.style.left = '0'; // Align to the left edge
        popup.style.width = '100%'; // Take up the full width of the screen
        popup.style.backgroundColor = 'white';
        popup.style.padding = '20px';
        popup.style.borderTop = '2px solid black'; // Add a border at the top
        popup.style.zIndex = '1000';
        popup.style.maxHeight = '50%'; // Limit height to half the screen
        popup.style.overflowY = 'auto'; // Enable vertical scrolling for content
        popup.style.boxShadow = '0 -4px 8px rgba(0, 0, 0, 0.2)'; // Add a shadow at the top
        popup.style.borderRadius = '10px 10px 0 0';
        popup.style.margin = '0'; // Ensure no margins
        popup.style.boxSizing = 'border-box'; // Include padding and border in width calculation
        document.body.appendChild(popup);
      }
  
      // Populate the pop-up with the title and content
      popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; text-align: left; font-weight: normal;"><span style="font-weight: normal;">${this.data.title}</span></h2>
          <button id="popup-close" style="margin: 0; padding: 5px 10px; text-align: right;">Close</button>
        </div>
        <p style="text-align: left;">${this.data.content}</p>
      `;
  
      // Add a close button to hide the pop-up
      const closeButton = popup.querySelector('#popup-close');
      closeButton.addEventListener('click', () => {
        this.closePopup();
      });
  
      // Show the pop-up
      popup.style.display = 'block';
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

  // AFRAME.registerComponent('show-popup', {
  //   schema: {
  //     title: { type: 'string', default: '' },
  //     content: { type: 'string', default: '' }
  //   },
  
  //   init: function () {
  //     const el = this.el;
  //     this.pinned = false; // Tracks if the POI is pinned
  //     this.isLongPressed = false; // Tracks if the POI is long-pressed
  //     this.pressingInProgress = false; // Tracks if the POI is being pressed
  //     this.longPressTimeout = null; // Timeout for detecting long press
  
  //     // Add event listeners for long press and click differentiation
  //     el.addEventListener('mousedown', this.onMouseDown.bind(this));
  //     el.addEventListener('mouseup', this.onMouseUp.bind(this));
  //     el.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  //     el.addEventListener('click', this.onClick.bind(this)); // Handle click separately
  //   },
  
  //   onMouseDown: function () {
  //     // Start the long-press timer
  //     this.pressingInProgress = true;
  //     this.longPressTimeout = setTimeout(() => {
  //       this.isLongPressed = !this.isLongPressed; // Toggle the long-press state
  //       // this.pinned = !this.pinned; // Toggle the pinned state;
  //       this.pressingInProgress = false; // Reset pressing state
    
  //       if (this.isLongPressed && !this.pinned && activePopUpPOI !== this) {
  //         // Open the pop-up when long-pressed
  //         console.log('Long press detected!');
  //         this.pinned = true; // Mark this POI as pinned
  //         activePopUpPOI = this; // Set this POI as the active pop-up
  //       } 
  //       if (this.isLongPressed && this.pinned && activePopUpPOI === this) {
  //         // If long-pressed again, close the pop-up and reset state
  //         console.log('Long press canceled!');
  //         this.pinned = false;
  //         activePopUpPOI = null; // Clear the active pop-up reference
  //       }
  //     }, 1000); // Long press duration in milliseconds
  //   },

  //   onMouseUp: function () {
  //     // Cancel the long-press timer if the pointer is released early
  //     clearTimeout(this.longPressTimeout);
  
  //     // If it was a long press, clear the state and close the pop-up
  //     if (this.isLongPressed) {
  //       this.isLongPressed = false; // Clear the long-pressed state
  //       this.closePopup(); // Close the associated pop-up

  //     }
  
  //     this.pressingInProgress = false; // Reset pressing state
  //   },
  
  //   onMouseLeave: function () {
  //     // Cancel the long-press timer if the pointer leaves the POI
  //     clearTimeout(this.longPressTimeout);
  
  //     // If it was a long press, clear the state and close the pop-up
  //     if (this.isLongPressed) {
  //       this.isLongPressed = false; // Clear the long-pressed state
  //       this.closePopup(); // Close the associated pop-up
  //     }
  
  //     this.pressingInProgress = false; // Reset pressing state
  //   },
  
  //   onClick: function () {    
  //     // Suppress the click event if...
  //     if (this.isLongPressed && !this.pinned) {
  //       console.log('Click suppressed!');
  //       return;
  //     }
    
  //     // Not working - Goal: I want to close the pop up if the pinned item is prssed again
  //     if (activePopUpPOI && activePopUpPOI === this && this.pinned) {
  //       activePopUpPOI.closePopup();
  //     }

  //     // Close the currently active pop-up if it exists
  //     if (activePopUpPOI === this) {
  //       activePopUpPOI.closePopup();
  //     }
    
  //     // Open the pop-up for this POI
  //     this.openPopup();
  //     activePopUpPOI = this; // Set this POI as the active pop-up
    
  //     // Reset the long-press state after the click
  //     this.isLongPressed = false;
  //   },

  //   openPopup: function () {
  //     // Create a pop-up container if it doesn't already exist
  //     let popup = document.querySelector('#popup-container');
  //     if (!popup) {
  //       popup = document.createElement('div');
  //       popup.id = 'popup-container';
  //       popup.style.position = 'fixed';
  //       popup.style.bottom = '0'; // Position at the bottom of the screen
  //       popup.style.left = '0'; // Align to the left edge
  //       popup.style.width = '100%'; // Take up the full width of the screen
  //       popup.style.backgroundColor = 'white';
  //       popup.style.padding = '20px';
  //       popup.style.borderTop = '2px solid black'; // Add a border at the top
  //       popup.style.zIndex = '1000';
  //       popup.style.maxHeight = '50%'; // Limit height to half the screen
  //       popup.style.overflowY = 'auto'; // Enable vertical scrolling for content
  //       popup.style.boxShadow = '0 -4px 8px rgba(0, 0, 0, 0.2)'; // Add a shadow at the top
  //       popup.style.borderRadius = '10px 10px 0 0';
  //       popup.style.margin = '0'; // Ensure no margins
  //       popup.style.boxSizing = 'border-box'; // Include padding and border in width calculation
  //       document.body.appendChild(popup);
  //     }
    
    
  //     // Populate the pop-up with the title and content
  //     popup.innerHTML = `
  //     <div style="display: flex; justify-content: space-between; align-items: center;">
  //       <h2 style="margin: 0; text-align: left; font-weight: normal;"><span style="font-weight: normal;">${this.data.title}</span></h2><br><br>
  //       <button id="popup-close" style="margin: 0; padding: 5px 10px; text-align: right;">Close</button>
  //     </div>
  //     <p style="text-align: left;">${this.data.content}</p>
  //   `;
    
  //     // Add a close button to hide the pop-up
  //     const closeButton = popup.querySelector('#popup-close');
  //     closeButton.addEventListener('click', () => {
  //       this.closePopup();
  //     });
    
  //     // Show the pop-up
  //     popup.style.display = 'block';
  //   },
  
  //   closePopup: function () {
  //     const popup = document.querySelector('#popup-container');
  //     if (popup) {
  //       popup.style.display = 'none'; // Hide the pop-up
  //     }
  //     activePopUpPOI = null; // Clear the active pop-up reference
  //   }
  // });

  // * Rotates an obj around a specified axis using quaternions
  AFRAME.registerComponent('quaternion-rotator', {
    schema: {
      heading: { type: 'number', default: 0 }, // Smoothed heading (yaw)
      tilting: { type: 'number', default: 0 }, // Smoothed tilting (pitch)
      rolling: { type: 'number', default: 0 }  // Smoothed rolling (roll)
    },
  
    init: function () {
      this.quaternion = new THREE.Quaternion(); // Initialize a quaternion
      this.euler = new THREE.Euler(); // Initialize an Euler object
    },
  
    update: function () {
      // Convert the smoothed values to radians
      const headingRad = THREE.MathUtils.degToRad(this.data.heading); // Yaw (Z-axis)
      const tiltingRad = THREE.MathUtils.degToRad(this.data.tilting); // Pitch (Y-axis)
      const rollingRad = THREE.MathUtils.degToRad(this.data.rolling); // Roll (X-axis)
  
      // Update the Euler object with the smoothed values
      this.euler.set(tiltingRad, rollingRad, headingRad, 'YXZ'); // YXZ order for device orientation
  
      // Convert the Euler angles to a quaternion
      this.quaternion.setFromEuler(this.euler);
  
      // Apply the quaternion to the entity's object3D
      this.el.object3D.quaternion.copy(this.quaternion);
  
      // Debugging: Log the quaternion and Euler angles
      // console.log(`Quaternion updated: 
      //   X: ${this.quaternion.x.toFixed(3)}, 
      //   Y: ${this.quaternion.y.toFixed(3)}, 
      //   Z: ${this.quaternion.z.toFixed(3)}, 
      //   W: ${this.quaternion.w.toFixed(3)}`);
    }
  });