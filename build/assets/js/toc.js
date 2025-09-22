document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".toc-toggle");
  const content = document.querySelector(".toc-content");
  const main = document.querySelector("main"); // scrollable container

  // initialize styles
  content.style.maxHeight = "0px";
  content.style.overflow = "hidden";
  content.style.transition = "max-height 0.5s ease, opacity 0.5s ease";
  content.style.opacity = "0";

  // toggle open/close
  toggle.addEventListener("click", () => {
    if (content.style.maxHeight === "0px") {
      content.style.maxHeight = content.scrollHeight + "px";
      content.style.opacity = "1";
      toggle.textContent = "▲";
    } else {
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
      toggle.textContent = "▼";
    }
  });

  // auto-close on scroll of main content
  main.addEventListener("scroll", () => {
    if (content.style.maxHeight !== "0px") {
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
      toggle.textContent = "▼";
    }
  }, { passive: true });
});

