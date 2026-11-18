(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var lightbox = document.createElement("div");
    lightbox.className = "fleet-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Aircraft photograph");
    lightbox.innerHTML =
      '<button type="button" class="fleet-lightbox-close" aria-label="Close photograph">&times;</button><img alt="">';
    document.body.appendChild(lightbox);
    var lightboxImg = lightbox.querySelector("img");
    var closeBtn = lightbox.querySelector(".fleet-lightbox-close");

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImg.removeAttribute("src");
    }

    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
    });

    document.querySelectorAll(".fleet-gallery").forEach(function (gallery) {
      var mainLink = gallery.querySelector(".fleet-gallery-main");
      var mainImg = mainLink && mainLink.querySelector("img");
      var thumbs = gallery.querySelectorAll(".fleet-gallery-thumb");
      if (!mainLink || !mainImg) return;

      thumbs.forEach(function (thumb) {
        thumb.addEventListener("click", function () {
          var full = thumb.getAttribute("data-full");
          var thumbImg = thumb.querySelector("img");
          if (!full) return;
          mainImg.src = full;
          mainLink.href = full;
          if (thumbImg && thumbImg.getAttribute("alt")) {
            mainImg.alt = thumbImg.getAttribute("alt");
          } else if (thumb.getAttribute("aria-label")) {
            mainImg.alt = thumb.getAttribute("aria-label");
          }
          thumbs.forEach(function (other) {
            if (other === thumb) other.setAttribute("aria-current", "true");
            else other.removeAttribute("aria-current");
          });
        });
      });

      mainLink.addEventListener("click", function (event) {
        event.preventDefault();
        lightboxImg.src = mainLink.href;
        lightboxImg.alt = mainImg.alt || "";
        lightbox.hidden = false;
        closeBtn.focus();
      });
    });
  });
})();
