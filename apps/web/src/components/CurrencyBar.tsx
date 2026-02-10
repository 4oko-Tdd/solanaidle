import { useRef, useEffect, useState } from "react";
import type { Inventory } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/19.png";
import crystalIcon from "@/assets/icons/22.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  inventory: Inventory;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === value) return;

    setFlash(true);
    const diff = value - prev;
    const steps = Math.min(Math.abs(diff), 20);
    const stepTime = 400 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setDisplay(Math.round(prev + (diff * step) / steps));
      if (step >= steps) {
        clearInterval(interval);
        setDisplay(value);
        setTimeout(() => setFlash(false), 200);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <span
      className={`text-sm font-mono font-bold transition-transform duration-200 ${
        flash ? "text-white scale-110" : "text-neon-green"
      }`}
    >
      {display}
    </span>
  );
}

export function CurrencyBar({ inventory }: Props) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-1.5">
        <img src={scrapIcon} alt="Scrap" className="h-6 w-6" />
        <AnimatedNumber value={inventory.scrap} />
      </div>
      <div className="flex items-center gap-1.5">
        <img src={crystalIcon} alt="Crystal" className="h-6 w-6" />
        <AnimatedNumber value={inventory.crystal} />
      </div>
      <div className="flex items-center gap-1.5">
        <img src={artifactIcon} alt="Artifact" className="h-6 w-6" />
        <AnimatedNumber value={inventory.artifact} />
      </div>
    </div>
  );
}
