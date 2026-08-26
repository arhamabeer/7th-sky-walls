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

/**
 * Gap between pieces in an arrangement, in centimetres.
 *
 * 10-15cm is the working range: closer and separate pieces start reading as one
 * crowded block, wider and the arrangement stops holding together. 12 is the
 * middle of it. Here rather than in the planner's layout module because the
 * planner's advice quotes the number, and the two had no way of staying in step.
 */
export const PIECE_GAP_CM = 12;

/**
 * How much of a wall an arrangement can take before it starts to lose its
 * impact.
 *
 * Two thirds. The planner's notes said so and the planner itself said nothing
 * until 85%, so an arrangement covering 80% of a wall was described as a mistake
 * by the advice beside it and accepted in silence by the tool. Both read this
 * now, and the planner warns at the figure it actually recommends — gently at
 * this share, firmly when the clear wall runs out.
 */
export const COMFORTABLE_WALL_SHARE = 2 / 3;

/** The same share as a whole-number percentage, for prose. */
export const COMFORTABLE_WALL_PERCENT = Math.round(COMFORTABLE_WALL_SHARE * 100);
