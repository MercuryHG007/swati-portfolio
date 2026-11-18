import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OPENAPI_PATHS, apiCatalog } from "@/lib/api-catalog";

const API_DIR = fileURLToPath(new URL("../app/api", import.meta.url));
const PUBLIC_API_ROOT = "portfolio";

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
});
