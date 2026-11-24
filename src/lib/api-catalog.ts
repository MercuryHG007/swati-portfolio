import { PORTFOLIO_PAGE_SIZE, SIZE_KEYS } from "@/lib/portfolio-filters";
import { absoluteUrl } from "@/lib/seo";

// Media types from RFC 9727 Appendix A and the OpenAPI registration.
export const API_CATALOG_MEDIA_TYPE = "application/linkset+json";
export const OPENAPI_MEDIA_TYPE = "application/openapi+json; version=3.0";

export const API_DOCS_PATH = "/api-docs";
export const OPENAPI_PATH = "/openapi.json";
export const API_CATALOG_PATH = "/.well-known/api-catalog";
export const SITEMAP_PATH = "/sitemap.xml";
export const LLMS_TXT_PATH = "/llms.txt";

// Links advertised on the homepage with RFC 8288 Link headers. Relative targets resolve against the request URL.
export const HOMEPAGE_LINKS = [
  { rel: "api-catalog", href: API_CATALOG_PATH, type: API_CATALOG_MEDIA_TYPE },
  { rel: "service-desc", href: OPENAPI_PATH, type: OPENAPI_MEDIA_TYPE },
  { rel: "service-doc", href: API_DOCS_PATH, type: "text/html" },
  { rel: "describedby", href: SITEMAP_PATH, type: "application/xml" },
  { rel: "describedby", href: LLMS_TXT_PATH, type: "text/plain" },
];

export function homepageLinkHeader() {
  return HOMEPAGE_LINKS.map(({ rel, href, type }) => `<${href}>; rel="${rel}"; type="${type}"`).join(", ");
}

type Parameter = {
  name: string;
  in: "query" | "path";
  required?: boolean;
  description: string;
  schema: Record<string, unknown>;
};

type Operation = {
  operationId: string;
  summary: string;
  parameters?: Parameter[];
  responses: Record<
    string,
    { description: string; content?: Record<string, { schema: Record<string, unknown> }> }
  >;
};

const FILTER_PARAMETERS: Parameter[] = [
  {
    name: "medium",
    in: "query",
    description:
      "Medium slugs, comma-separated or repeated. Values within one filter match any; filters combine with AND.",
    schema: { type: "string" },
  },
  {
    name: "subject",
    in: "query",
    description: "Subject slugs, comma-separated or repeated. Same matching as medium.",
    schema: { type: "string" },
  },
  {
    name: "size",
    in: "query",
    description: "Size buckets by longest side: small (up to 12 in), medium (13–24 in), large (over 24 in).",
    schema: { type: "string", enum: SIZE_KEYS },
  },
];

// A JSON array of plain objects, used by the list endpoints.
function listResponse(description: string, properties: Record<string, unknown>) {
  return {
    description,
    content: {
      "application/json": {
        schema: { type: "array", items: { type: "object", properties } },
      },
    },
  };
}

// A single JSON object, used by the detail endpoint.
function objectResponse(description: string, properties: Record<string, unknown>) {
  return {
    description,
    content: {
      "application/json": {
        schema: { type: "object", properties },
      },
    },
  };
}

// Paths are relative to the server URL. Each operation mirrors one route handler under src/app/api.
export const OPENAPI_PATHS: Record<string, { get: Operation }> = {
  "/portfolio/artworks": {
    get: {
      operationId: "listPortfolioArtworks",
      summary: `List published works, ${PORTFOLIO_PAGE_SIZE} per page`,
      parameters: [
        ...FILTER_PARAMETERS,
        {
          name: "page",
          in: "query",
          description: "Page number, starting at 1.",
          schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
          name: "seed",
          in: "query",
          description:
            "Order seed as YYYY-MM-DD, taken from the seed field of an earlier response. Pass it on later pages so they stay consistent. Unknown values use today's order.",
          schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        },
      ],
      responses: {
        "200": { description: "A page of published works." },
      },
    },
  },
  "/portfolio/facets": {
    get: {
      operationId: "getPortfolioFacets",
      summary: "Count published works for each medium, subject and size under the given filters",
      parameters: FILTER_PARAMETERS,
      responses: {
        "200": { description: "Option counts for mediums, subjects and sizes." },
      },
    },
  },
  "/portfolio/artworks/{slug}": {
    get: {
      operationId: "getPortfolioArtwork",
      summary: "Get one published work",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          description: "The work's slug, as returned by the artworks list.",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": objectResponse("One published work, with its medium, subjects, series and images.", {
          slug: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          medium: { type: "object", nullable: true, properties: { slug: { type: "string" }, name: { type: "string" } } },
          subjects: {
            type: "array",
            items: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" } } },
          },
          series: {
            type: "object",
            nullable: true,
            description: "Null unless the series is published.",
            properties: { slug: { type: "string" }, title: { type: "string" } },
          },
          year: { type: "integer", nullable: true },
          dimensions: { type: "string", nullable: true, example: "40 × 30 cm" },
          availability: { type: "string", nullable: true, enum: ["available", "sold"] },
          images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                publicId: { type: "string" },
                url: { type: "string", nullable: true },
                alt: { type: "string" },
                width: { type: "number" },
                height: { type: "number" },
              },
            },
          },
        }),
        "404": { description: "No published work has this slug." },
      },
    },
  },
  "/portfolio/series": {
    get: {
      operationId: "listPortfolioSeries",
      summary: "List published series",
      responses: {
        "200": listResponse("Published series, in the order shown on the site.", {
          slug: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        }),
      },
    },
  },
  "/portfolio/mediums": {
    get: {
      operationId: "listPortfolioMediums",
      summary: "List mediums with published works",
      responses: {
        "200": listResponse("Mediums that have at least one published work, sorted by name.", {
          slug: { type: "string" },
          name: { type: "string" },
        }),
      },
    },
  },
  "/portfolio/subjects": {
    get: {
      operationId: "listPortfolioSubjects",
      summary: "List subjects with published works",
      responses: {
        "200": listResponse("Subjects that have at least one published work, sorted by name.", {
          slug: { type: "string" },
          name: { type: "string" },
        }),
      },
    },
  },
};

// OpenAPI document for the public read-only API. Served at /openapi.json.
export function openApiDocument() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Swati Garg Portfolio API",
      version: "1.0.0",
      description:
        "Read-only, public JSON endpoints for the artist's published works. Unpublished works are never returned.",
    },
    servers: [{ url: absoluteUrl("/api") }],
    // Public endpoints. An empty list states that no authentication is required.
    security: [],
    paths: OPENAPI_PATHS,
  };
}

// RFC 9727 linkset with one entry for the portfolio API. The anchor is its main list resource.
export function apiCatalog() {
  return {
    linkset: [
      {
        anchor: absoluteUrl("/api/portfolio/artworks"),
        "service-desc": [{ href: absoluteUrl(OPENAPI_PATH), type: OPENAPI_MEDIA_TYPE }],
        "service-doc": [{ href: absoluteUrl(API_DOCS_PATH), type: "text/html" }],
      },
    ],
  };
}
