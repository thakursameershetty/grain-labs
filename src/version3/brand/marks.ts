// Candidate "simple G" marks for v2 (no circle, no dots). Each is one filled SVG path on a 100 × 100 grid,
// so the same geometry drives the flat logo, the favicon and the extruded 3D hero object.
// `accent` (optional) is a second, separate piece drawn in the accent colour.

export type Mark = {
  id: string;
  name: string;
  note: string;
  d: string;
  accent?: string;
};

export const MARKS: Mark[] = [
  {
    id: "block",
    name: "Block",
    note: "Rounded-square G with a full-width top arm. Same family as the Audiowide letters, so the logo and wordmark match.",
    d: "M100 0H26A26 26 0 0 0 0 26V74A26 26 0 0 0 26 100H74A26 26 0 0 0 100 74V44H52V62H80V74A6 6 0 0 1 74 80H26A6 6 0 0 1 20 74V26A6 6 0 0 1 26 20H100Z",
  },
  {
    id: "chamfer",
    name: "Chamfer",
    note: "45° cut corners: engineered, precise, a little industrial. Reads well tiny and catches light nicely in 3D.",
    d: "M100 0H22L0 22V78L22 100H78L100 78V44H52V62H80V70L70 80H30L20 70V30L30 20H100Z",
  },
  {
    id: "signed",
    name: "Signed",
    note: "An open bracket plus a separate hook in the accent colour. The hook is the sign-off: the human approval that completes the G.",
    d: "M100 0H26A26 26 0 0 0 0 26V74A26 26 0 0 0 26 100H70V80H26A6 6 0 0 1 20 74V26A6 6 0 0 1 26 20H100Z",
    accent: "M50 42H100V100H80V60H50Z",
  },
  {
    id: "thread",
    name: "Thread",
    note: "Thin monoline G drawn as one continuous path, a single thread a run follows. Lightest and calmest of the four.",
    d: "M100 0H30A30 30 0 0 0 0 30V70A30 30 0 0 0 30 100H70A30 30 0 0 0 100 70V46H50V58H88V70A18 18 0 0 1 70 88H30A18 18 0 0 1 12 70V30A18 18 0 0 1 30 12H100Z",
  },
];
