import fs from "fs";
import path from "path";

export function getProjectPaths() {
  return {
    root: getProjectRoot(),
    src: path.join(getProjectRoot(), "src"),
    output: path.join(getProjectRoot(), "out/client"),
    public: "/dist/",
  };
}

export interface ProjectPaths {
  root: string;
  src: string;
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
