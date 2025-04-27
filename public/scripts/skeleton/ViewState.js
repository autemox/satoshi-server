/*
maintains application state with properties like activeSkeletons, activeDirection, clipboardMode, and skeletonsByDirection that track selection and view settings
*/

export const ViewState = {
  offsetX: 480,
  offsetY: 480,
  scale: 8,
  dragStartSceneX: 0,
  dragStartSceneY: 0,
  notAClick: false,
  dragKey: null, // currently dragging or clicking on this. e.g. skeleton1::LEFT_EYE
  activeSkeletons: new Set(), // selected frames
  activeDirection: 'north', // Current active direction
  clipboardMode: 'image', // image or skeleton

  /** @type {Object.<string, Array<{ id: string, renderer: SkeletonRenderer, group: SVGGElement, imageEl: SVGImageElement }>>} */
  skeletonsByDirection: {
    north: [],
    east: [],
    west: [],
    south: []
  },

  // For backwards compatibility - returns skeletons from the active direction
  get skeletons() {
    return this.skeletonsByDirection[this.activeDirection] || [];
  }
};