import type {
  SarahNarrativeState,
  SarahStoryStepDTO
} from "../../../application/story/contracts";

const FACES: Readonly<Record<SarahNarrativeState, Readonly<{
  leftBrow: string;
  rightBrow: string;
  eyeRy: number;
  mouth: string;
  blush: number;
  eyeArc: boolean;
  headTilt: number;
}>>> = {
  IDLE: {
    leftBrow: "",
    rightBrow: "",
    eyeRy: 3.8,
    mouth: "M45 51 Q50 53.5 55 51",
    blush: 0,
    eyeArc: false,
    headTilt: 0
  },
  CURIOUS: {
    leftBrow: "rotate(-14 42.5 33)",
    rightBrow: "translate(0,-3.5)",
    eyeRy: 3.2,
    mouth: "M46 51.5 Q50 51 54 52.5",
    blush: 0,
    eyeArc: false,
    headTilt: -4
  },
  UNCERTAIN: {
    leftBrow: "rotate(-16 42.5 33)",
    rightBrow: "rotate(16 57.5 33)",
    eyeRy: 4.9,
    mouth: "M45 54 Q50 49.5 55 54",
    blush: 0,
    eyeArc: false,
    headTilt: 3
  },
  CONCERNED: {
    leftBrow: "rotate(-16 42.5 33)",
    rightBrow: "rotate(16 57.5 33)",
    eyeRy: 4.9,
    mouth: "M45 54 Q50 49.5 55 54",
    blush: 0,
    eyeArc: false,
    headTilt: 3
  },
  THINKING: {
    leftBrow: "rotate(-14 42.5 33)",
    rightBrow: "translate(0,-3.5)",
    eyeRy: 3.2,
    mouth: "M46 51.5 Q50 51 54 52.5",
    blush: 0,
    eyeArc: false,
    headTilt: -4
  },
  SURPRISED: {
    leftBrow: "translate(0,-5)",
    rightBrow: "translate(0,-5)",
    eyeRy: 5.4,
    mouth: "M46.5 50 Q50 46.5 53.5 50 Q50 55.5 46.5 50",
    blush: 0,
    eyeArc: false,
    headTilt: 0
  },
  RELIEVED_TO_UNDERSTAND: {
    leftBrow: "translate(0,-1)",
    rightBrow: "translate(0,-1)",
    eyeRy: 1.5,
    mouth: "M44.5 50.5 Q50 54.5 55.5 50.5",
    blush: 0.3,
    eyeArc: false,
    headTilt: 2
  },
  COMPLETE: {
    leftBrow: "translate(0,-3)",
    rightBrow: "translate(0,-3)",
    eyeRy: 3.8,
    mouth: "M42.5 49.5 Q50 58.5 57.5 49.5",
    blush: 0.65,
    eyeArc: true,
    headTilt: 0
  }
};

export function SarahStoryCharacter({
  step,
  motionDisabled,
  paused
}: Readonly<{
  step: SarahStoryStepDTO | null;
  motionDisabled: boolean;
  paused: boolean;
}>) {
  const face = FACES[step?.narrativeState ?? "IDLE"];
  return (
    <div
      className={`fy-sarah-character ${motionDisabled ? "motion-disabled" : ""} ${paused ? "paused" : ""}`.trim()}
      data-position={step?.characterPosition ?? "start"}
      data-testid="sarah-story-character"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 190" focusable="false">
        <g className="fy-sarah-leg-a">
          <rect x="38" y="108" width="10" height="58" rx="5" fill="#2a2a33"/>
          <rect x="36" y="163" width="14" height="9" rx="4" fill="#c8e85b"/>
        </g>
        <g className="fy-sarah-leg-b">
          <rect x="52" y="108" width="10" height="58" rx="5" fill="#2a2a33"/>
          <rect x="50" y="163" width="14" height="9" rx="4" fill="#c8e85b"/>
        </g>
        <g className="fy-sarah-body">
          <path d="M34 74q16-7 32 0l4 40q-20 6-40 0z" fill="#3fa0e0"/>
          <rect x="32" y="106" width="36" height="10" rx="4" fill="#2a2a33"/>
          <circle cx="34" cy="79" r="5.5" fill="#3fa0e0"/>
          <circle cx="66" cy="79" r="5.5" fill="#3fa0e0"/>
          <path d="M56 75l24 28" stroke="#6fc58c" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <rect x="74" y="101" width="16" height="19" rx="3" fill="#6fc58c"/>
          <rect x="74" y="101" width="16" height="4.5" rx="2.2" fill="#4e9e6b"/>
          <g className="fy-sarah-arm-a">
            <rect x="26" y="76" width="8" height="40" rx="4" fill="#3fa0e0"/>
            <circle cx="30" cy="118" r="5" fill="#e3b292"/>
          </g>
          <g className="fy-sarah-arm-b">
            <rect x="66" y="76" width="8" height="40" rx="4" fill="#3fa0e0"/>
            <circle cx="70" cy="118" r="5" fill="#e3b292"/>
          </g>
          <g transform={`rotate(${face.headTilt} 50 62)`}>
            <rect x="46" y="62" width="8" height="12" rx="4" fill="#ce9b7c"/>
            <path d="M27 44q0-30 23-30t23 30q0 16-6 22l-3-26H36l-3 26q-6-6-6-22z" fill="#4a3428"/>
            <circle cx="50" cy="42" r="21" fill="#e3b292"/>
            <path d="M29 40q1-26 21-26t21 26q-4-14-21-14T29 40z" fill="#4a3428"/>
            <ellipse cx="27" cy="46" rx="4" ry="9" fill="#4a3428"/>
            <ellipse cx="73" cy="46" rx="4" ry="9" fill="#4a3428"/>
            <path d="M38 33q4.5-3 9 0" transform={face.leftBrow} stroke="#241a14" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M53 33q4.5-3 9 0" transform={face.rightBrow} stroke="#241a14" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <ellipse cx="42.5" cy="42" rx="2.9" ry={face.eyeRy} fill="#241a14" opacity={face.eyeArc ? 0 : 1}/>
            <ellipse cx="57.5" cy="42" rx="2.9" ry={face.eyeRy} fill="#241a14" opacity={face.eyeArc ? 0 : 1}/>
            <path d="M38.5 43q4-5 8 0" stroke="#241a14" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity={face.eyeArc ? 1 : 0}/>
            <path d="M53.5 43q4-5 8 0" stroke="#241a14" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity={face.eyeArc ? 1 : 0}/>
            <ellipse cx="37" cy="48" rx="4" ry="2.4" fill="#e5806f" opacity={face.blush}/>
            <ellipse cx="63" cy="48" rx="4" ry="2.4" fill="#e5806f" opacity={face.blush}/>
            <path d={face.mouth} stroke="#241a14" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </g>
        </g>
      </svg>
    </div>
  );
}
