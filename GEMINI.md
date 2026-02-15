# Lessons Learned

## Infinite Scrolling & DOM Performance

### Avoiding Scroll Jumps
When implementing bi-directional infinite scroll (specifically when scrolling up/backwards):
- **Problem:** Prepending content changes the document height, pushing the current viewport content down and causing a visual "jump".
- **Solution:** Accurately maintain the user's relative position by measuring the `scrollHeight` *before* and *after* the DOM update.
  ```javascript
  const oldHeight = container.scrollHeight;
  // ... prepend content ...
  const newHeight = container.scrollHeight;
  container.scrollTop += (newHeight - oldHeight);
  ```
- **Anti-Pattern:** Do not rely on fixed estimates or helper functions (like `outerHeight`) to guess the height of new content. Variable content heights (e.g., months with 4 vs 6 weeks) make estimates unreliable.

### Preventing Layout Thrashing
- **Problem:** Reading layout properties (like `scrollTop`, `offsetHeight`) interleaved with DOM writes (`appendChild`, `insertBefore`) forces the browser to synchronously recalculate style and layout (reflow) multiple times.
- **Solution:**
  1. **Batch Reads/Writes:** Read all necessary metrics first, then perform all DOM writes.
  2. **DocumentFragment:** Use `document.createDocumentFragment()` to build a subtree of new nodes off-DOM, then insert them all at once.

### Scroll Event Handling
- **Throttling/Gating:** Scroll events fire rapidly. Use an `isLoading` flag (semaphore) to prevent multiple handlers from running simultaneously (re-entrancy) while an update is processing.
- **requestAnimationFrame:** Wrap DOM updates inside `requestAnimationFrame` to ensure they execute at the optimal time in the rendering pipeline, reducing jank.
- **Batch Size:** Adding fewer items more frequently (e.g., 2 months vs 6 months) often results in a smoother frame rate than large, blocking updates.

## GitHub Codespaces & Port Forwarding

### CLI Port Visibility
When running ad-hoc servers (like `python3 -m http.server`) in a Codespace, the port is not automatically public.
- **Command:** Use the GitHub CLI to expose a port:
  ```bash
  gh codespace ports visibility <port>:public -c $CODESPACE_NAME
  ```
- **Troubleshooting:**
  - **404 Not Found:** This error often occurs if you try to set visibility before the server is actually listening on the port. Ensure the server process is running and bound to the port (check with `lsof -i :<port>`) before attempting to change visibility.
  - **Environment:** Always check the `$CODESPACE_NAME` environment variable is available.
