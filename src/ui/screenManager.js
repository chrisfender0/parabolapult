// Mounts/unmounts screen modules into a root element, one active at a
// time. A screen is a plain module exporting mount(root, ctx) and,
// optionally, unmount() for its own cleanup.
export function createScreenManager(root) {
  let current = null;

  function show(screen, ctx) {
    if (current) {
      current.unmount?.();
    }
    root.replaceChildren();
    current = screen;
    screen.mount(root, ctx);
  }

  return { show };
}
