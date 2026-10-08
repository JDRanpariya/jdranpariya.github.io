import { galleryItems } from "../../../scripts/gallery-data.mjs";

export function PhotoGallery({ source }: { source: string }) {
  const photos = galleryItems(source);
  return (
    <div
      className="photo-gallery"
      role={photos.length > 1 ? "region" : "group"}
      aria-label={photos.length > 1 ? `Photo gallery, ${photos.length} photos` : "Photograph"}
      tabIndex={photos.length > 1 ? 0 : undefined}
    >
      {photos.map((photo, index) => (
        <figure className="photo-figure" key={`${photo.src}:${index}`}>
          <img src={photo.src} alt={photo.alt} loading="lazy" />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
