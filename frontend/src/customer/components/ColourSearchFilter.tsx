import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface ColourOption {
  name: string;
  code: string | null;
  count?: number;
}

interface ColourSearchFilterProps {
  productId: string;
  onColourSelect: (colourName: string) => void;
  selectedColour?: string;
  apiUrl?: string;
}

export function ColourSearchFilter({
  productId,
  onColourSelect,
  selectedColour,
  apiUrl = '/api/v1',
}: ColourSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ColourOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [allColours, setAllColours] = useState<ColourOption[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Load all colours on mount
  useEffect(() => {
    const loadColours = async () => {
      try {
        const res = await fetch(`${apiUrl}/products/${productId}/colours`);
        if (res.ok) {
          const data = await res.json();
          setAllColours(data.data?.colours || []);
        }
      } catch (err) {
        console.error('Failed to load colours:', err);
      }
    };

    if (productId) {
      loadColours();
    }
  }, [productId, apiUrl]);

  // Search colours with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiUrl}/products/${productId}/colours/search?q=${encodeURIComponent(searchQuery)}&limit=20`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.data?.colours || []);
        }
      } catch (err) {
        console.error('Failed to search colours:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, productId, apiUrl]);

  const displayResults = searchQuery.trim() ? results : allColours.slice(0, 10);

  const handleSelectColour = (colourName: string) => {
    onColourSelect(colourName);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    onColourSelect('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search colour by name or code (e.g., Royal Blue, 8476)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange text-sm"
        />
        {(searchQuery || selectedColour) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-gray-500">
              Searching colours...
            </div>
          ) : displayResults.length > 0 ? (
            <ul className="divide-y">
              {displayResults.map((colour) => (
                <li key={`${colour.name}-${colour.code}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectColour(colour.name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                  >
                    {colour.code && (
                      <span
                        className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: colour.code }}
                        title={colour.code}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {colour.name}
                      </div>
                      {colour.code && (
                        <div className="text-xs text-gray-500">{colour.code}</div>
                      )}
                    </div>
                    {colour.count && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {colour.count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim() ? (
            <div className="p-3 text-center text-sm text-gray-500">
              No colours found matching "{searchQuery}"
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-gray-500">
              Start typing to search colours
            </div>
          )}
        </div>
      )}

      {selectedColour && (
        <div className="mt-2 inline-flex items-center gap-2 bg-sb-orange/10 text-sb-orange px-3 py-1 rounded-full text-sm">
          <span>{selectedColour}</span>
          <button
            type="button"
            onClick={() => handleClear()}
            className="hover:text-sb-orange/70"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
