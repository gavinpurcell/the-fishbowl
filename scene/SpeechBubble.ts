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
 * Pixel-art RPG dialog box aesthetic with double border,
 * streaming text, typing dots, and appear/disappear animations.
 */
export class SpeechBubble extends Container {
  private shadow: Graphics;
  private bubble: Graphics;
  private innerBorder: Graphics;
  private tail: Graphics;
  private tailBorder: Graphics;
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
  private readonly LINE_HEIGHT = 16;
  private readonly MIN_HEIGHT = 80;

  // Style constants per mode — pixel-art RPG dialog box palette
  private static readonly STYLES = {
    response: {
      bg: 0xfaf6ee,           // warm parchment
      bgAlpha: 0.97,
      borderOuter: 0x5a4a3a,  // dark brown outer border
      borderInner: 0xd4c8b0,  // lighter inner border
      textFill: 0x3a2e22,     // warm dark brown text
      tailColor: 0xfaf6ee,
      tailBorder: 0x5a4a3a,
      shadowColor: 0x3a2e1a,
      dotColor: 0x8a7a66,
    },
    question: {
      bg: 0xfff3c8,           // warm gold
      bgAlpha: 0.98,
      borderOuter: 0x8a6a20,  // dark gold outer border
      borderInner: 0xe8c44a,  // bright gold inner border
      textFill: 0x4a3a10,     // dark warm text
      tailColor: 0xfff3c8,
      tailBorder: 0x8a6a20,
      shadowColor: 0x5a4a10,
      dotColor: 0xc49a2a,
    },
  } as const;

  private readonly MAX_WIDTH = 260;
  private readonly PADDING = 12;
  private readonly TAIL_HEIGHT = 10;
  private readonly BORDER_OUTER = 2;
  private readonly BORDER_INNER = 1;
  private readonly CORNER_RADIUS = 4; // tight pixel-art corners

