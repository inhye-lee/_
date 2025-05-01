let centeredPOI = null; // Variable to track the currently centered POI

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
      longPressDuration: { type: 'number', default: 1000 } // Long press duration in milliseconds
    },
  
    init: function () {
      const el = this.el; // The current POI
      const camera = document.querySelector('[gps-camera]').object3D; // Get the camera's 3D object
  
      this.camera = camera;
      this.isFading = false; // Tracks if the POI is currently fading in or out
      this.isLongPressed = false; // Tracks if the title is toggled by a long press
      this.longPressTimeout = null; // Timeout for detecting long press
  
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

      //
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
        // console.log('Long press detected on POI:', this.el);
        this.fadeIn();
      
      } else {
        // Hide the title unless the POI is centered
        if (this.el !== centeredPOI) {
          // console.log('Long press detected on POI again:', this.el);
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
        const padding = this.isLongPressed ? 0.25 : 0.2; // Larger padding for long press
        const opacity = this.isLongPressed ? 1 : 1; // Higher opacity for long press

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

      // Trigger haptic feedback (Not working on iOS Safaru)
      if (navigator.vibrate) {
        if (this.isLongPressed) {
          navigator.vibrate(200); // Vibrate for 200ms when pinning
        } else {
          navigator.vibrate([100, 50, 100]); // Vibrate with a pattern when unpinning
        }
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