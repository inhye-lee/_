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
  
  // * Show the title of the POI when it is centered & on long press
  AFRAME.registerComponent('toggle-title', {
    schema: {
      full: { type: 'string', default: '' }, // Full text for the POI
      threshold: { type: 'number', default: THREE.MathUtils.degToRad(5) }, // Threshold in radians (5 degrees by default)
      longPressDuration: { type: 'number', default: 1000 }, // Long press duration in milliseconds
      initialTextScale: { type: 'vec3', default: { x: 1, y: 1, z: 1 } } // Default initial scale
    },
  
    init: function () {
      const el = this.el; // The current POI
      const camera = document.querySelector('[gps-camera]').object3D; // Get the camera's 3D object
  
      this.camera = camera;
      this.isFading = false; // Tracks if the POI is currently fading in or out
      this.isLongPressed = false; // Tracks if the title is toggled by a long press
      this.longPressTimeout = null; // Timeout for detecting long press
      this.initialScale = this.data.initialTextScale; // Initial scale for the text
  
      // Get the text element and connecting line inside the POI
      const textEntity = el.querySelector('.poi-text');
      const textParent = textEntity ? textEntity.parentNode : null;
      const connectingLine = el.querySelector('.connecting-line');

      // Initialize the text and connecting line visibility
      if (textParent) {
        textParent.setAttribute('visible', false); // Hide the text by default
        textParent.setAttribute('scale', `${this.initialScale.x} ${this.initialScale.y} ${this.initialScale.z}`);
      }
      if (connectingLine) {
        connectingLine.setAttribute('visible', false); // Hide the connecting line by default
      }
  
      this.textParent = textParent;
      this.connectingLine = connectingLine;
      this.textEntity = textEntity;
  
      // Add long-press event listeners
      el.addEventListener('mousedown', this.onMouseDown.bind(this));
      el.addEventListener('mouseup', this.onMouseUp.bind(this));
      el.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    },
  
    tick: function () {
      const camera = this.camera;
      const threshold = this.data.threshold;
  
      // Skip centered logic if the title is toggled by a long press
      if (this.isLongPressed) {
        this.fadeIn();
      
      } else {
        // Hide the title unless the POI is centered
        if (this.el !== centeredPOI) {
          this.fadeOut();
        }
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
      if (this.el === centeredPOI) {
        this.fadeIn(); // Always show the title for the centered POI
      } else {
        this.fadeOut(); // Hide the title if the POI is not centered
      }
    },
  
    fadeIn: function () {
      if (this.isFading) return; // Prevent overlapping animations
      this.isFading = true; // Mark as fading
  
      if (this.textParent) {
        this.textParent.setAttribute('visible', true); // Ensure the parent is visible

        const bgColor = this.isLongPressed ? '#008080' : 'black'; // Teal Blue for long press, Black for default
        const padding = this.isLongPressed ? 0.25 : 0.15; // Larger padding for long press
        const opacity = this.isLongPressed ? 1 : 0.8; // Higher opacity for long press

        if (!this.isLongPressed) {
          this.textParent.setAttribute('scale', `${this.initialScale.x} ${this.initialScale.y} ${this.initialScale.z}`); // Reset to final scale
        } else {
          this.textParent.setAttribute('scale', `${this.initialScale.x} ${this.initialScale.y} ${this.initialScale.z}`); // Reset to final scale
        }
        
        this.textEntity.setAttribute('text-background', {
          color: bgColor,
          padding: padding,
          opacity: opacity
        }); // Update the text-background component with new properties
      }

      if (this.connectingLine) {
        this.connectingLine.setAttribute('visible', true); // Make the connecting line visible
      }

      setTimeout(() => {
        this.isFading = false; // Reset fading state after fade-in
      }, 500);
    },
  
    fadeOut: function () {
      if (this.isFading) return; // Prevent overlapping animations
      this.isFading = true; // Mark as fading
  
      if (this.textParent) {
        this.textParent.setAttribute('visible', false); // Hide the parent container

        // Reset the scale to its initial value
        this.textParent.setAttribute('scale', `${this.initialScale.x} ${this.initialScale.y} ${this.initialScale.z}`); // Reset to final scale

        // Reset the background color to default using getAttribute and setAttribute
        const textBackground = this.textEntity.getAttribute('text-background');
        this.textEntity.setAttribute('text-background', {
          ...textBackground, // Preserve existing properties
          color: 'black' // Reset to default color
        });
      }
  
      if (this.connectingLine) {
        this.connectingLine.setAttribute('visible', false); // Hide the connecting line
      }
      
      setTimeout(() => {
        this.isFading = false; // Reset fading state after fade-out
      }, 500);
    },
  
    onMouseDown: function () {

      this.longPressTimeout = setTimeout(() => { // Start the long-press timer
        this.isLongPressed = !this.isLongPressed; // Toggle the long-press state

        // Trigger haptic feedback (Not working on iOS)
        if (navigator.vibrate) {
          if (this.isLongPressed) {
            navigator.vibrate(200); // Vibrate for 200ms when pinning
          } else {
            navigator.vibrate([100, 50, 100]); // Vibrate with a pattern when unpinning
          }
        }

        // Visual Feedback 
        // Use the initial scale to calculate the popping animation
        const fromScale = {
          x: this.initialScale.x * 0.3, // Start at half the initial scale
          y: this.initialScale.y * 0.3,
          z: this.initialScale.z * 0.3
        };
        const toScale = {
            x: this.initialScale.x *1.0, // End at the initial scale
            y: this.initialScale.y *1.0,
            z: this.initialScale.z *1.0
          };
        
      // Popping Animation Does not work all the time...
      if (this.isLongPressed) {
        // Add a popping animation by scaling up the textParent
        this.textParent.setAttribute('animation__pop', {
          property: 'scale',
          from: `${fromScale.x} ${fromScale.y} ${fromScale.z}`, // Start smaller
          to: `${toScale.x} ${toScale.y} ${toScale.z}`, // End at the current scale
          dur: 500, // Duration of the animation in milliseconds
          easing: 'easeOutElastic', // Easing function for a smooth pop effect
          loop: false // Ensure the animation happens only once
        });
        // Remove the animation after it completes
        setTimeout(() => {
          this.textParent.setAttribute('scale', `${toScale.x} ${toScale.y} ${toScale.z}`); // Reset to final scale
          this.textParent.removeAttribute('animation__pop'); // Remove the animation attribute
        }, 500); // Match the duration of the animation
      } else {
        // Reset the animation if not long pressed
        this.textParent.removeAttribute('animation__pop');
        this.textParent.setAttribute('scale', `${toScale.x} ${toScale.y} ${toScale.z}`); // Ensure scale is reset
      }

      }, this.data.longPressDuration); // Trigger after the specified duration
    },
  
    onMouseUp: function () {
      clearTimeout(this.longPressTimeout); // Cancel the long-press timer
    },
  
    onMouseLeave: function () {
      clearTimeout(this.longPressTimeout); // Cancel the long-press timer
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
      this.pinned = false; // Tracks if the POI is pinned
      this.isLongPressed = false; // Tracks if the POI is long-pressed
      this.pressingInProgress = false; // Tracks if the POI is being pressed
      this.longPressTimeout = null; // Timeout for detecting long press
  
      // Add event listeners for long press and click differentiation
      el.addEventListener('mousedown', this.onMouseDown.bind(this));
      el.addEventListener('mouseup', this.onMouseUp.bind(this));
      el.addEventListener('mouseleave', this.onMouseLeave.bind(this));
      el.addEventListener('click', this.onClick.bind(this)); // Handle click separately
    },
  
    onMouseDown: function () {
      // Start the long-press timer
      this.pressingInProgress = true;
      this.longPressTimeout = setTimeout(() => {
        this.isLongPressed = !this.isLongPressed; // Toggle the long-press state
        // this.pinned = !this.pinned; // Toggle the pinned state;
        this.pressingInProgress = false; // Reset pressing state
    
        if (this.isLongPressed && !this.pinned && activePopUpPOI !== this) {
          // Open the pop-up when long-pressed
          console.log('Long press detected!');
          this.pinned = true; // Mark this POI as pinned
          activePopUpPOI = this; // Set this POI as the active pop-up
        } 
        if (this.isLongPressed && this.pinned && activePopUpPOI === this) {
          // If long-pressed again, close the pop-up and reset state
          console.log('Long press canceled!');
          this.pinned = false;
          activePopUpPOI = null; // Clear the active pop-up reference
        }
      }, 1000); // Long press duration in milliseconds
    },

    onMouseUp: function () {
      // Cancel the long-press timer if the pointer is released early
      clearTimeout(this.longPressTimeout);
  
      // If it was a long press, clear the state and close the pop-up
      if (this.isLongPressed) {
        this.isLongPressed = false; // Clear the long-pressed state
        this.closePopup(); // Close the associated pop-up

      }
  
      this.pressingInProgress = false; // Reset pressing state
    },
  
    onMouseLeave: function () {
      // Cancel the long-press timer if the pointer leaves the POI
      clearTimeout(this.longPressTimeout);
  
      // If it was a long press, clear the state and close the pop-up
      if (this.isLongPressed) {
        this.isLongPressed = false; // Clear the long-pressed state
        this.closePopup(); // Close the associated pop-up
      }
  
      this.pressingInProgress = false; // Reset pressing state
    },
  
    onClick: function () {    
      // Suppress the click event if...
      if (this.isLongPressed && !this.pinned) {
        console.log('Click suppressed!');
        return;
      }
    
      // Not working - Goal: I want to close the pop up if the pinned item is prssed again
      if (activePopUpPOI && activePopUpPOI === this && this.pinned) {
        activePopUpPOI.closePopup();
      }

      // Close the currently active pop-up if it exists
      if (activePopUpPOI === this) {
        activePopUpPOI.closePopup();
      }
    
      // Open the pop-up for this POI
      this.openPopup();
      activePopUpPOI = this; // Set this POI as the active pop-up
    
      // Reset the long-press state after the click
      this.isLongPressed = false;
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
        <h2 style="margin: 0; text-align: left; font-weight: normal;"><span style="font-weight: normal;">${this.data.title}</span></h2><br><br>
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
      activePopUpPOI = null; // Clear the active pop-up reference
    }
  });

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