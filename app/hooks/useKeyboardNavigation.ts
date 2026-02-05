"use client";

import { useCallback, KeyboardEvent } from "react";

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onTab?: () => void;
  onSpace?: () => void;
  preventDefault?: boolean[];
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keyMap: Record<string, (() => void) | undefined> = {
        Enter: options.onEnter,
        Escape: options.onEscape,
        ArrowUp: options.onArrowUp,
        ArrowDown: options.onArrowDown,
        ArrowLeft: options.onArrowLeft,
        ArrowRight: options.onArrowRight,
        Home: options.onHome,
        End: options.onEnd,
        Tab: options.onTab,
        " ": options.onSpace,
      };

      const handler = keyMap[event.key];
      
      if (handler) {
        if (options.preventDefault?.includes(true)) {
          event.preventDefault();
        }
        handler();
      }
    },
    [options]
  );

  return handleKeyDown;
}
