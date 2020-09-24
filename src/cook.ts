import { CookingOptions } from "./@types/cook";
import { resolve } from "path";
import { existsSync, createWriteStream, unlinkSync } from "fs";
import { spawn } from "child_process";

export class Cooker {
  private static SUFFIXES = [
    ".ogg.data",
    ".ogg.header1",
    ".ogg.header2",
    ".ogg.info",
    ".ogg.users",
  ];
  private static get BASE_PATH(): string {
    // Dev mode
    if (__dirname.includes("src")) {
      return resolve(__dirname, "..");
    }
    // Prod Mode, cook.sh is at the same level
    return __dirname;
  }

  private static get RECORDINGS_PATH(): string {
    return `${Cooker.BASE_PATH}/rec`;
  }

  static recordExists(id: number): boolean {
    const fileBase = `${Cooker.RECORDINGS_PATH}/${id}`;
    return Cooker.SUFFIXES.map((s) => `${fileBase}${s}`).every(existsSync);
  }

  static cook(id: number, options: CookingOptions) {
    const cookingProcess = spawn(
      `./cook.sh`,
      [String(id), options.format, options.container],
      {
        cwd: __dirname,
      }
    );
    cookingProcess.stderr.on("data", (data) => console.log(data.toString()));
    return cookingProcess.stdout;
  }

  static delete(id: number) {
    const fileBase = `${Cooker.RECORDINGS_PATH}/${id}`;
    Cooker.SUFFIXES.map((s) => `${fileBase}${s}`).forEach(unlinkSync);
  }
}
