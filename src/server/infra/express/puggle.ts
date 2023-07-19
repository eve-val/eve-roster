import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import pug from "pug";
import express from "express";
import webpack from "webpack";
import { nil } from "../../../shared/util/simpleTypes.js";

/**
 * A wrapper around the pug templating engine that works with webpack dev
 * middleware (if present).
 *
 * We use webpack to compile not only our JS and CSS files, but also our
 * HTML files (which are actually Pug templates that generate HTML). This
 * unfortunately means that we can't use express's standard Pug integration
 * when rendering these HTML pages for one special reason: client dev mode.
 * When in client dev mode, in order to improve performance, none of the
 * webpack-compiled files are ever actually written to disk. However, express
 * very much expects the HTML templates to be there and will throw an error if
 * they're not.
 *
 * There is unfortunately no way to conditionally tell express to use the dev
 * system's in-memory file system when looking for templates, so instead we
 * have to bypass express's template system entirely and just manually render
 * the HTML ourselves, reimplementing a cache system and more. Et voila,
 * Puggle!
 */
export class Puggle {
  private templateProvider: TemplateProvider;

  constructor(outputPath: string, compiler: webpack.Compiler | nil) {
    this.templateProvider = new TemplateProvider(
      outputPath,
      compiler != null
        ? new DevMiddlewareTemplateFs(compiler)
        : new ProdTemplateFs(),
    );
  }

  async render(res: express.Response, viewName: string, options: object) {
    const template = await this.templateProvider.getTemplate(viewName);
    res.status(200).send(template(options));
  }
}

class TemplateProvider {
  private cache = new Map<string, TemplateCacheEntry>();

  constructor(
    private outputPath: string,
    private fs: TemplateFs,
  ) {}

  async getTemplate(name: string): Promise<pug.compileTemplate> {
    const cached = this.cache.get(name);

    if (cached?.type == "pending") {
      return cached.promise;
    }

    if (cached != null && (await this.fs.isCacheValid(cached))) {
      return cached.template;
    }

    // Cache is invalid or missing; time to generate one
    const promise = new Promise<pug.compileTemplate>(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        const filepath = path.join(this.outputPath, `${name}.pug`);
        try {
          const timestamp = Date.now();
          const template = pug.compile(
            await this.fs.readFile(filepath, "utf-8"),
          );
          this.cache.set(name, {
            type: "cached",
            template,
            filepath,
            timestamp,
          });
          resolve(template);
        } catch (e) {
          reject(e);
        }
      },
    );

    this.cache.set(name, {
      type: "pending",
      promise: promise,
    });

    return promise;
  }
}

class ProdTemplateFs implements TemplateFs {
  isCacheValid(_cached: CachedTemplate): Promise<boolean> {
    // Files can't change in prod, so the cache is always valid
    return Promise.resolve(true);
  }

  readFile(filepath: string, encoding: BufferEncoding): Promise<string> {
    return fsPromises.readFile(filepath, encoding);
  }
}

class DevMiddlewareTemplateFs implements TemplateFs {
  constructor(private compiler: webpack.Compiler) {}

  async isCacheValid(cached: CachedTemplate): Promise<boolean> {
    const stats = await this.lstat(cached.filepath);
    return stats.mtimeMs < cached.timestamp;
  }

  readFile(filepath: string, encoding: BufferEncoding): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      (this.compiler.outputFileSystem.readFile as typeof fs.readFile)(
        filepath,
        encoding,
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  }

  private lstat(filepath: string) {
    return new Promise<fs.Stats>((resolve, reject) => {
      (this.compiler.outputFileSystem.lstat as typeof fs.lstat)(
        filepath,
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  }
}

type TemplateCacheEntry = PendingTemplate | CachedTemplate;

interface PendingTemplate {
  type: "pending";
  promise: Promise<pug.compileTemplate>;
}

interface CachedTemplate {
  type: "cached";
  template: pug.compileTemplate;
  filepath: string;
  timestamp: number;
}

interface TemplateFs {
  isCacheValid(cached: CachedTemplate): Promise<boolean>;
  readFile(filepath: string, encoding: BufferEncoding): Promise<string>;
}
