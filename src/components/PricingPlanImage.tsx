"use client";

import Image from "next/image";
import { useState } from "react";

type PricingPlanImageProps = {
  src: string;
  alt: string;
};

export default function PricingPlanImage({ src, alt }: PricingPlanImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="plan-image-fallback" role="img" aria-label={alt}>
        Image unavailable
      </div>
    );
  }

  return (
    <Image
      className="plan-image"
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 720px) 90vw, (max-width: 1280px) 30vw, 22vw"
      onError={() => setHasError(true)}
    />
  );
}
