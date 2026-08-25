/**
 * Reference room scenes for the true-scale preview.
 *
 * Every measurement is a real-world centimetre value taken from ordinary
 * commercial furniture, because the whole point of the preview is that the
 * proportions can be trusted. Heights in particular are the scale anchors: a
 * viewer reads the artwork against the desk or banquette they already know.
 */

export interface ScenePiece {
  /** Horizontal centre, centimetres from the left wall edge. */
  xCenterCm: number;
  widthCm: number;
  /** Overall height from the floor. */
  heightCm: number;
  /**
   * For seating, the height of the seat pad. The section above it is drawn as
   * a backrest, which is what makes a sofa read as a sofa.
   */
  seatHeightCm?: number;
  /**
   * How the piece is drawn:
   *  - `solid`   a plain block, e.g. a plinth
   *  - `seating` a seat pad with a backrest above it
   *  - `table`   a top slab on thin legs, so the eye reads through to the wall
   *  - `counter` a body with a wider overhanging top, e.g. a reception desk
   */
  style?: "solid" | "seating" | "table" | "counter";
}

export interface RoomScene {
  id: string;
  label: string;
  /** Named in the caption so the scale reference is explicit. */
  reference: string;
  /** Horizontal centre the artwork hangs above. */
  focusXCm: number;
  pieces: ScenePiece[];
}

export const ROOM_SCENES: RoomScene[] = [
  {
    id: "living",
    label: "Lounge",
    reference: "an 85 cm sofa",
    focusXCm: 280,
    pieces: [
      { xCenterCm: 280, widthCm: 210, heightCm: 85, seatHeightCm: 42, style: "seating" },
    ],
  },
  {
    id: "office",
    label: "Office reception",
    reference: "a 110 cm reception desk",
    focusXCm: 285,
    pieces: [
      { xCenterCm: 285, widthCm: 190, heightCm: 110, style: "counter" },
      { xCenterCm: 405, widthCm: 52, heightCm: 92, seatHeightCm: 45, style: "seating" },
    ],
  },
  {
    id: "cafe",
    label: "Café",
    reference: "a 75 cm café table",
    focusXCm: 280,
    pieces: [
      { xCenterCm: 245, widthCm: 70, heightCm: 75, style: "table" },
      { xCenterCm: 185, widthCm: 45, heightCm: 88, seatHeightCm: 45, style: "seating" },
      { xCenterCm: 320, widthCm: 45, heightCm: 88, seatHeightCm: 45, style: "seating" },
    ],
  },
  {
    id: "restaurant",
    label: "Dining room",
    reference: "a 105 cm banquette",
    focusXCm: 285,
    pieces: [
      { xCenterCm: 285, widthCm: 230, heightCm: 105, seatHeightCm: 45, style: "seating" },
    ],
  },
  {
    id: "hotel",
    label: "Hotel lobby",
    reference: "an 80 cm console table",
    focusXCm: 285,
    pieces: [
      { xCenterCm: 285, widthCm: 160, heightCm: 80, style: "table" },
      { xCenterCm: 400, widthCm: 40, heightCm: 130, style: "solid" },
    ],
  },
  {
    id: "classroom",
    label: "Classroom",
    reference: "a 75 cm desk",
    focusXCm: 280,
    pieces: [
      { xCenterCm: 235, widthCm: 120, heightCm: 75, style: "table" },
      { xCenterCm: 235, widthCm: 45, heightCm: 85, seatHeightCm: 44, style: "seating" },
      { xCenterCm: 370, widthCm: 120, heightCm: 75, style: "table" },
    ],
  },
];

/** Which scene best represents a venue the artwork is recommended for. */
const VENUE_SCENE: Record<string, string> = {
  office: "office",
  cafe: "cafe",
  restaurant: "restaurant",
  hotel: "hotel",
  school: "classroom",
  university: "classroom",
};

export function sceneForVenue(venueId: string | undefined): RoomScene {
  const id = venueId ? VENUE_SCENE[venueId] : undefined;
  return ROOM_SCENES.find((s) => s.id === id) ?? ROOM_SCENES[0];
}

export function getScene(id: string): RoomScene {
  return ROOM_SCENES.find((s) => s.id === id) ?? ROOM_SCENES[0];
}
