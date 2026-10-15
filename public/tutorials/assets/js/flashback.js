/* Flashback: flip cards. */
(function () {
  QP.onReady(() => {
    QP.$$(".flip").forEach((f) => {
      const flip = () => f.classList.toggle("on");
      f.addEventListener("click", flip);
      f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    });
  });
})();
