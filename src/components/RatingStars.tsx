type Props = {
  score: number;
  size?: "sm" | "md";
};

export default function RatingStars({ score, size = "sm" }: Props) {
  const textSize = size === "sm" ? "text-sm" : "text-xl";
  const rounded = Math.round(score);

  return (
    <span className={`${textSize} leading-none text-amber-500`} aria-label={`${score} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (i < rounded ? "★" : "☆")).join("")}
    </span>
  );
}
