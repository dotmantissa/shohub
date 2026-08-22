function ProjectFrame({
  x,
  y,
  width,
  featured = false,
  delay,
}: {
  x: number;
  y: number;
  width: number;
  featured?: boolean;
  delay: string;
}) {
  return (
    <g
      className={`showcase-frame ${featured ? "showcase-frame--featured" : ""}`}
      transform={`translate(${x} ${y})`}
      style={{ animationDelay: delay }}
    >
      <rect className="showcase-frame__body" width={width} height="82" rx="5" />
      <rect className="showcase-frame__media" x="8" y="8" width={width - 16} height="43" rx="3" />
      <path className="showcase-frame__line" d={`M8 61H${Math.round(width * 0.68)}`} />
      <path
        className="showcase-frame__line showcase-frame__line--short"
        d={`M8 70H${Math.round(width * 0.45)}`}
      />
      <rect className="showcase-frame__tag" x={width - 29} y="59" width="21" height="11" rx="3" />
    </g>
  );
}

export function ShowcaseMotion() {
  return (
    <div className="showcase-motion" aria-hidden="true">
      <svg viewBox="0 0 920 300" role="presentation" preserveAspectRatio="xMidYMid slice">
        <path className="showcase-rail" d="M40 112H880" />
        <path className="showcase-rail" d="M40 238H880" />
        <path className="showcase-uplink" pathLength="1" d="M92 238V270H828V238" />

        <ProjectFrame x={80} y={25} width={132} delay="-1.8s" />
        <ProjectFrame x={244} y={15} width={154} featured delay="-3.4s" />
        <ProjectFrame x={430} y={31} width={126} delay="-0.6s" />
        <ProjectFrame x={588} y={20} width={146} delay="-2.5s" />
        <ProjectFrame x={766} y={35} width={94} delay="-4.2s" />

        <ProjectFrame x={130} y={143} width={142} delay="-2.9s" />
        <ProjectFrame x={306} y={154} width={112} delay="-0.9s" />
        <ProjectFrame x={452} y={138} width={156} featured delay="-3.8s" />
        <ProjectFrame x={642} y={151} width={128} delay="-1.4s" />

        <g className="showcase-selector">
          <rect width="170" height="98" rx="7" />
          <path d="M12 0V-10M158 0V-10M12 98V108M158 98V108" />
        </g>

        <g className="showcase-packet">
          <rect width="13" height="13" rx="2" />
          <path d="M4 6.5H9" />
        </g>
        <g className="showcase-packet showcase-packet--late">
          <rect width="13" height="13" rx="2" />
          <path d="M4 6.5H9" />
        </g>
      </svg>
    </div>
  );
}
