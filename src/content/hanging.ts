/**
 * Where a piece sits on the wall.
 *
 * Its own module, importing nothing, because five things need this number and
 * they sit on both sides of the server boundary and inside the copy file: the
 * room-scale preview, the wall planner's layout maths, the printed specification
 * sheet, the corner-marking instructions, and the planner's hanging notes.
 *
 * It had already drifted. The preview and the planner each declared their own
 * `EYE_LEVEL_CM = 145`, and the specification sheet introduced a third number
 * under a third name — 150 — so a specifier reading the planner's advice and the
 * sheet they printed from it saw two different heights for the same convention.
 * One constant, interpolated into the prose as well, is the only arrangement
 * where that cannot happen again.
 *
 * 145cm is the gallery convention: 57 inches to the centre of the work, which is
 * roughly the eye line of a standing adult. Museums use 57-60in; the lower end is
 * the safer choice in a room where people sit as well as stand.
 */
export const EYE_LEVEL_CM = 145;

/** The same height in metres, to two places, for prose and for drawings. */
export const EYE_LEVEL_M = (EYE_LEVEL_CM / 100).toFixed(2);
