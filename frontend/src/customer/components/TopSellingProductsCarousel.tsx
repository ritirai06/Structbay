import { useCallback } from "react";
import type { ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TopSellingProductsCarouselProps = {
  products: any[];
  renderProduct: (product: any) => ReactNode;
};

export function TopSellingProductsCarousel({ products, renderProduct }: TopSellingProductsCarouselProps) {
  const [viewportRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (products.length === 0) return null;

  return (
    <div className="sf-top-products-carousel">
      <button
        type="button"
        className="sf-top-products-carousel__arrow sf-top-products-carousel__arrow--prev"
        onClick={scrollPrev}
        aria-label="Previous products"
      >
        <ChevronLeft aria-hidden />
      </button>

      <div className="sf-top-products-carousel__viewport" ref={viewportRef}>
        <div className="sf-top-products-carousel__container">
          {products.map((product) => (
            <div
              className="sf-top-products-carousel__slide"
              key={String(product._id || product.slug)}
            >
              {renderProduct(product)}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="sf-top-products-carousel__arrow sf-top-products-carousel__arrow--next"
        onClick={scrollNext}
        aria-label="Next products"
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}
