export function createGuestbookCard(entry, template, themes, stamps) {
  const card = template.content.firstElementChild.cloneNode(true);
  const theme = themes.find((theme) => theme.key === entry.theme) || themes[0];
  card.dataset.theme = theme.key;
  card.dataset.guestbookId = String(entry.id);
  card.style.setProperty("--rotation", `${(((Number(entry.id) * 73 + 11) % 41) - 20) / 10}deg`);
  card.querySelector(".notecard__texture").src = theme.src;
  card.querySelector("[data-guestbook-message]").textContent = entry.message;
  const signature = card.querySelector("[data-guestbook-name]");
  signature.textContent = entry.name;
  try {
    const url = new URL(entry.url);
    if (["http:", "https:"].includes(url.protocol)) {
      const link = document.createElement("a");
      link.href = url.href;
      link.textContent = entry.name;
      link.className =
        "text-inherit underline underline-offset-2 decoration-1 hover:decoration-2 hover:font-semibold";
      link.rel = "ugc nofollow noopener noreferrer";
      link.target = "_blank";
      signature.replaceChildren(link);
    }
  } catch {
    /* Plain names remain plain when there is no valid URL. */
  }
  const stamp = card.querySelector("[data-guestbook-stamp]");
  const stampPath = `/assets/images/stamps/stamp-${entry.stamp}.webp`;
  stamp.hidden = !stamps.includes(stampPath);
  if (!stamp.hidden) stamp.src = stampPath;
  const date = card.querySelector("[data-guestbook-date]");
  date.dateTime = entry.date;
  date.hidden = false;
  date.textContent = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(entry.date));
  return card;
}

export async function guestbookFetch(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(payload.error || "The guestbook is unavailable. Please try again later."),
      { status: response.status }
    );
  return payload;
}
