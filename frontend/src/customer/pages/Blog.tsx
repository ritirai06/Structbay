import { useState } from "react";
import { Link } from "react-router";
import { Search, ChevronRight, Calendar, User, Tag } from "lucide-react";

const CATEGORIES = ["All", "Buying Guide", "Industry Insights", "Legal & Finance", "Construction Tips"];

const BLOGS = [
  { id: "1", title: "Top 5 Cement Brands for High-Rise Construction in 2025", category: "Buying Guide", date: "Dec 12, 2025", author: "Arjun Mehta", readTime: "5 min", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&h=400&fit=crop", featured: true, excerpt: "Choosing the right cement is critical for high-rise structures. We compare Ultratech, ACC, Ambuja, JK and Ramco across strength, availability and pricing in South India." },
  { id: "2", title: "How to Calculate Steel Requirements for Your Project", category: "Construction Tips", date: "Dec 5, 2025", author: "Priya Sharma", readTime: "7 min", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop", featured: true, excerpt: "A step-by-step guide to estimating TMT bar requirements for RCC slabs, columns, and beams. Includes ready-reckoner tables for common structural elements." },
  { id: "3", title: "GST on Construction Materials: A Complete Guide 2025", category: "Legal & Finance", date: "Nov 28, 2025", author: "CA Venkat Rao", readTime: "10 min", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop", featured: false, excerpt: "Everything builders and contractors need to know about GST rates on cement, steel, paints, and other construction materials. Updated for FY 2025-26." },
  { id: "4", title: "Asian Paints vs Berger: Which is Better for Exterior Walls?", category: "Buying Guide", date: "Nov 20, 2025", author: "Rohan Desai", readTime: "6 min", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop", featured: false, excerpt: "We tested both brands across durability, coverage, and pricing. Here's our verdict on which paint offers better value for South Indian climates." },
  { id: "5", title: "Understanding BIS Certification for Construction Materials", category: "Industry Insights", date: "Nov 15, 2025", author: "Arjun Mehta", readTime: "8 min", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop", featured: false, excerpt: "Why BIS certification matters, how to verify it, and what happens if you use non-certified materials on your construction site." },
  { id: "6", title: "Bulk Procurement Strategies for Large Construction Projects", category: "Industry Insights", date: "Nov 8, 2025", author: "Priya Sharma", readTime: "9 min", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&h=400&fit=crop", featured: false, excerpt: "How procurement teams at large construction firms negotiate better prices, manage supplier relationships, and ensure timely delivery." },
];

export function BlogListing() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  const filtered = BLOGS.filter(b =>
    (selectedCat === "All" || b.category === selectedCat) &&
    (b.title.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase()))
  );

  const featured = filtered.filter(b => b.featured);
  const rest = filtered.filter(b => !b.featured);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Blog</span>
      </nav>

      <div className="text-center mb-8">
        <h1 className="text-foreground mb-2">Construction Guides & Insights</h1>
        <p className="text-muted-foreground">Expert knowledge to help you make smarter procurement decisions</p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg mx-auto mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="w-full pl-10 pr-4 py-2.5 border border-border rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap justify-center mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            style={selectedCat === cat ? { backgroundColor: "var(--sb-blue)" } : undefined}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCat === cat ? "text-white" : "bg-white border border-border text-foreground hover:border-primary"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="text-foreground mb-4">Featured Articles</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {featured.map(blog => (
              <Link key={blog.id} to={`/blog/${blog.id}`} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group">
                <div className="aspect-video overflow-hidden">
                  <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: "var(--sb-orange)" }} className="text-xs font-semibold uppercase">{blog.category}</span>
                    <span className="text-muted-foreground text-xs">· {blog.readTime} read</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 leading-snug">{blog.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">{blog.excerpt}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{blog.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{blog.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Latest */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-foreground mb-4">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map(blog => (
              <Link key={blog.id} to={`/blog/${blog.id}`} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all group">
                <div className="aspect-video overflow-hidden">
                  <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-4">
                  <span style={{ color: "var(--sb-orange)" }} className="text-xs font-semibold uppercase">{blog.category}</span>
                  <h3 className="text-sm font-semibold text-foreground mt-1 mb-2 line-clamp-2 leading-snug">{blog.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{blog.author}</span>
                    <span>{blog.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BlogDetails() {
  const blog = BLOGS[0];
  const related = BLOGS.slice(1, 4);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/blog" className="hover:text-foreground">Blog</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground line-clamp-1">{blog.title}</span>
      </nav>

      <div className="mb-3">
        <span style={{ color: "var(--sb-orange)" }} className="text-sm font-semibold uppercase">{blog.category}</span>
      </div>
      <h1 className="text-foreground mb-4">{blog.title}</h1>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{blog.author}</span>
        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{blog.date}</span>
        <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" />{blog.readTime} read</span>
      </div>

      <div className="aspect-video rounded-2xl overflow-hidden mb-8">
        <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
      </div>

      <div className="prose prose-sm max-w-none text-foreground space-y-4">
        <p className="text-muted-foreground leading-relaxed">{blog.excerpt}</p>
        <h2>Introduction</h2>
        <p className="text-muted-foreground leading-relaxed">When it comes to high-rise construction in India's southern cities — Bengaluru, Hyderabad, and Chennai — the choice of cement is paramount. Each city has different humidity levels, soil conditions, and construction standards that influence which cement brand performs best.</p>
        <h2>Key Factors to Consider</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Compressive strength at 3, 7, and 28 days</li>
          <li>Consistency and fineness of the cement</li>
          <li>Setting time — initial and final</li>
          <li>Availability and supply chain reliability</li>
          <li>Price per bag and bulk discount structures</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">Based on our analysis of over 500 construction projects across South India, here are our top recommendations for high-rise applications...</p>
      </div>

      {/* Related articles */}
      <div className="mt-12">
        <h2 className="text-foreground mb-4">Related Articles</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {related.map(b => (
            <Link key={b.id} to={`/blog/${b.id}`} className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-all group">
              <div className="aspect-video overflow-hidden">
                <img src={b.image} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="p-3">
                <span style={{ color: "var(--sb-orange)" }} className="text-xs font-semibold uppercase">{b.category}</span>
                <p className="text-sm font-medium text-foreground mt-1 line-clamp-2">{b.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
