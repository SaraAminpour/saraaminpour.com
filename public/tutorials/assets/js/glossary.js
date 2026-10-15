/* Glossary: live search plus a filter by tutorial. */
(function () {
  QP.onReady(() => {
    const input = QP.$("#gsearch");
    if (!input) return;
    const items = QP.$$(".glossary-item");
    const chips = QP.$$(".gl-filters .chip");
    const count = QP.$("#gcount");
    let track = "all";
    function apply() {
      const q = input.value.trim().toLowerCase();
      let n = 0;
      items.forEach((it) => {
        const show = (track === "all" || it.dataset.track === track) && (!q || it.textContent.toLowerCase().includes(q));
        it.style.display = show ? "" : "none";
        if (show) n++;
      });
      count.textContent = n === items.length ? `${n} terms` : `${n} of ${items.length} terms`;
    }
    chips.forEach((c) => c.addEventListener("click", () => {
      track = c.dataset.track;
      chips.forEach((x) => x.classList.toggle("on", x === c));
      apply();
    }));
    input.addEventListener("input", apply);
    apply();
  });
})();
