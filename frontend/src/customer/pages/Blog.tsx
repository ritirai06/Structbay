import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Search, ChevronRight, Calendar, User, Tag } from "lucide-react";
import { useCmsPageSeo } from "../hooks/useCmsPageSeo";

// ── Blog Listing ─────────────────────────────────────────────────────────────
export function BlogListing() {
  useCmsPageSeo("blog");
  const [blogs, setBlogs]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [tags, setTags]               = useState<string[]>([]);

  useEffect(() => {
    const params: Record<string, string> = { status: "PUBLISHED", limit: "20" };
    if (selectedTag) params.tag = selectedTag;
    if (search.length >= 2) params.search = search;

    fetch("/api/v1/cms/blogs?" + new URLSearchParams(params).toString())
      .then(r => r.json())
      .then(d => {
        const list = d.data || [];
        setBlogs(list);
        // Collect unique tags
        const allTags = list.flatMap((b: any) => b.tags || []);
        setTags([...new Set(allTags)] as string[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, selectedTag]);

  const featured = blogs.filter(b => b.isFeatured);
  const rest     = blogs.filter(b => !b.isFeatured);

  return (
    <div className="min-h-screen">
      <div className="sb-card mx-4 mt-6 max-w-7xl lg:mx-auto border-0 bg-sb-surface/80">
        <div className="px-4 py-10 sm:px-8">
          <nav className="flex items-center gap-2 text-sm text-sb-text-secondary mb-4">
            <Link to="/" className="hover:text-sb-orange transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-sb-ink font-semibold">Blog</span>
          </nav>
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-sb-ink font-bold text-3xl sm:text-4xl mb-3">Construction Guides & Insights</h1>
            <p className="text-sb-text-secondary">Expert knowledge to help you make smarter procurement decisions</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative max-w-lg mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink-muted/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2.5 bg-sb-surface border border-sb-ink/12 rounded-2xl text-sm text-sb-ink placeholder:text-sb-ink-muted/40 focus:outline-none focus:border-[#E85A00] transition-colors"
          />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            <button
              onClick={() => setSelectedTag("")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!selectedTag ? "bg-[#E85A00] text-sb-on-orange" : "bg-sb-surface border border-sb-ink/10 text-sb-ink-muted hover:border-[#E85A00]/50"}`}
            >
              All
            </button>
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedTag === tag ? "bg-[#E85A00] text-sb-on-orange" : "bg-sb-surface border border-sb-ink/10 text-sb-ink-muted hover:border-[#E85A00]/50"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-sb-surface border border-sb-ink/10 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 text-sb-ink-muted/50">
            <p>No articles found.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sb-ink font-bold text-xl mb-5">Featured Articles</h2>
                <div className="grid md:grid-cols-2 gap-5">
                  {featured.map(blog => <BlogCard key={blog._id} blog={blog} large />)}
                </div>
              </div>
            )}

            {/* Latest */}
            {rest.length > 0 && (
              <div>
                <h2 className="text-sb-ink font-bold text-xl mb-5">Latest Articles</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map(blog => <BlogCard key={blog._id} blog={blog} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BlogCard({ blog, large = false }: { blog: any; large?: boolean }) {
  const date = blog.publishDate
    ? new Date(blog.publishDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="bg-sb-surface border border-sb-ink/10 rounded-2xl overflow-hidden hover:border-[#E85A00]/40 hover:shadow-[0_4px_24px_rgba(232, 90, 0,0.1)] transition-all group"
    >
      <div className={`overflow-hidden ${large ? "aspect-video" : "aspect-video"}`}>
        {blog.featuredImage?.url
          ? <img src={blog.featuredImage.url} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full bg-sb-surface-2" />
        }
      </div>
      <div className="p-4">
        {blog.category && <span className="text-xs font-bold uppercase tracking-wide text-[#E85A00]">{blog.category}</span>}
        <h3 className={`font-semibold text-sb-ink mt-1.5 mb-2 leading-snug ${large ? "text-base" : "text-sm"} line-clamp-2`}>{blog.title}</h3>
        {large && blog.description && <p className="text-sb-ink-muted/60 text-sm line-clamp-2 mb-3">{blog.description}</p>}
        <div className="flex items-center gap-3 text-xs text-sb-ink-muted/50">
          {blog.author && <span className="flex items-center gap-1"><User className="w-3 h-3" />{blog.author}</span>}
          {date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>}
        </div>
      </div>
    </Link>
  );
}

// ── Blog Details ─────────────────────────────────────────────────────────────
export function BlogDetails() {
  const { slug: slugParam, id: legacyId } = useParams<{ slug?: string; id?: string }>();
  const slug = slugParam || legacyId;
  const navigate = useNavigate();
  const [blog, setBlog]     = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/cms/blogs/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.success === false || !d.data) {
          navigate("/blogs", { replace: true });
          return null;
        }
        setBlog(d.data);
        const title = (d.data.metaTitle || d.data.title || "").trim();
        if (title) document.title = title;
        let desc = document.querySelector('meta[name="description"]');
        if (!desc) {
          desc = document.createElement("meta");
          desc.setAttribute("name", "description");
          document.head.appendChild(desc);
        }
        const md = (d.data.metaDescription || d.data.description || "").trim();
        if (md) desc.setAttribute("content", md);
        return fetch("/api/v1/cms/blogs?status=PUBLISHED&limit=8").then((r2) => r2.json());
      })
      .then((d) => {
        if (d?.data) setRelated(d.data.filter((b: any) => b.slug !== slug).slice(0, 3));
      })
      .catch(() => navigate("/blogs", { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-sb-page flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E85A00", borderTopColor: "transparent" }} />
    </div>
  );

  if (!blog) return null;

  const date = blog.publishDate
    ? new Date(blog.publishDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div className="bg-sb-page min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-sb-ink-muted/50 mb-6">
          <Link to="/" className="hover:text-[#E85A00]">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/blogs" className="hover:text-[#E85A00]">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-sb-ink line-clamp-1">{blog.title}</span>
        </nav>

        {blog.category && <span className="text-sm font-bold uppercase text-[#E85A00]">{blog.category}</span>}
        <h1 className="text-sb-ink font-black text-3xl mt-2 mb-4 leading-tight">{blog.title}</h1>

        <div className="flex items-center gap-4 text-sm text-sb-ink-muted/50 mb-6">
          {blog.author && <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{blog.author}</span>}
          {date && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{date}</span>}
          {(blog.tags || []).map((t: string) => (
            <span key={t} className="flex items-center gap-1"><Tag className="w-3 h-3" />{t}</span>
          ))}
        </div>

        {blog.featuredImage?.url && (
          <div className="aspect-video rounded-2xl overflow-hidden mb-8">
            <img src={blog.featuredImage.url} alt={blog.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div
          className="prose prose-sm max-w-none text-sb-ink-muted/80 space-y-4"
          style={{ lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: blog.content || blog.description || "" }}
        />

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sb-ink font-bold text-xl mb-4">Related Articles</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((b: any) => (
                <Link key={b._id} to={`/blogs/${b.slug}`} className="bg-sb-surface rounded-xl border border-sb-ink/10 overflow-hidden hover:border-[#E85A00]/40 transition-all group">
                  <div className="aspect-video overflow-hidden">
                    {b.featuredImage?.url
                      ? <img src={b.featuredImage.url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <div className="w-full h-full bg-sb-surface-2" />
                    }
                  </div>
                  <div className="p-3">
                    {b.category && <span className="text-xs font-bold uppercase text-[#E85A00]">{b.category}</span>}
                    <p className="text-sm font-medium text-sb-ink mt-1 line-clamp-2">{b.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
