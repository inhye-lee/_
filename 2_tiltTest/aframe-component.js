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
  
  // * Show the title of the POI when it is centered
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
  
      // State to track animation
      this.isFading = false; // Tracks if the POI is currently fading in or out
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
        this.fadeIn(); // Always show the title for the centered POI
      } else {
        this.fadeOut(); // Hide the title if the POI is not centered
      }
    },
  
    fadeIn: function () {
      if (this.isFading) return; // Prevent overlapping animations
      this.isFading = true; // Mark as fading
  
      if (this.textParent) {
        const textElement = this.textParent.querySelector('.poi-text'); // Get the text element
        const backgroundElement = textElement.querySelector('a-plane'); // Get the background element
  
        if (textElement) {
          textElement.setAttribute('visible', true); // Make the text visible
          textElement.setAttribute('animation__fadein', {
            property: 'opacity',
            to: 1,
            dur: 500, // Duration of fade-in (500ms)
            easing: 'easeInOutQuad'
          });
        }
  
        if (backgroundElement) {
          backgroundElement.setAttribute('visible', true); // Make the background visible
          backgroundElement.setAttribute('animation__fadein', {
            property: 'opacity',
            to: 0.9, // Target opacity for the background
            dur: 500, // Duration of fade-in (500ms)
            easing: 'easeInOutQuad'
          });
        }
  
        this.textParent.setAttribute('visible', true); // Ensure the parent is visible
      }
  
      if (this.connectingLine) {
        this.connectingLine.setAttribute('visible', true); // Make the connecting line visible
        this.connectingLine.setAttribute('animation__fadein', {
          property: 'opacity',
          to: 1,
          dur: 500, // Duration of fade-in (500ms)
          easing: 'easeInOutQuad'
        });
      }
  
      setTimeout(() => {
        this.isFading = false; // Reset fading state after fade-in
      }, 500);
    },
  
    fadeOut: function () {
      if (this.isFading) return; // Prevent overlapping animations
      this.isFading = true; // Mark as fading
  
      if (this.textParent) {
        const textElement = this.textParent.querySelector('.poi-text'); // Get the text element
        const backgroundElement = textElement.querySelector('a-plane'); // Get the background element
  
        if (textElement) {
          textElement.setAttribute('animation__fadeout', {
            property: 'opacity',
            to: 0,
            dur: 500, // Duration of fade-out (500ms)
            easing: 'easeInOutQuad'
          });
          setTimeout(() => {
            textElement.setAttribute('visible', false); // Hide the text after fade-out
          }, 500); // Match the duration of the fade-out animation
        }
  
        if (backgroundElement) {
          backgroundElement.setAttribute('animation__fadeout', {
            property: 'opacity',
            to: 0,
            dur: 500, // Duration of fade-out (500ms)
            easing: 'easeInOutQuad'
          });
          setTimeout(() => {
            backgroundElement.setAttribute('visible', false); // Hide the background after fade-out
          }, 500); // Match the duration of the fade-out animation
        }
  
        this.textParent.setAttribute('visible', false); // Hide the parent container
      }
  
      if (this.connectingLine) {
        this.connectingLine.setAttribute('animation__fadeout', {
          property: 'opacity',
          to: 0,
          dur: 0, // * Fix for lingering line issue
          easing: 'easeInOutQuad'
        });
        setTimeout(() => {
          this.connectingLine.setAttribute('visible', false); // Hide the connecting line after fade-out
        }, 0); //  * Fix for lingering line issue
      }
  
      setTimeout(() => {
        this.isFading = false; // Reset fading state after fade-out
      }, 500);
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
      backgroundEl.setAttribute('color', this.data.color);
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
    }
  });