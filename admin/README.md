# Site editor

The public sites remain Eleventy sites. The private editor uses React components
for the file tree, editor, resizable panels, photo controls and preview. Its
preview uses the public site's compiled Nunjucks templates and built stylesheet,
not a separate approximation of the post design. Preview forms are inert.

The About page is editable as `src/about.md`. Its fixed heading and contact
buttons live in `layouts/about.njk`, shared by the public page and draft preview.
Other template-owned landing pages are not exposed as editable templates.

## Photos

Place the cursor between paragraphs and choose **Add photos**. Choose files or
reuse the photo library, add a description for each image, optionally add captions,
reorder them, and insert the block. Put the cursor inside an existing block to
edit it. Multiple blocks can appear anywhere in a document.

```markdown
::: gallery
![Description of the photo](/assets/images/example.jpg "Optional caption")

![Description of another photo](/assets/images/another.jpg)
:::
```

A single photo fits the reading column. Multiple photos form a horizontal,
swipeable strip on every screen size. Photos stay compact on phones and keep
their original proportions without cropping. Captions are optional. Keyboard
users can focus a gallery and use arrow keys to scroll it.
No block means no gallery. The same syntax works in personal and research notes.

New browser-uploaded photos are resized to JPEG and stripped of EXIF metadata.
Draft photos are kept in IndexedDB until publishing. Photos and Markdown publish
in one Git commit, with stale-source and branch-race checks. Publishing photos
requires the updated admin worker; an older worker cannot partially publish the
text alone. HEIC files should first be converted to JPEG on the computer.

Run `bun run start:admin` for the read-only local editor. It cannot publish.
Rebuild with `bun run build` after changing the editor components or templates.
