/** RN 0.88+ removed InteractionManager; defer focus/layout work until after the current frame. */
export function runAfterInteractions(task: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      task();
    });
    return;
  }

  setTimeout(task, 0);
}
