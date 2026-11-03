"use client";

import { useCallback } from "react";

/**
 * Callback ref for a scroll area with hidden scroll bars. It marks which
 * edges still have content past them (`data-fade`), so CSS can fade those
 * edges instead of showing a bar.
 */
export function useScrollFade<T extends HTMLElement>() {
  return useCallback((node: T | null) => {
    if (!node) {
      return;
    }

    const update = () => {
      const overflow = node.scrollHeight - node.clientHeight;
      const moreAbove = node.scrollTop > 2;
      const moreBelow = node.scrollTop < overflow - 2;

      node.dataset.fade =
        overflow <= 2
          ? "none"
          : moreAbove && moreBelow
            ? "both"
            : moreAbove
              ? "top"
              : "bottom";
    };

    const resizeObserver = new ResizeObserver(update);
    const mutationObserver = new MutationObserver(update);

    update();
    node.addEventListener("scroll", update, { passive: true });
    resizeObserver.observe(node);
    mutationObserver.observe(node, { childList: true, subtree: true, characterData: true });

    return () => {
      node.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
