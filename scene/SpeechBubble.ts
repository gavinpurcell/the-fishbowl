import { Container, Graphics, Text, TextStyle } from 'pixi.js';

type BubbleMode = 'response' | 'question';

/** Easing helpers */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Speech bubble that appears above characters.
 * Supports streaming text (appendText), auto-sizing, typing dots,
 * appear/disappear animations, question vs response styling,
 * and text truncation with scroll-to-bottom.
 */
export class SpeechBubble extends Container {
  private shadow: Graphics;
  private bubble: Graphics;
  private tail: Graphics;
  private textDisplay: Text;
  private textMask: Graphics;
  private typingDots: Graphics;
  private fullText = '';
  private isStreaming = false;
  private dirty = false;

  // Mode (visual style)
  private mode: BubbleMode = 'response';

  // Typing dots animation
  private dotTime = 0;
  private showingDots = false;

  // Appear/disappear animation
  private animState: 'idle' | 'appearing' | 'disappearing' = 'idle';
  private animFrame = 0;
  private readonly APPEAR_FRAMES = 10;
  private readonly DISAPPEAR_FRAMES = 8;

  // Text truncation and height clamping
  private readonly MAX_LINES = 5;
  private readonly LINE_HEIGHT = 15;
  private readonly MIN_HEIGHT = 80;

  // Style constants per mode
  private static readonly STYLES = {
    response: {
      bg: 0xffffff,
      bgAlpha: 0.95,
      border: 0xddd8d0,
      textFill: 0x333333,
      tailColor: 0xffffff,
    },
    question: {
      bg: 0xfff4d6,
      bgAlpha: 0.97,
      border: 0xf0c866,
      textFill: 0x5a4a2a,
      tailColor: 0xfff4d6,
    },
  } as const;

  private readonly MAX_WIDTH = 260;
  private readonly PADDING = 10;
  private readonly TAIL_HEIGHT = 8;

