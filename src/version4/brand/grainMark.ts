// The real Grain mark (from the grain UI repo: assets/grain-mark.svg), on its 320 × 320 grid.
// Three square rings, rust → coral → peach, each open at the bottom-right where its dot sits: the dot closes the ring.
// STROKES are the original drawing (used for the 2D mark so the rings can draw themselves in).
// FILLS are the same rings traced as filled outlines (checked pixel-for-pixel against the original), for the 3D object.

export const LOGO = { rust: "#C85636", coral: "#E27A5F", peach: "#F0BFA7" } as const;

const rr = (x: number, y: number, s: number, r: number) =>
  `M${x + r} ${y}H${x + s - r}A${r} ${r} 0 0 1 ${x + s} ${y + r}V${y + s - r}A${r} ${r} 0 0 1 ${x + s - r} ${y + s}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + s - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

export type Ring = {
  color: string;
  /** the original stroke: starts at the ring's opening, so drawing it in reads as the ring winding round */
  stroke: { d: string; width: number; join: "miter" | "round" };
  /** concave fillets at the inner corners (small fills in the original) */
  fillets: string;
  /** the ring as one filled outline (3D) */
  fill: string;
  /** the dot that sits in this ring's opening */
  dot: { x: number; y: number; s: number; r: number; color: string };
};

// outer → inner
export const RINGS: Ring[] = [
  {
    color: LOGO.rust,
    stroke: { d: "M305 280V15H15V305H280", width: 30, join: "miter" },
    fillets: "M30 30H48Q30 30 30 48Z M290 30V48Q290 30 272 30Z M30 290H48Q30 290 30 272Z",
    fill: "M290 280V48Q290 30 272 30H48Q30 30 30 48V272Q30 290 48 290H280V320H0V0H320V280Z",
    dot: { x: 290, y: 290, s: 30, r: 4, color: LOGO.rust },
  },
  {
    color: LOGO.coral,
    stroke: { d: "M260 240V66Q260 60 254 60H66Q60 60 60 66V254Q60 260 66 260H240", width: 24, join: "round" },
    fillets: "M72 72H87Q72 72 72 87Z M248 72V87Q248 72 233 72Z M72 248H87Q72 248 72 233Z",
    fill: "M248 240V87Q248 72 233 72H87Q72 72 72 87V233Q72 248 87 248H240V272H66A18 18 0 0 1 48 254V66A18 18 0 0 1 66 48H254A18 18 0 0 1 272 66V240Z",
    dot: { x: 248, y: 248, s: 24, r: 3, color: LOGO.coral },
  },
  {
    color: LOGO.peach,
    stroke: { d: "M219 201V105Q219 101 215 101H105Q101 101 101 105V215Q101 219 105 219H201", width: 22, join: "round" },
    fillets: "M112 112H124Q112 112 112 124Z M208 112V124Q208 112 196 112Z M112 208H124Q112 208 112 196Z",
    fill: "M208 201V124Q208 112 196 112H124Q112 112 112 124V196Q112 208 124 208H201V230H105A15 15 0 0 1 90 215V105A15 15 0 0 1 105 90H215A15 15 0 0 1 230 105V201Z",
    dot: { x: 208, y: 208, s: 22, r: 3, color: LOGO.peach },
  },
];

/** the square at the centre: where the work starts */
export const CORE = { x: 141, y: 141, s: 38, r: 3, color: LOGO.rust };

export const rectPath = (q: { x: number; y: number; s: number; r: number }) => rr(q.x, q.y, q.s, q.r);
