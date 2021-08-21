import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getProjectPaths() {
  return {
    root: getProjectRoot(),
    src: path.join(getProjectRoot(), "src"),
    clientSrc: path.join(getProjectRoot(), "src/client"),
    output: path.join(getProjectRoot(), "out/client"),
    public: "/dist/",
  };
}

export interface ProjectPaths {
  root: string;
  src: string;
  clientSrc: string;
  output: string;
  public: string;
}

let projectRoot = null as string | null;

function getProjectRoot() {
  if (projectRoot == null) {
    projectRoot = findProjectRoot(__dirname);
  }
  return projectRoot;
}

function findProjectRoot(currentPath: string): string {
  if (currentPath == "/") {
    throw new Error(`Cannot find project root`);
  }
  if (fs.existsSync(path.join(currentPath, "package.json"))) {
    return currentPath;
  } else {
    return findProjectRoot(path.resolve(currentPath, "../"));
  }
}
