import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_LINKS, OPENAPI_PATHS, apiCatalog, homepageLinkHeader } from "@/lib/api-catalog";

const APP_DIR = fileURLToPath(new URL("../app", import.meta.url));
const API_DIR = path.join(APP_DIR, "api");
const PUBLIC_API_ROOT = "portfolio";

// Source file that serves each homepage link target.
const LINK_TARGET_FILES: Record<string, string> = {
  "/.well-known/api-catalog": ".well-known/api-catalog/route.ts",
  "/openapi.json": "openapi.json/route.ts",
  "/api-docs": "(site)/api-docs/page.tsx",
  "/sitemap.xml": "sitemap.ts",
};

// Lists every GET route under the public API folder, as spec paths. Dynamic segments become {name}.
async function publicRoutePaths(): Promise<string[]> {
  const root = path.join(API_DIR, PUBLIC_API_ROOT);
  const files = await readdir(root, { recursive: true });
  const routes: string[] = [];
  for (const file of files) {
    if (path.basename(file) !== "route.ts") continue;
    const source = await readFile(path.join(root, file), "utf8");
    if (!/export\s+(async\s+)?function\s+GET\b/.test(source)) continue;
    const segments = [PUBLIC_API_ROOT, ...path.dirname(file).split(path.sep).filter((s) => s && s !== ".")];
    routes.push(`/${segments.map((s) => s.replace(/^\[(\w+)\]$/, "{$1}")).join("/")}`);
  }
  return routes.sort();
}

describe("API catalog and OpenAPI spec", () => {
  it("documents every public GET route, and nothing else", async () => {
    expect(Object.keys(OPENAPI_PATHS).sort()).toEqual(await publicRoutePaths());
  });

  it("declares each {name} in a path as a required path parameter", () => {
    for (const [route, { get }] of Object.entries(OPENAPI_PATHS)) {
      for (const [, name] of route.matchAll(/\{(\w+)\}/g)) {
        const declared = get.parameters?.some((parameter) => parameter.in === "path" && parameter.name === name);
        expect(declared, `${route} is missing path parameter "${name}"`).toBe(true);
      }
    }
  });

  it("anchors the API catalog on a documented route", () => {
    const { anchor } = apiCatalog().linkset[0];
    const specPath = new URL(anchor).pathname.replace(/^\/api/, "");
    expect(Object.keys(OPENAPI_PATHS)).toContain(specPath);
  });

  it("advertises registered relation types on the homepage", () => {
    const rels = HOMEPAGE_LINKS.map((link) => link.rel).sort();
    expect(rels).toEqual(["api-catalog", "describedby", "service-desc", "service-doc"]);
    expect(homepageLinkHeader()).toContain('</.well-known/api-catalog>; rel="api-catalog"');
  });

  it("points every homepage link at a file that serves it", async () => {
    for (const link of HOMEPAGE_LINKS) {
      const file = LINK_TARGET_FILES[link.href];
      expect(file, `no source file mapped for ${link.href}`).toBeDefined();
      await expect(access(path.join(APP_DIR, file))).resolves.toBeUndefined();
    }
  });
});
