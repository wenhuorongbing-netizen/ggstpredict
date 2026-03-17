import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";

interface BracketMatchNodeProps {
  match: {
    id: string;
    playerA: string;
    playerB: string;
    charA?: string | null;
    charB?: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
    status: string;
    winner?: string | null;
    roundName?: string | null;
  };
  variant?: "winners" | "losers" | "grand" | "reset";
  className?: string;
  isHighlighted?: boolean;
  onHoverStart?: (matchId: string) => void;
  onHoverEnd?: () => void;
}

function getStatusPlate(status: string) {
  if (status === "OPEN") {
    return { label: "\u53ef\u4e0b\u6ce8", className: "bracket-match-node__plate bracket-match-node__plate--open" };
  }

  if (status === "LOCKED") {
    return { label: "\u8fdb\u884c\u4e2d", className: "bracket-match-node__plate bracket-match-node__plate--locked" };
  }

  if (status === "SETTLED") {
    return { label: "\u5df2\u7ed3\u7b97", className: "bracket-match-node__plate bracket-match-node__plate--settled" };
  }

  return { label: status, className: "bracket-match-node__plate" };
}

function getRootClasses(
  status: string,
  variant: "winners" | "losers" | "grand" | "reset",
  isGrand: boolean,
  isHighlighted: boolean,
) {
  const classes = ["bracket-match-node"];

  if (status === "OPEN") {
    classes.push("border-l-[#c7a128]", "border-[#4c4324]");
  } else if (status === "LOCKED") {
    classes.push("border-l-[#d5101e]", "border-[#4d1b20]");
  } else if (variant === "losers") {
    classes.push("border-l-[#8d232a]", "border-[#3f1315]");
  } else if (isGrand) {
    classes.push("border-l-[#c7a128]", "border-[#7d2025]");
  } else {
    classes.push("border-l-[#3A3F49]", "border-[#2a2e36]");
  }

  if (isGrand) {
    classes.push("bracket-match-node--grand");
  }

  if (isHighlighted) {
    classes.push("bracket-match-node--highlighted");
  }

  return classes.join(" ");
}

export default function BracketMatchNode({
  match,
  variant = "winners",
  className = "",
  isHighlighted = false,
  onHoverStart,
  onHoverEnd,
}: BracketMatchNodeProps) {
  const isSettled = match.status === "SETTLED";
  const isGrand =
    match.roundName === "Grand Final" ||
    match.roundName === "Grand Final Reset" ||
    variant === "grand" ||
    variant === "reset";
  const aWins = isSettled && match.winner === "A";
  const bWins = isSettled && match.winner === "B";
  const clipPath =
    "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))";
  const statusPlate = getStatusPlate(match.status);

  const renderRow = (
    playerName: string,
    charName: string | null | undefined,
    score: number | null | undefined,
    playerType: "A" | "B",
    isWinner: boolean,
    isLoser: boolean,
  ) => (
    <div
      className={[
        "bracket-match-node__row",
        isWinner ? "bracket-match-node__row--winner" : "",
        isLoser ? "bracket-match-node__row--loser" : "",
      ].join(" ")}
    >
      <div className={`bracket-match-node__avatar ${isGrand ? "h-10 w-10" : "h-9 w-9"}`}>
        <PlayerAvatar
          playerName={playerName}
          charName={charName}
          playerType={playerType}
          showCharBadge={false}
        />
      </div>
      <span
        className={[
          "bracket-match-node__name truncate",
          isGrand ? "text-[1.8rem]" : "",
          isWinner ? "bracket-match-node__name--winner" : "",
          isLoser ? "bracket-match-node__name--loser" : "",
        ].join(" ")}
      >
        {playerName}
      </span>
      <span className={`bracket-match-node__score font-oswald ${isGrand ? "text-[1.55rem]" : "text-xl"}`}>
        {typeof score === "number" ? score : "-"}
      </span>
    </div>
  );

  return (
    <Link
      href={`/dashboard#match-${match.id}`}
      className={`${getRootClasses(match.status, variant, isGrand, isHighlighted)} ${isGrand ? "w-72" : "w-56"} ${className}`}
      style={{ clipPath }}
      onMouseEnter={() => onHoverStart?.(match.id)}
      onMouseLeave={() => onHoverEnd?.()}
      onFocus={() => onHoverStart?.(match.id)}
      onBlur={() => onHoverEnd?.()}
    >
      <span className={statusPlate.className}>{statusPlate.label}</span>

      <div className="bracket-match-node__shell">
        {renderRow(match.playerA, match.charA, match.scoreA, "A", aWins, bWins)}
        {renderRow(match.playerB, match.charB, match.scoreB, "B", bWins, aWins)}
      </div>
    </Link>
  );
}