  constructor() {
    super();
    this.visible = false;

    // Drop shadow (drawn behind bubble)
    this.shadow = new Graphics();
    this.addChild(this.shadow);

    // Bubble background (outer border filled)
    this.bubble = new Graphics();
    this.addChild(this.bubble);

    // Inner border highlight
    this.innerBorder = new Graphics();
    this.addChild(this.innerBorder);

    // Tail border (drawn behind tail fill)
    this.tailBorder = new Graphics();
    this.addChild(this.tailBorder);

    // Tail fill
    this.tail = new Graphics();
    this.addChild(this.tail);
    this.drawTail();

    // Text — DM Mono for readability with pixel character
    this.textDisplay = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: '"DM Mono", "Courier New", monospace',
        fontSize: 11,
        fill: 0x3a2e22,
        wordWrap: true,
        wordWrapWidth: this.MAX_WIDTH - this.PADDING * 2,
        lineHeight: this.LINE_HEIGHT,
        letterSpacing: 0.2,
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

    // Tail border (slightly larger, drawn behind)
    this.tailBorder.clear();
    const borderPad = this.BORDER_OUTER;

    if (this.mode === 'question') {
      // Question tail: slightly offset left
      this.tailBorder.moveTo(-11 - borderPad, 0)
        .lineTo(-2, this.TAIL_HEIGHT + 3 + borderPad)
        .lineTo(7 + borderPad, 0)
        .closePath()
        .fill({ color: s.tailBorder });

      this.tail.clear();
      this.tail.moveTo(-9, 0)
        .lineTo(-2, this.TAIL_HEIGHT + 2)
        .lineTo(5, 0)
        .closePath()
        .fill({ color: s.tailColor });
    } else {
      // Response tail: centered
      this.tailBorder.moveTo(-9 - borderPad, 0)
        .lineTo(0, this.TAIL_HEIGHT + 2 + borderPad)
        .lineTo(9 + borderPad, 0)
        .closePath()
        .fill({ color: s.tailBorder });

      this.tail.clear();
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

    const wrapWidth = this.MAX_WIDTH - this.PADDING * 2;
    const charsPerLine = Math.floor(wrapWidth / 6); // ~6px per char at fontSize 11
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
      const dotsW = 54;
      const dotsH = 30;

      // Shadow
      this.shadow.clear();
      this.shadow.roundRect(-dotsW / 2 + 2, -this.TAIL_HEIGHT - dotsH + 3, dotsW, dotsH, this.CORNER_RADIUS)
        .fill({ color: s.shadowColor, alpha: 0.15 });

      // Outer border (dark)
      this.bubble.clear();
      this.bubble.roundRect(-dotsW / 2, -this.TAIL_HEIGHT - dotsH, dotsW, dotsH, this.CORNER_RADIUS)
        .fill({ color: s.borderOuter });

      // Inner fill with inset
      const inset = this.BORDER_OUTER;
      this.innerBorder.clear();
      this.innerBorder.roundRect(
        -dotsW / 2 + inset,
        -this.TAIL_HEIGHT - dotsH + inset,
        dotsW - inset * 2,
        dotsH - inset * 2,
        Math.max(1, this.CORNER_RADIUS - 1),
      ).fill({ color: s.borderInner });

      // Inner fill
      const inset2 = inset + this.BORDER_INNER;
      this.innerBorder.roundRect(
        -dotsW / 2 + inset2,
        -this.TAIL_HEIGHT - dotsH + inset2,
        dotsW - inset2 * 2,
        dotsH - inset2 * 2,
        Math.max(1, this.CORNER_RADIUS - 2),
      ).fill({ color: s.bg, alpha: s.bgAlpha });

      // Center the dots container in the bubble
      this.typingDots.position.set(0, -this.TAIL_HEIGHT - dotsH / 2);

      this.tail.position.set(0, -this.TAIL_HEIGHT);
      this.tailBorder.position.set(0, -this.TAIL_HEIGHT);
      return;
    }

    const textW = Math.min(this.textDisplay.width + this.PADDING * 2, this.MAX_WIDTH);
    const availableHeight = Math.max(this.MIN_HEIGHT, this.position.y - 20);
    const maxTextH = Math.min(availableHeight - this.PADDING * 2 - this.TAIL_HEIGHT, availableHeight);
    const rawTextH = this.textDisplay.height;
    const clampedTextH = Math.min(rawTextH, maxTextH);
    const textH = clampedTextH + this.PADDING * 2;

    // Position text inside bubble
    const textYOffset = rawTextH > clampedTextH ? clampedTextH - rawTextH : 0;
    this.textDisplay.position.set(
      -textW / 2 + this.PADDING,
      -this.TAIL_HEIGHT - textH + this.PADDING + textYOffset
    );

    // Update clip mask
    this.textMask.clear();
    this.textMask.rect(
      -textW / 2 + this.PADDING,
      -this.TAIL_HEIGHT - textH + this.PADDING,
      textW - this.PADDING * 2,
      clampedTextH
    ).fill({ color: 0xffffff });

    // Drop shadow — offset down-right, warm tone
    this.shadow.clear();
    this.shadow.roundRect(-textW / 2 + 2, -this.TAIL_HEIGHT - textH + 3, textW, textH, this.CORNER_RADIUS)
      .fill({ color: s.shadowColor, alpha: 0.15 });

    // Outer border (dark frame)
    this.bubble.clear();
    this.bubble.roundRect(-textW / 2, -this.TAIL_HEIGHT - textH, textW, textH, this.CORNER_RADIUS)
      .fill({ color: s.borderOuter });

    // Inner border highlight (1px lighter line inside the dark border)
    const inset = this.BORDER_OUTER;
    this.innerBorder.clear();
    this.innerBorder.roundRect(
      -textW / 2 + inset,
      -this.TAIL_HEIGHT - textH + inset,
      textW - inset * 2,
      textH - inset * 2,
      Math.max(1, this.CORNER_RADIUS - 1),
    ).fill({ color: s.borderInner });

    // Main fill (inside both borders)
    const inset2 = inset + this.BORDER_INNER;
    this.innerBorder.roundRect(
      -textW / 2 + inset2,
      -this.TAIL_HEIGHT - textH + inset2,
      textW - inset2 * 2,
      textH - inset2 * 2,
      Math.max(1, this.CORNER_RADIUS - 2),
    ).fill({ color: s.bg, alpha: s.bgAlpha });

    // Position tail at bottom center
    this.tail.position.set(0, -this.TAIL_HEIGHT);
    this.tailBorder.position.set(0, -this.TAIL_HEIGHT);
  }

  /** Draw the 3 bouncing typing dots */
  private drawTypingDots(): void {
    this.typingDots.clear();
    const s = SpeechBubble.STYLES[this.mode];

    const dotRadius = 2.5;
    const spacing = 9;
    const baseY = 0;

    for (let i = 0; i < 3; i++) {
      const phase = this.dotTime * 4 + i * 1.2; // staggered phases
      const bounce = Math.sin(phase) * 3; // 3px bounce amplitude
      const x = (i - 1) * spacing; // center the 3 dots
      const y = baseY - Math.max(0, -bounce); // only bounce upward

      // Alpha variation for liveliness
      const alpha = 0.6 + 0.35 * Math.max(0, Math.sin(phase));

      this.typingDots.circle(x, y, dotRadius)
        .fill({ color: s.dotColor, alpha });
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
