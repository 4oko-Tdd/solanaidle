import { useRef, useEffect, useState } from "react";
import type { Inventory } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/19.png";
import crystalIcon from "@/assets/icons/22.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  inventory: Inventory;
}

function AnimatedNumber({ value, onFlash }: { value: number; onFlash?: (flashing: boolean) => void }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === value) return;

    setFlash(true);
    onFlash?.(true);
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
        setTimeout(() => {
          setFlash(false);
          onFlash?.(false);
        }, 200);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [value, onFlash]);

  return (
    <span
      className={`text-base font-mono font-bold transition-transform duration-200 ${
        flash ? "text-white scale-110" : "text-neon-green"
      }`}
    >
      {display}
    </span>
  );
}

function CurrencyItem({ icon, alt, value }: { icon: string; alt: string; value: number }) {
  const [bouncing, setBouncing] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <img
        src={icon}
        alt={alt}
        className={`h-9 w-9 transition-transform ${bouncing ? "animate-icon-bounce" : ""}`}
      />
      <AnimatedNumber value={value} onFlash={setBouncing} />
    </div>
  );
}

export function CurrencyBar({ inventory }: Props) {
  return (
    <div className="flex items-center gap-6">
      <CurrencyItem icon={scrapIcon} alt="Lamports" value={inventory.scrap} />
      <CurrencyItem icon={crystalIcon} alt="Tokens" value={inventory.crystal} />
      <CurrencyItem icon={artifactIcon} alt="Keys" value={inventory.artifact} />
    </div>
  );
}
