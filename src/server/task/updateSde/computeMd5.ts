import * as fs from "fs";
import * as crypto from "crypto";

export function computeMd5(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(path);
    const hash = crypto.createHash("md5");
    hash.setEncoding("hex");

    fileStream
      .on("error", reject)
      .pipe(hash)
      .on("error", reject)
      .on("readable", () => {
        const data = hash.read();
        if (data) {
          resolve(data as string);
        } else {
          reject(new Error(`Hash failed for file ${path}.`));
        }
      });
  });
}
