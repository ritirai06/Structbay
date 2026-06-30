import { useMemo } from "react";
import { Link } from "react-router";

type Brand = {
  _id?: string;
  slug: string;
  name: string;
  logo?: { url?: string };
};

type FeaturedBrandsMarqueeProps = {
  brands: Brand[];
};

/** Duplicate brands enough times so the track always fills wide viewports, then mirror for seamless loop. */
function buildMarqueeTrack(brands: Brand[]) {
  if (brands.length === 0) return [] as Array<Brand & { __key: string }>;

  const minPerHalf = 16;
  const repeatCount = Math.max(2, Math.ceil(minPerHalf / brands.length));
  const oneSet = Array.from({ length: repeatCount }, (_, copyIndex) =>
    brands.map((brand, brandIndex) => ({
      ...brand,
      __key: `${brand.slug || brand._id || brand.name}-${copyIndex}-${brandIndex}`,
    }))
  ).flat();

  return [...oneSet, ...oneSet];
}

export function FeaturedBrandsMarquee({ brands }: FeaturedBrandsMarqueeProps) {
  const track = useMemo(() => buildMarqueeTrack(brands), [brands]);

  const durationSec = useMemo(() => {
    const halfCount = track.length / 2;
    return Math.min(90, Math.max(32, halfCount * 3.2));
  }, [track.length]);

  if (track.length === 0) return null;

  return (
    <div
      className="sf-brands-marquee"
      style={{ ["--sf-brands-marquee-duration" as string]: `${durationSec}s` }}
      aria-label="Featured brand partners"
    >
      <div className="sf-brands-marquee__fade sf-brands-marquee__fade--left" aria-hidden />
      <div className="sf-brands-marquee__fade sf-brands-marquee__fade--right" aria-hidden />

      <div className="sf-brands-marquee__viewport">
        <div className="sf-brands-marquee__track">
          {track.map((brand) => (
            <Link
              key={brand.__key}
              to={`/brands/${brand.slug}`}
              className="sf-brands-marquee__card group"
            >
              {brand.logo?.url ? (
                <img
                  src={brand.logo.url}
                  alt={brand.name}
                  className="sf-brands-marquee__logo"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="sf-brands-marquee__logo-fallback" aria-hidden>
                  {(brand.name || "?")[0]}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
