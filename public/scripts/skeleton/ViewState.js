export const ViewState = {
    offsetX: 480,
    offsetY: 480,
    scale: 8,
    dragStartSceneX: 0,
    dragStartSceneY: 0,
    notAClick: false,
    clickedKey: null, // currently dragging or clicking on this.  e.g. skeleton1::LEFT_EYE
    activeSkeleton: '', // the last skeleton that was clicked on

    /** @type {{ id: string, renderer: SkeletonRenderer, group: SVGGElement, imageEl: SVGImageElement }[]} */
    skeletons: [],
  };