// @ts-check
 
/**
 * Get an SVG element by ID. Throws if not found or wrong type.
 * @param {string} id
 * @returns {SVGSVGElement}
 */
export function getSvg(id) {
    // @ts-ignore
    return /** @type {SVGSVGElement} */ (document.getElementById(id));
  }