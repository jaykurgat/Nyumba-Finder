"use client";

import NextImage from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PropertyImageProps {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  minHeightClassName?: string;
  maxHeightClassName?: string;
}

export function PropertyImage({
  src,
  alt,
  sizes = "100vw",
  priority = false,
  className,
  imageClassName,
  minHeightClassName = "min-h-[180px]",
  maxHeightClassName = "max-h-[320px]",
}: PropertyImageProps) {
  const [aspectRatio, setAspectRatio] = useState("4 / 3");

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        minHeightClassName,
        maxHeightClassName,
        className
      )}
      style={{ aspectRatio }}
    >
      <NextImage
        src={src}
        alt={alt}
        fill
        className={cn("object-contain", imageClassName)}
        sizes={sizes}
        priority={priority}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setAspectRatio(String(image.naturalWidth) + " / " + String(image.naturalHeight));
          }
        }}
      />
    </div>
  );
}
