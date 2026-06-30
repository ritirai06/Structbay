import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";

type Category = {
  slug?: string;
  name?: string;
  [key: string]: any;
};

interface ShopMegaMenuProps {
  categories: Category[];
  onNavigate?: () => void;
  onCategoryClick?: (cat: Category) => void;
  isMobile?: boolean;
}

export function ShopMegaMenu({ categories, onNavigate, onCategoryClick, isMobile }: ShopMegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Desktop Hover Handlers
  const handleMouseEnter = () => {
    if (isMobile) return;
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  if (isMobile) {
    // Mobile Accordion View
    return (
      <div className="w-full">
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full py-3 text-lg font-medium border-b border-white/10 text-white"
        >
          Shop
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        
        {isOpen && (
          <div className="pl-4 py-2 flex flex-col gap-3">
            <Link 
              to="/shop" 
              onClick={handleLinkClick}
              className="text-sb-orange font-semibold py-1 uppercase tracking-wider text-sm"
            >
              All Categories
            </Link>
            {categories.map(cat => (
              <Link 
                key={cat.slug} 
                to={`/category/${cat.slug}`}
                onClick={() => {
                  onCategoryClick?.(cat);
                  handleLinkClick();
                }}
                className="text-white/80 py-1 hover:text-white uppercase text-sm font-semibold tracking-wider"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop Dropdown (2-column black style)
  return (
    <div 
      className="relative group h-full flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={menuRef}
    >
      <button 
        type="button" 
        className="sf-nav-shop flex items-center gap-1.5 focus:outline-none"
        aria-expanded={isOpen}
      >
        Shop 
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Container */}
      <div 
        className={`absolute left-0 top-[calc(100%+0px)] pt-5 z-[100] transition-all duration-300 origin-top
          ${isOpen ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-4 scale-95 pointer-events-none'}
        `}
      >
        <div className="bg-black w-[600px] border-t-[3px] border-sb-orange shadow-2xl p-8">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <button
              onClick={() => {
                navigate(`/shop`);
                handleLinkClick();
              }}
              className="text-left text-white hover:text-sb-orange transition-colors uppercase font-bold text-sm tracking-widest col-span-2 mb-2 pb-2 border-b border-white/10"
            >
              ALL CATEGORIES
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => {
                  navigate(`/category/${cat.slug}`);
                  onCategoryClick?.(cat);
                  handleLinkClick();
                }}
                className="text-left text-white hover:text-sb-orange transition-colors uppercase font-bold text-[13px] tracking-widest"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
