import { BUBBLE_OFFSET_Y, BOX_OFFSET_Y, DREAMY_BOX_WIDTH } from '../../shared/constants';

export interface BubblePosition {
  top: number;
  left: number;
}

export interface BoxPosition {
  top: number;
  left: number;
  origin: 'above' | 'below';
}

export function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;
  return range.getBoundingClientRect();
}

export function findWeReadToolbar(): HTMLElement | null {
  const selectors = [
    '.reader_notes_writer_toolbar',
    '.reader_toolbar',
    '[class*="toolbar"]',
    '[class*="menu"]',
    '[role="toolbar"]',
    '[role="menu"]',
  ];

  const selectionRect = getSelectionRect();
  if (!selectionRect) return null;

  const allElements = document.querySelectorAll<HTMLElement>(
    selectors.join(', '),
  );

  for (const el of allElements) {
    const elRect = el.getBoundingClientRect();
    if (
      elRect.width > 0 &&
      elRect.height > 0 &&
      Math.abs(elRect.top - selectionRect.bottom) < 60 &&
      Math.abs(elRect.bottom - selectionRect.top) < 60
    ) {
      return el;
    }
  }

  return null;
}

export function calcBubblePosition(): BubblePosition | null {
  const selectionRect = getSelectionRect();
  if (!selectionRect) return null;

  const toolbar = findWeReadToolbar();

  if (toolbar) {
    const tRect = toolbar.getBoundingClientRect();
    return {
      top: tRect.bottom + BUBBLE_OFFSET_Y,
      left: tRect.left + tRect.width / 2,
    };
  }

  // No toolbar found — position below selection with extra gap
  return {
    top: selectionRect.bottom + BUBBLE_OFFSET_Y + 40,
    left: selectionRect.left + selectionRect.width / 2,
  };
}

export function calcBoxPosition(bubblePos: BubblePosition): BoxPosition {
  const boxHeight = 520;
  const spaceAbove = bubblePos.top;

  if (spaceAbove > boxHeight + 40) {
    return {
      top: bubblePos.top - BOX_OFFSET_Y,
      left: bubblePos.left - DREAMY_BOX_WIDTH / 2,
      origin: 'above',
    };
  }

  return {
    top: bubblePos.top + 40 + BOX_OFFSET_Y,
    left: bubblePos.left - DREAMY_BOX_WIDTH / 2,
    origin: 'below',
  };
}

export function clampToViewport(pos: { top: number; left: number; origin: 'above' | 'below' }): {
  top: number;
  left: number;
} {
  const boxWidth = 360;
  const boxHeight = 560; // Approximate total height
  const margin = 16;

  let left = pos.left;
  let top = pos.top;

  if (left < margin) left = margin;
  if (left + boxWidth > window.innerWidth - margin) {
    left = window.innerWidth - boxWidth - margin;
  }

  // Vertical clamping
  if (pos.origin === 'above') {
    // Box extends upward from the position
    top = pos.top - boxHeight;
    if (top < margin) {
      // Not enough space above, flip below
      top = pos.top + 40;
    }
  } else {
    // Box extends downward
    if (top + boxHeight > window.innerHeight - margin) {
      // Not enough space below, flip above
      top = pos.top - boxHeight - 8;
      if (top < margin) top = margin;
    }
  }

  return { top, left };
}
