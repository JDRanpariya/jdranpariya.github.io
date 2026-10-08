import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Eleventy from "@11ty/eleventy";
import { copyResearchMedia, referencedResearchMedia } from "./research-media.mjs";

test("research media paths exclude traversal, remote files and unreferenced assets", () => {
  expect(
    referencedResearchMedia(
      `<img src="/assets/images/uploads/photo.jpg"><img src='/assets/images/icra-2026/view.jpg'><img src="/assets/images/../secret.jpg"><img src="https://other.test/a.jpg"><img src="/assets/images/a.svg">`
    )
  ).toEqual(["assets/images/uploads/photo.jpg", "assets/images/icra-2026/view.jpg"]);
});

test("referenced gallery photos are delivered in the separate research Eleventy output", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "research-media-"));
  try {
    const input = join(fixture, "site"),
      source = "assets/images/uploads/photo.jpg";
    await mkdir(input, { recursive: true });
    await mkdir(join(fixture, "assets/images/uploads"), { recursive: true });
    const photo = new Uint8Array([255, 216, 255, 224, 0, 0, 255, 217]);
    await writeFile(join(fixture, source), photo);
    await writeFile(join(fixture, "assets/images/uploads/unreferenced.jpg"), photo);
    const html = `<div class="photo-gallery"><figure><img src="/${source}" alt="View"></figure></div>`;
    await writeFile(join(input, "index.njk"), html);
    const output = join(fixture, "output");
    await new Eleventy(input, output, {
      configPath: false,
      quietMode: true,
      config(config) {
        copyResearchMedia(config, html, fixture);
      },
    }).write();
    expect(new Uint8Array(await readFile(join(output, source)))).toEqual(photo);
    await expect(
      readFile(join(output, "assets/images/uploads/unreferenced.jpg"))
    ).rejects.toThrow();
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 30000);
