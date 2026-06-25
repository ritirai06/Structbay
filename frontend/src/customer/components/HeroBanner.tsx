import React from "react";

interface HeroBannerProps {
  imageUrl: string;
  title: string;
  heightDesktop?: number; // px
  heightMobile?: number; // px
  overlayOpacity?: number; // 0–1
}

export function HeroBanner({
  imageUrl,
  title,
  heightDesktop = 450,
  heightMobile = 300,
  overlayOpacity = 0.45,
}: HeroBannerProps) {
  return (
    <section
      className="relative w-full flex items-center justify-center overflow-hidden"
      style={{
        height: `${heightDesktop}px`,
      }}
    >
      {/* Responsive height for mobile */}
      <style>
        {`
          @media (max-width: 768px) {
            .hero-banner-section {
              height: ${heightMobile}px !important;
            }
          }
        `}
      </style>
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          zIndex: 1,
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover object-center"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            userSelect: "none",
            pointerEvents: "none",
            imageRendering: "auto",
          }}
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `rgba(0,0,0,${overlayOpacity})`,
            zIndex: 2,
          }}
        />
      </div>
      <div
        className="relative z-10 flex items-center justify-center w-full h-full"
        style={{
          minHeight: 0,
        }}
      >
        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight uppercase text-center drop-shadow-lg">
          {title}
        </h1>
      </div>
    </section>
  );
}