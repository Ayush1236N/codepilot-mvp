import fs from "fs";
import path from "path";
import { walkFiles } from "./repo.service";

/**
 * NOTE ON SCOPE (see README "Known Simplifications"):
 * The full spec calls for a JavaParser/Eclipse JDT-based AST + symbol/dependency
 * graph (module `ast` + `graph`). Building a real Java AST engine is a large
 * standalone project. This MVP instead uses regex-based structural extraction
 * (package/class/method signatures) plus keyword-overlap scoring against the
 * issue text to select relevant files. It is intentionally simple and is the
 * single biggest fidelity gap vs. the full specification. Swapping this module
 * for a real `javaparser`-backed microservice is the first post-MVP upgrade.
 */

export interface FileSymbols {
  file: string;
  relativePath: string;
  packageName: string | null;
  classNames: string[];
  methodSignatures: string[];
}

const CLASS_RE = /\b(?:public|protected|private)?\s*(?:abstract\s+|final\s+)?class\s+(\w+)/g;
const INTERFACE_RE = /\binterface\s+(\w+)/g;
const METHOD_RE = /\b(?:public|protected|private)\s+(?:static\s+)?(?:final\s+)?[\w<>\[\],\s]+?\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g;
const PACKAGE_RE = /^package\s+([\w.]+);/m;

export function indexRepository(repoDir: string): FileSymbols[] {
  const javaFiles = walkFiles(repoDir, ".java");
  return javaFiles.map((file) => {
    const content = safeRead(file);
    const pkgMatch = PACKAGE_RE.exec(content);
    const classNames = [...content.matchAll(CLASS_RE)].map((m) => m[1]);
    const ifaceNames = [...content.matchAll(INTERFACE_RE)].map((m) => m[1]);
    const methods = [...content.matchAll(METHOD_RE)].map((m) => m[1]);
    return {
      file,
      relativePath: path.relative(repoDir, file),
      packageName: pkgMatch ? pkgMatch[1] : null,
      classNames: [...classNames, ...ifaceNames],
      methodSignatures: [...new Set(methods)],
    };
  });
}

function safeRead(file: string): string {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return "";
  }
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

/**
 * Score files by keyword overlap between the issue text and:
 * - the file path
 * - class/method names (camelCase-split)
 * - a snippet of file content
 * Returns the top N most relevant files with their content, for LLM context.
 */
export function retrieveRelevantFiles(
  repoDir: string,
  symbols: FileSymbols[],
  issueTitle: string,
  issueBody: string,
  topN = 8,
  maxCharsPerFile = 6000
): { relativePath: string; content: string; classNames: string[] }[] {
  const issueTokens = tokenize(`${issueTitle} ${issueBody}`);

  const scored = symbols.map((sym) => {
    const nameTokens = tokenize(
      [sym.relativePath, ...sym.classNames, ...sym.methodSignatures]
        .join(" ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
    );
    let overlap = 0;
    for (const t of nameTokens) if (issueTokens.has(t)) overlap++;
    // Small bonus for test files being excluded from primary edit targets,
    // but they still matter for regression awareness so keep them eligible.
    return { sym, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN).filter((s) => s.score > 0);
  // If nothing scored (issue text too generic), fall back to smallest/most-central files
  const chosen = top.length > 0 ? top : scored.slice(0, Math.min(topN, scored.length));

  return chosen.map(({ sym }) => {
    const content = safeRead(sym.file).slice(0, maxCharsPerFile);
    return { relativePath: sym.relativePath, content, classNames: sym.classNames };
  });
}
