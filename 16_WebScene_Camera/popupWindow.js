 // Keep track of the expanded state of the open pop up
window.GLOBAL_POPUP_COLLAPSED = false;

// Original code for collapsed
        // <div class="title" style="display:flex; align-items:center; gap:8px; padding:12px; min-height:40px; max-height:40px; height:40px; margin-bottom: -8px; overflow:hidden;">
        //   <img width="32" height="32" src="${labelImage || ""}">
        //   <h2 style="margin:0; font-size:16px; font-weight:normal; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1 1 auto;"><b>${title || ""}</b></h2>
        //   <span style="flex:1"></span>
        //   <button id="popup-expand" style="margin-left:8px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
        //     <img src="./assets/ui/CollapseButton.svg" alt="Expand" style="width:30px; height:30px; transform:rotate(180deg); transition: transform 0.3s;">
        //   </button>
        //   <button id="popup-close" style="margin-left:8px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
        //     <img src="./assets/ui/CloseButton_sm.svg" alt="Close" style="width:30px; height:30px;">
        //   </button>
        // </div>

        // On the side
        // <div style="display: flex; justify-content: flex-end; align-items: center; gap: 4px; padding: 8px 8px 0 8px;">
        
        //   <button id="popup-expand" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
        //     <img src="./assets/ui/CollapseButton.svg" alt="Expand" style="width:28px; height:28px; transform:rotate(180deg); transition: transform 0.3s;">
        //   </button>
        //   <button id="popup-close" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
        //     <img src="./assets/ui/CloseButton_sm.svg" alt="Close" style="width:28px; height:28px;">
        //   </button>
        // </div>
        // <div style="padding: 8px 12px 0 12px; text-align: left; width: 100%;">
        //   <h2 style="margin:0; font-size:16px; font-weight:normal; white-space:normal; overflow-wrap:break-word; word-break:break-word;">
        //     <img width="32" height="32" src="${labelImage || ""}">${title || ""}
        //   </h2>
        // </div>

export function showPopup({
  title,
  distance,
  content,
  labelImage,
  onClose,
  containerId = 'popup-container'
}) {
  // Remove any existing popup
  const existing = document.getElementById(containerId);
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = containerId;
  let isCollapsed = window.GLOBAL_POPUP_COLLAPSED || false;

  function render() {
    // Set the class based on collapsed state
    if (isCollapsed) {
      popup.classList.add('collapsed');
      popup.classList.remove('expanded');
    } else {
      popup.classList.remove('collapsed');
      popup.classList.add('expanded');
    }

    if (isCollapsed) {
      popup.innerHTML = `
        <div class="title" style="display:flex; align-items:center; gap:8px; padding:12px; min-height:40px; max-height:40px; height:40px; margin-bottom: -8px; overflow:hidden;">
          <img width="32" height="32" src="${labelImage || ""}">
          <h2 style="margin:0; font-size:16px; font-weight:normal; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1 1 auto;"><b>${title || ""}</b></h2>
          <span style="flex:1"></span>
          <button id="popup-expand" style="margin-left:8px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <img src="./assets/ui/CollapseButton.svg" alt="Expand" style="width:30px; height:30px; transform:rotate(180deg); transition: transform 0.3s;">
          </button>
          <button id="popup-close" style="margin-left:8px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <img src="./assets/ui/CloseButton_sm.svg" alt="Close" style="width:30px; height:30px;">
          </button>
        </div>
      `;
    } else {
      popup.innerHTML = `
        <div class="title" style="display:flex; align-items:center; gap:8px; padding:12px;">
          <img width="32" height="32" src="${labelImage || ""}">
          <h2 style="margin:0; font-weight:normal;"><b>Shelter</b></h2>
          <span style="flex:1"></span>
          <span style="font-size:12px; color:#000;">${distance || ""} away</span>
          <button id="popup-collapse" style="margin-left:8px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <img src="./assets/ui/CollapseButton.svg" alt="Collapse" style="width:30px; height:30px; transform:rotate(0deg); transition: transform 0.3s;">
          </button>
          <button id="popup-close" style="margin-left:8px; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            <img src="./assets/ui/CloseButton_sm.svg" alt="Close" style="width:30px; height:30px;">
          </button>
        </div>
        <div class="title2" style="padding:0 12px; margin-bottom:10px; margin-top:0;">${title || ""}</div>
        <p class="popup-content" style="padding:0 12px 12px 12px; margin:0;">${content || ""}</p>
      `;
    }

    // Collapse/expand logic
    const collapseBtn = popup.querySelector('#popup-collapse');
    if (collapseBtn) {
      collapseBtn.onclick = () => {
        isCollapsed = true;
        window.GLOBAL_POPUP_COLLAPSED = true;
        render();
      };
    }
    const expandBtn = popup.querySelector('#popup-expand');
    if (expandBtn) {
      expandBtn.onclick = () => {
        isCollapsed = false;
        window.GLOBAL_POPUP_COLLAPSED = false;
        render();
      };
    }
    // Close logic
    const closeBtn = popup.querySelector('#popup-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        popup.remove();
        window.GLOBAL_POPUP_COLLAPSED = false;
        if (typeof onClose === 'function') onClose();
      };
    }
  }

  render();
  document.body.appendChild(popup);
}

window.showPopup = showPopup; // Attach to window for global access

// /**
//  * Show a popup window in a given container.
//  * @param {Object} options
//  * @param {string} options.title
//  * @param {string} options.distance
//  * @param {string} options.content
//  * @param {string} options.labelImage
//  * @param {function} [options.onClose]
//  * @param {string} options.containerId - DOM id for the popup container
//  */
// export function showPopup({
//   title,
//   distance,
//   content,
//   labelImage,
//   onClose,
//   containerId
// }) {
//   const id = containerId;

//   let popup = document.getElementById(id);
//   if (!popup) {
//     popup = document.createElement('div');
//     popup.id = id;
//     document.body.appendChild(popup);
//   }

//   popup.innerHTML = `
//   <div class = "popup-grab-handle"></div>
//     <div class="title" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex: 1 0 0; width: 100%;">
//       <div style="display: flex;align-items: center; gap: 8px; flex: 1 0 0;">  
//         <img width="32px" height="32px" src ='${labelImage || ""}'>
//         <h2 style="margin: 0; text-align: left; font-weight: normal;"><b>Shelter</b></h2>
//       </div>
//       <div style="display: flex; justify-content: right; align-items: right; align-items: baseline; flex: 1 0 0; gap: 8px;">
//         <span style="font-size: 12px; color: var(--Black, #000); text-align: right; ">${distance || ""} away</span>
//         <button id="popup-close" style="margin: 0; padding: 0; background: none; border: none; cursor: pointer;">
//           <img src="./assets/ui/CloseButton_sm.svg" alt="Close" style="width: 30px; height: 30px;">
//         </button>
//       </div>
//     </div>
//     <div class="title2" style="text-align: left; width: 100%; margin-bottom: 10px;">${title || ""}</div>
//     <p style="text-align: left; width: 100%; margin-top: 0;">${content || ""}</p>
//   `;

//   popup.style.display = 'block';

//   // Close button logic
//   const closeButton = popup.querySelector('#popup-close');
//   if (closeButton) {
//     closeButton.onclick = () => {
//       popup.style.display = 'none';
//       if (typeof onClose === 'function') onClose();
//     };
//   }
// }