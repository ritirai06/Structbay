const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Structbay API',
      version: '1.0.0',
      description: 'Structbay Construction Marketplace — Admin CMS & Platform Control Center API',
      contact: { name: 'Structbay Team', email: 'hello@structbay.com' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Common ─────────────────────────────────────
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        // ── Banner ─────────────────────────────────────
        Banner: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            description: { type: 'string' },
            image: {
              type: 'object',
              properties: { url: { type: 'string' }, publicId: { type: 'string' } },
            },
            buttonText: { type: 'string' },
            buttonLink: { type: 'string' },
            displayOrder: { type: 'integer' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            isLive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        BannerInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: "India's Largest Construction Marketplace" },
            subtitle: { type: 'string' },
            description: { type: 'string' },
            imageUrl: { type: 'string' },
            imagePublicId: { type: 'string' },
            buttonText: { type: 'string', example: 'Shop Now' },
            buttonLink: { type: 'string', example: '/shop' },
            displayOrder: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        // ── Category ───────────────────────────────────
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            image: {
              type: 'object',
              properties: { url: { type: 'string' }, publicId: { type: 'string' } },
            },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            sortOrder: { type: 'integer' },
          },
        },
        CategoryInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Civil Construction' },
            description: { type: 'string' },
            icon: { type: 'string', example: '🏗️' },
            sortOrder: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
          },
        },
        // ── Service ────────────────────────────────────
        ServiceInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Construction' },
            description: { type: 'string' },
            icon: { type: 'string' },
            category: { type: 'string', description: 'Category ObjectId' },
            displayOrder: { type: 'integer' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            imageUrl: { type: 'string' },
          },
        },
        // ── Testimonial ────────────────────────────────
        TestimonialInput: {
          type: 'object',
          required: ['customerName', 'review'],
          properties: {
            customerName: { type: 'string', example: 'Rahul Sharma' },
            designation: { type: 'string', example: 'Project Manager' },
            company: { type: 'string', example: 'BuildCo Pvt Ltd' },
            review: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5, default: 5 },
            isFeatured: { type: 'boolean', default: false },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            imageUrl: { type: 'string' },
          },
        },
        // ── Blog ───────────────────────────────────────
        BlogInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            content: { type: 'string' },
            metaTitle: { type: 'string' },
            metaDescription: { type: 'string' },
            author: { type: 'string' },
            publishDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'], default: 'DRAFT' },
            isFeatured: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            category: { type: 'string' },
            imageUrl: { type: 'string' },
          },
        },
        // ── Announcement ───────────────────────────────
        AnnouncementInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
            isPinned: { type: 'boolean', default: false },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
            audience: { type: 'array', items: { type: 'string', enum: ['ALL', 'CUSTOMER', 'VENDOR'] } },
          },
        },
        // ── Advertisement ──────────────────────────────
        AdInput: {
          type: 'object',
          required: ['title', 'imageUrl', 'placement'],
          properties: {
            title: { type: 'string' },
            imageUrl: { type: 'string' },
            imagePublicId: { type: 'string' },
            link: { type: 'string' },
            placement: { type: 'string', enum: ['HOME_TOP', 'HOME_MID', 'HOME_BOTTOM', 'SIDEBAR', 'CATEGORY_PAGE', 'SEARCH_PAGE'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          },
        },
        // ── SEO ────────────────────────────────────────
        SEOInput: {
          type: 'object',
          required: ['page'],
          properties: {
            page: { type: 'string', example: 'home', description: 'Unique page identifier' },
            metaTitle: { type: 'string' },
            metaDescription: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            ogTitle: { type: 'string' },
            ogDescription: { type: 'string' },
            ogImage: { type: 'string' },
            canonicalUrl: { type: 'string' },
            robotsDirective: { type: 'string', enum: ['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow'] },
            schemaMarkup: { type: 'string' },
          },
        },
        // ── Homepage ───────────────────────────────────
        HomepageInput: {
          type: 'object',
          properties: {
            heroTitle: { type: 'string', example: "India's Largest Construction Marketplace" },
            heroSubtitle: { type: 'string' },
            heroCtaText: { type: 'string' },
            featuredCategories: { type: 'array', items: { type: 'string' } },
          },
        },
        // ── Contact ────────────────────────────────────
        ContactInput: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            email: { type: 'string' },
            supportEmail: { type: 'string' },
            address: { type: 'string' },
            whatsapp: { type: 'string' },
            mapLink: { type: 'string' },
            workingHours: { type: 'string', example: 'Mon-Sat, 9AM-6PM' },
          },
        },
        // ── AuditLog ───────────────────────────────────
        AuditLog: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            adminId: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } },
            action: { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PUBLISH', 'TOGGLE'] },
            module: { type: 'string' },
            targetId: { type: 'string' },
            description: { type: 'string' },
            ipAddress: { type: 'string' },
            oldData: { type: 'object' },
            newData: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Dashboard', description: 'Admin dashboard stats' },
      { name: 'Homepage CMS', description: 'Manage homepage hero & layout' },
      { name: 'Banners', description: 'Hero banner management' },
      { name: 'Categories', description: 'Product/service category management' },
      { name: 'Services', description: 'Service management' },
      { name: 'Testimonials', description: 'Customer testimonial management' },
      { name: 'Blogs', description: 'Blog post management' },
      { name: 'Announcements', description: 'Platform announcements' },
      { name: 'Advertisements', description: 'Ad management with tracking' },
      { name: 'SEO', description: 'Per-page SEO settings' },
      { name: 'Contact', description: 'Contact info management' },
      { name: 'Footer', description: 'Footer content management' },
      { name: 'Audit Logs', description: 'Admin action history' },
      { name: 'Newsletter', description: 'Newsletter subscribers' },
    ],
    paths: {
      // ─── DASHBOARD ───────────────────────────────────────────
      '/admin/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get admin dashboard stats',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Dashboard data',
              content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiSuccess' } } },
            },
          },
        },
      },
      // ─── HOMEPAGE ─────────────────────────────────────────────
      '/cms/homepage': {
        get: {
          tags: ['Homepage CMS'],
          summary: 'Get homepage CMS (public)',
          responses: { 200: { description: 'Homepage data' } },
        },
        put: {
          tags: ['Homepage CMS'],
          summary: 'Update homepage CMS (admin)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/HomepageInput' } } },
          },
          responses: { 200: { description: 'Homepage updated' } },
        },
      },
      // ─── BANNERS ──────────────────────────────────────────────
      '/cms/banners': {
        get: {
          tags: ['Banners'],
          summary: 'List banners (public)',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Banners list' } },
        },
        post: {
          tags: ['Banners'],
          summary: 'Create banner (admin)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/BannerInput' } } },
          },
          responses: { 201: { description: 'Banner created' } },
        },
      },
      '/cms/banners/{id}': {
        patch: {
          tags: ['Banners'],
          summary: 'Update banner (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/BannerInput' } } },
          },
          responses: { 200: { description: 'Banner updated' } },
        },
        delete: {
          tags: ['Banners'],
          summary: 'Delete banner (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Banner deleted' } },
        },
      },
      '/cms/banners/{id}/toggle': {
        patch: {
          tags: ['Banners'],
          summary: 'Toggle banner status (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Banner status toggled' } },
        },
      },
      // ─── CATEGORIES ───────────────────────────────────────────
      '/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List categories (public)',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'sortOrder' } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: { 200: { description: 'Categories list' } },
        },
        post: {
          tags: ['Categories'],
          summary: 'Create category (admin)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/CategoryInput' } } },
          },
          responses: { 201: { description: 'Category created' } },
        },
      },
      '/categories/{slug}': {
        get: {
          tags: ['Categories'],
          summary: 'Get category by slug (public)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Category data' } },
        },
      },
      '/categories/{id}': {
        patch: {
          tags: ['Categories'],
          summary: 'Update category (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/CategoryInput' } } },
          },
          responses: { 200: { description: 'Category updated' } },
        },
        delete: {
          tags: ['Categories'],
          summary: 'Delete category (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Category deleted' } },
        },
      },
      '/categories/{id}/toggle': {
        patch: {
          tags: ['Categories'],
          summary: 'Toggle category status (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Category status toggled' } },
        },
      },
      '/categories/{id}/image': {
        patch: {
          tags: ['Categories'],
          summary: 'Update category image (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['imageUrl'],
                  properties: {
                    imageUrl: { type: 'string' },
                    imagePublicId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Image updated' } },
        },
      },
      // ─── SERVICES ─────────────────────────────────────────────
      '/cms/services': {
        get: { tags: ['Services'], summary: 'List services (public)', responses: { 200: { description: 'Services list' } } },
        post: {
          tags: ['Services'], summary: 'Create service (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ServiceInput' } } } },
          responses: { 201: { description: 'Service created' } },
        },
      },
      '/cms/services/{id}': {
        patch: { tags: ['Services'], summary: 'Update service (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Service updated' } } },
        delete: { tags: ['Services'], summary: 'Delete service (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Service deleted' } } },
      },
      // ─── TESTIMONIALS ─────────────────────────────────────────
      '/cms/testimonials': {
        get: { tags: ['Testimonials'], summary: 'List testimonials (public)', responses: { 200: { description: 'Testimonials list' } } },
        post: {
          tags: ['Testimonials'], summary: 'Create testimonial (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/TestimonialInput' } } } },
          responses: { 201: { description: 'Testimonial created' } },
        },
      },
      '/cms/testimonials/{id}': {
        patch: { tags: ['Testimonials'], summary: 'Update testimonial (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Testimonial updated' } } },
        delete: { tags: ['Testimonials'], summary: 'Delete testimonial (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Testimonial deleted' } } },
      },
      // ─── BLOGS ────────────────────────────────────────────────
      '/cms/blogs': {
        get: {
          tags: ['Blogs'], summary: 'List blogs',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'] } },
            { name: 'featured', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'tag', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Blog list' } },
        },
        post: {
          tags: ['Blogs'], summary: 'Create blog (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/BlogInput' } } } },
          responses: { 201: { description: 'Blog created' } },
        },
      },
      '/cms/blogs/{slug}': {
        get: { tags: ['Blogs'], summary: 'Get blog by slug (public)', parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Blog detail' } } },
      },
      '/cms/blogs/{id}': {
        patch: { tags: ['Blogs'], summary: 'Update blog (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Blog updated' } } },
        delete: { tags: ['Blogs'], summary: 'Delete blog (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Blog deleted' } } },
      },
      // ─── ANNOUNCEMENTS ────────────────────────────────────────
      '/cms/announcements': {
        get: {
          tags: ['Announcements'], summary: 'List announcements',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'audience', in: 'query', schema: { type: 'string', enum: ['ALL', 'CUSTOMER', 'VENDOR'] } },
            { name: 'liveOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          ],
          responses: { 200: { description: 'Announcements list' } },
        },
        post: {
          tags: ['Announcements'], summary: 'Create announcement (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/AnnouncementInput' } } } },
          responses: { 201: { description: 'Announcement created' } },
        },
      },
      '/cms/announcements/{id}': {
        patch: { tags: ['Announcements'], summary: 'Update announcement (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Announcements'], summary: 'Delete announcement (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      // ─── ADVERTISEMENTS ───────────────────────────────────────
      '/cms/ads': {
        get: {
          tags: ['Advertisements'], summary: 'List ads',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'placement', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Ads list' } },
        },
        post: {
          tags: ['Advertisements'], summary: 'Create ad (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/AdInput' } } } },
          responses: { 201: { description: 'Ad created' } },
        },
      },
      '/cms/ads/{id}': {
        patch: { tags: ['Advertisements'], summary: 'Update ad (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Advertisements'], summary: 'Delete ad (admin)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
      },
      '/cms/ads/{id}/impression': {
        post: { tags: ['Advertisements'], summary: 'Track ad impression (public)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Recorded' } } },
      },
      '/cms/ads/{id}/click': {
        post: { tags: ['Advertisements'], summary: 'Track ad click (public)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Click recorded, returns link' } } },
      },
      // ─── SEO ──────────────────────────────────────────────────
      '/cms/seo': {
        get: {
          tags: ['SEO'], summary: 'Get SEO settings (public)',
          parameters: [{ name: 'page', in: 'query', schema: { type: 'string' }, description: 'Filter by page identifier' }],
          responses: { 200: { description: 'SEO data' } },
        },
        post: {
          tags: ['SEO'], summary: 'Upsert SEO settings (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/SEOInput' } } } },
          responses: { 200: { description: 'SEO saved' } },
        },
      },
      // ─── CONTACT ──────────────────────────────────────────────
      '/cms/contact': {
        get: { tags: ['Contact'], summary: 'Get contact info (public)', responses: { 200: { description: 'Contact data' } } },
        put: {
          tags: ['Contact'], summary: 'Update contact info (admin)', security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ContactInput' } } } },
          responses: { 200: { description: 'Contact updated' } },
        },
      },
      // ─── FOOTER ───────────────────────────────────────────────
      '/cms/footer': {
        get: { tags: ['Footer'], summary: 'Get footer (public)', responses: { 200: { description: 'Footer data' } } },
        patch: {
          tags: ['Footer'], summary: 'Update footer (admin)', security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    companyDescription: { type: 'string' },
                    address: { type: 'string' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    newsletterText: { type: 'string' },
                    copyrightText: { type: 'string' },
                    socialLinks: {
                      type: 'object',
                      properties: {
                        facebook: { type: 'string' },
                        twitter: { type: 'string' },
                        instagram: { type: 'string' },
                        linkedin: { type: 'string' },
                        youtube: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Footer updated' } },
        },
      },
      // ─── AUDIT LOGS ───────────────────────────────────────────
      '/admin/audit-logs': {
        get: {
          tags: ['Audit Logs'],
          summary: 'Get audit logs (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'module', in: 'query', schema: { type: 'string' } },
            { name: 'action', in: 'query', schema: { type: 'string' } },
            { name: 'adminId', in: 'query', schema: { type: 'string' } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Audit logs' } },
        },
      },
      // ─── NEWSLETTER ───────────────────────────────────────────
      '/cms/newsletter/subscribe': {
        post: {
          tags: ['Newsletter'],
          summary: 'Subscribe to newsletter (public)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
              },
            },
          },
          responses: { 201: { description: 'Subscribed' } },
        },
      },
      '/cms/newsletter/subscribers': {
        get: {
          tags: ['Newsletter'],
          summary: 'Get subscribers (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Subscribers list' } },
        },
      },
    },
  },
  apis: [], // Using inline paths above, no file scanning needed
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
