(() => {
  const source = new URL(location.href);
  if (!/^\/ai(?:\/|$)/.test(source.pathname)) return;
  const target = new URL(`/gomoku-studio/${source.pathname.replace(/^\/ai(?:\/|$)/, "")}`, "https://5849mog.github.io");
  target.search = source.search;
  target.hash = source.hash;
  document.querySelector("#project-link").href = target.href;
  location.replace(target.href);
})();