  constructor() {
    super();
    this.visible = false;

    // Drop shadow (drawn behind bubble)
    this.shadow = new Graphics();
    this.addChild(this.shadow);

    // Bubble background
    this.bubble = new Graphics();
    this.addChild(this.bubble);

    // Tail (redrawn per mode)
    this.tail = new Graphics();
    this.addChild(this.tail);
    this.drawTail();

    // Text
    this.textDisplay = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        fill: 0x333333,
        wordWrap: true,
        wordWrapWidth: this.MAX_WIDTH - this.PADDING * 2,
        lineHeight: this.LINE_HEIGHT,
      }),
    });
    this.addChild(this.textDisplay);

    // Clip mask for text (prevents overflow when text exceeds bubble height)
    this.textMask = new Graphics();
    this.addChild(this.textMask);
    this.textDisplay.mask = this.textMask;

    // Typing indicator dots
    this.typingDots = new Graphics();
    this.typingDots.visible = false;
    this.addChild(this.typingDots);

    // Start with scale 0 for animation readiness
    this.scale.set(0);
  }

  /** Set the visual mode of the bubble */
  setMode(mode: BubbleMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyModeStyle();
    this.drawTail();
    this.dirty = true;
  }

  show(text?: string): void {
    this.fullText = text ?? '';
    this.isStreaming = true;
    this.dotTime = 0;

    if (this.fullText.length > 0) {
      this.showingDots = false;
      this.typingDots.visible = false;
      this.textDisplay.text = this.truncateText(this.fullText);
      this.textDisplay.visible = true;
    } else {
      // No text yet — show typing dots
      this.showingDots = true;
      this.typingDots.visible = true;
      this.textDisplay.text = ' '; // space to prevent zero-height for layout sizing
      this.textDisplay.visible = false;
    }

    this.dirty = true;
    this.visible = true;

    // Start appear animation
    this.animState = 'appearing';
    this.animFrame = 0;
    this.scale.set(0);
  }

  appendText(chunk: string): void {
    this.fullText += chunk;

    // If we were showing dots, switch to text
    if (this.showingDots) {
      this.showingDots = false;
      this.typingDots.visible = false;
      this.textDisplay.visible = true;
    }

    this.textDisplay.text = this.truncateText(this.fullText);
    this.dirty = true;
  }

  finishStreaming(): void {
    this.isStreaming = false;
    this.showingDots = false;
    this.typingDots.visible = false;
    // Ensure final text is displayed (truncated if needed)
    if (this.fullText.length > 0) {
      this.textDisplay.text = this.truncateText(this.fullText);
      this.textDisplay.visible = true;
      this.dirty = true;
    }
  }

  hide(): void {
    if (this.animState === 'disappearing') return; // already hiding

    if (!this.visible) {
      // Already hidden, just reset
      this.resetState();
      return;
    }

    // Start disappear animation
    this.animState = 'disappearing';
    this.animFrame = 0;
  }

  /** Immediately hide without animation (for cleanup) */
  hideImmediate(): void {
    this.resetState();
    this.visible = false;
    this.scale.set(0);
  }

  private resetState(): void {
    this.fullText = '';
    this.textDisplay.text = '';
    this.textDisplay.visible = true;
    this.isStreaming = false;
    this.showingDots = false;
    this.typingDots.visible = false;
    this.animState = 'idle';
    this.animFrame = 0;
  }

  /** Apply text style and redraw tail based on current mode */
  private applyModeStyle(): void {
    const s = SpeechBubble.STYLES[this.mode];
    (this.textDisplay.style as TextStyle).fill = s.textFill;
  }

  /** Draw (or redraw) the tail triangle for the current mode */
  private drawTail(): void {
    const s = SpeechBubble.STYLES[this.mode];
    this.tail.clear();

    if (this.mode === 'question') {
      // Question tail: wider, slightly offset to the left for distinction
      this.tail.moveTo(-9, 0)
        .lineTo(-2, this.TAIL_HEIGHT + 2)
        .lineTo(5, 0)
        .closePath()
        .fill({ color: s.tailColor });
    } else {
      // Response tail: centered
      this.tail.moveTo(-7, 0)
        .lineTo(0, this.TAIL_HEIGHT + 1)
        .lineTo(7, 0)
        .closePath()
        .fill({ color: s.tailColor });
    }
  }

  /**
   * Truncate text to MAX_LINES, keeping the latest lines visible (scroll-to-bottom).
   * If the text exceeds MAX_LINES, we take the last MAX_LINES lines and prepend "...".
   */
  private truncateText(text: string): string {
    if (!text) return ' ';

    // Use a temporary text measurement approach:
    // We rely on word-wrapping. Set the text, measure how many lines it produces,
    // and if too many, trim from the front.
    // Since we can't easily measure without setting it, we do a character-based heuristic.
    const wrapWidth = this.MAX_WIDTH - this.PADDING * 2;
    const charsPerLine = Math.floor(wrapWidth / 6); // ~6px per char at fontSize 11
    // Allow more lines based on available space (position.y tells us how much room we have)
    const dynamicMaxLines = Math.max(this.MAX_LINES, Math.floor((this.position.y - 40) / this.LINE_HEIGHT));
    const maxChars = charsPerLine * dynamicMaxLines;

    if (text.length <= maxChars) return text;

    // Take the tail end of the text to simulate scroll-to-bottom
    const truncated = text.slice(-maxChars);
    // Find the first word boundary to avoid cutting mid-word
    const firstSpace = truncated.indexOf(' ');
    if (firstSpace > 0 && firstSpace < 20) {
      return '...' + truncated.slice(firstSpace);
    }
    return '...' + truncated;
  }

  private layout(): void {
    const s = SpeechBubble.STYLES[this.mode];

    // If showing dots, use a fixed small bubble size
    if (this.showingDots) {
      const dotsW = 50;
      const dotsH = 28;

      this.shadow.clear();
      this.shadow.roundRect(-dotsW / 2 + 1, -this.TAIL_HEIGHT - dotsH + 2, dotsW, dotsH, 10)
        .fill({ color: 0x000000, alpha: 0.06 });

      this.bubble.clear();
      this.bubble.roundRect(-dotsW / 2, -this.TAIL_HEIGHT - dotsH, dotsW, dotsH, 10)
        .fill({ color: s.bg, alpha: s.bgAlpha })
        .stroke({ color: s.border, width: 1 });

      // Center the dots container in the bubble
      this.typingDots.position.set(0, -this.TAIL_HEIGHT - dotsH / 2);

      this.tail.position.set(0, -this.TAIL_HEIGHT);
      return;
    }

    const textW = Math.min(this.textDisplay.width + this.PADDING * 2, this.MAX_WIDTH);
    // Dynamically calculate max height based on how much vertical space
    // is available above this bubble in the scene (position.y = distance from top)
    const availableHeight = Math.max(this.MIN_HEIGHT, this.position.y - 20);
    const maxTextH = Math.min(availableHeight - this.PADDING * 2 - this.TAIL_HEIGHT, availableHeight);
    const rawTextH = this.textDisplay.height;
    const clampedTextH = Math.min(rawTextH, maxTextH);
    const textH = clampedTextH + this.PADDING * 2;

    // Position text inside bubble — if text is taller than clamped area,
    // offset upward so the bottom (latest) text is visible (scroll-to-bottom)
    const textYOffset = rawTextH > clampedTextH ? clampedTextH - rawTextH : 0;
    this.textDisplay.position.set(
      -textW / 2 + this.PADDING,
      -this.TAIL_HEIGHT - textH + this.PADDING + textYOffset
    );

    // Update clip mask so text doesn't overflow the bubble bounds
    this.textMask.clear();
    this.textMask.rect(
      -textW / 2 + this.PADDING,
      -this.TAIL_HEIGHT - textH + this.PADDING,
      textW - this.PADDING * 2,
      clampedTextH
    ).fill({ color: 0xffffff });

    // Draw drop shadow (offset by 1,2 behind the main bubble)
    this.shadow.clear();
    this.shadow.roundRect(-textW / 2 + 1, -this.TAIL_HEIGHT - textH + 2, textW, textH, 10)
      .fill({ color: 0x000000, alpha: 0.06 });

    // Draw bubble background
    this.bubble.clear();
    this.bubble.roundRect(-textW / 2, -this.TAIL_HEIGHT - textH, textW, textH, 10)
      .fill({ color: s.bg, alpha: s.bgAlpha })
      .stroke({ color: s.border, width: 1 });

    // Position tail at bottom center
    this.tail.position.set(0, -this.TAIL_HEIGHT);
  }

  /** Draw the 3 bouncing typing dots */
  private drawTypingDots(): void {
    this.typingDots.clear();

    const dotRadius = 2.5;
    const spacing = 8;
    const baseY = 0;

    for (let i = 0; i < 3; i++) {
      const phase = this.dotTime * 4 + i * 1.2; // staggered phases
      const bounce = Math.sin(phase) * 3; // 3px bounce amplitude
      const x = (i - 1) * spacing; // center the 3 dots
      const y = baseY - Math.max(0, -bounce); // only bounce upward

      // Slight alpha variation for liveliness
      const alpha = 0.5 + 0.3 * Math.max(0, Math.sin(phase));

      this.typingDots.circle(x, y, dotRadius)
        .fill({ color: 0x999999, alpha });
    }
  }

  update(_delta: number): void {
    // Handle appear animation
    if (this.animState === 'appearing') {
      this.animFrame++;
      const t = Math.min(this.animFrame / this.APPEAR_FRAMES, 1);
      const s = easeOutBack(t);
      this.scale.set(s);

      if (t >= 1) {
        this.scale.set(1);
        this.animState = 'idle';
      }
    }

    // Handle disappear animation
    if (this.animState === 'disappearing') {
      this.animFrame++;
      const t = Math.min(this.animFrame / this.DISAPPEAR_FRAMES, 1);
      const s = 1 - easeInCubic(t);
      this.scale.set(s);

      if (t >= 1) {
        this.scale.set(0);
        this.visible = false;
        this.resetState();
        this.animState = 'idle';
      }
    }

    // Animate typing dots
    if (this.showingDots && this.visible) {
      this.dotTime += 0.016; // ~60fps increment
      this.drawTypingDots();
    }

    // Layout when dirty
    if (this.dirty && this.visible) {
      this.layout();
      this.dirty = false;
    }
  }
}
