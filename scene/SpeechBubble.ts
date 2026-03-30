import { CanvasTextMetrics, Container, Graphics, Text, TextStyle } from 'pixi.js';

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
 *
 * Long text is clipped via a PixiJS mask with auto-scroll-to-bottom,
 * keeping the most recent text visible while the bubble stays within
 * the canvas viewport.
 */
export class SpeechBubble extends Container {
  private shadow: Graphics;
  private bubble: Graphics;
  private innerBorder: Graphics;
  private tail: Graphics;
  private tailBorder: Graphics;
  private textDisplay: Text;
  private overflowIndicator: Text;
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

  // Height clamping — canvas is 800x450; keep bubble within viewport
  private readonly MAX_BUBBLE_HEIGHT: number;
  private readonly LINE_HEIGHT: number;
  private readonly MIN_HEIGHT: number;

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

  private readonly MAX_WIDTH: number;
  private readonly PADDING: number;
  private readonly TAIL_HEIGHT: number;
  private readonly BORDER_OUTER = 2;
  private readonly BORDER_INNER = 1;
  private readonly CORNER_RADIUS = 4; // tight pixel-art corners

  constructor() {
    super();
    this.visible = false;

    // Detect mobile and scale up text/bubble for readability
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const s = isMobile ? 1.5 : 1;

    this.MAX_WIDTH = Math.round(420 * (isMobile ? 1.3 : 1));
    this.PADDING = Math.round(12 * s);
    this.TAIL_HEIGHT = Math.round(10 * s);
    this.MAX_BUBBLE_HEIGHT = Math.round(280 * (isMobile ? 1.2 : 1));
    this.LINE_HEIGHT = Math.round(16 * s);
    this.MIN_HEIGHT = Math.round(50 * s);

    const fontSize = Math.round(11 * s);

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
        fontSize,
        fill: 0x3a2e22,
        wordWrap: true,
        wordWrapWidth: this.MAX_WIDTH - this.PADDING * 2,
        lineHeight: this.LINE_HEIGHT,
        letterSpacing: 0.2,
      }),
    });
    this.addChild(this.textDisplay);

    // Clip mask for text (prevents overflow when text exceeds bubble height)
    // Overflow indicator — "..." at the top of the bubble when text is clipped
    this.overflowIndicator = new Text({
      text: '...',
      style: new TextStyle({
        fontFamily: '"DM Mono", "Courier New", monospace',
        fontSize: Math.round(10 * s),
        fill: 0x8a7a66,
        fontWeight: 'bold',
        letterSpacing: 1.5,
      }),
    });
    this.overflowIndicator.visible = false;
    this.overflowIndicator.alpha = 0.7;
    this.addChild(this.overflowIndicator);

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
      this.textDisplay.text = this.fullText;
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
    this.scale.set(1);
    this.animState = 'idle';

    // In the live session, stream chunks can arrive before the next ticker
    // pass. Draw immediately so the bubble never gets stuck in a stale state.
    this.layout();
    this.dirty = false;
  }

  /** Replace the bubble text in-place without hiding/showing. */
  replaceText(text: string): void {
    this.fullText = text;
    this.textDisplay.text = text;
    this.dirty = true;
    if (this.visible) {
      this.layout();
      this.dirty = false;
    }
  }

  appendText(chunk: string): void {
    this.fullText += chunk;

    // If we were showing dots, switch to text
    if (this.showingDots) {
      this.showingDots = false;
      this.typingDots.visible = false;
      this.textDisplay.visible = true;
    }

    this.textDisplay.text = this.fullText;
    this.dirty = true;

    if (this.visible) {
      this.layout();
      this.dirty = false;
    }
  }

  finishStreaming(): void {
    this.isStreaming = false;
    this.showingDots = false;
    this.typingDots.visible = false;
    // Ensure final text is displayed
    if (this.fullText.length > 0) {
      this.textDisplay.text = this.fullText;
      this.textDisplay.visible = true;
      this.dirty = true;
      if (this.visible) {
        this.layout();
        this.dirty = false;
      }
    }
  }

  hide(): void {
    if (!this.visible) {
      this.resetState();
      return;
    }
    this.resetState();
    this.visible = false;
    this.scale.set(1);
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
    this.overflowIndicator.visible = false;
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
    (this.overflowIndicator.style as TextStyle).fill = s.dotColor;
  }

  /** Draw (or redraw) the tail triangle for the current mode */
  private drawTail(): void {
    const s = SpeechBubble.STYLES[this.mode];

    // Tail border (slightly larger, drawn behind)
    this.tailBorder.clear();
    const borderPad = this.BORDER_OUTER;

    // The tail fill extends 3px UP into the bubble body to cover the
    // outer border line where the tail meets the bubble bottom edge.
    const overlap = 3;

    if (this.mode === 'question') {
      // Question tail: slightly offset left
      this.tailBorder.moveTo(-11 - borderPad, 0)
        .lineTo(-2, this.TAIL_HEIGHT + 3 + borderPad)
        .lineTo(7 + borderPad, 0)
        .closePath()
        .fill({ color: s.tailBorder });

      this.tail.clear();
      this.tail.moveTo(-9, -overlap)
        .lineTo(-2, this.TAIL_HEIGHT + 2)
        .lineTo(5, -overlap)
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
      this.tail.moveTo(-7, -overlap)
        .lineTo(0, this.TAIL_HEIGHT + 1)
        .lineTo(7, -overlap)
        .closePath()
        .fill({ color: s.tailColor });
    }
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
      this.overflowIndicator.visible = false;
      return;
    }

    const style = this.textDisplay.style as TextStyle;
    const fullMetrics = CanvasTextMetrics.measureText(this.fullText || ' ', style);
    const fullLines = fullMetrics.lines.length > 0 ? fullMetrics.lines : [''];

    // Compute the maximum text area height:
    // 1. Hard cap: MAX_BUBBLE_HEIGHT minus padding and tail
    // 2. Position cap: don't extend above the canvas top (y=0); leave 8px margin
    const hardMaxTextH = this.MAX_BUBBLE_HEIGHT - this.PADDING * 2 - this.TAIL_HEIGHT;
    const availableAbove = this.position.y - 8 - this.PADDING * 2 - this.TAIL_HEIGHT;
    const positionMaxTextH = Math.max(this.MIN_HEIGHT - this.PADDING * 2, availableAbove);
    const maxTextH = Math.min(hardMaxTextH, positionMaxTextH);
    const maxVisibleLines = Math.max(1, Math.floor(maxTextH / this.LINE_HEIGHT));
    const isOverflowing = fullLines.length > maxVisibleLines;
    const visibleLines = isOverflowing
      ? fullLines.slice(fullLines.length - maxVisibleLines)
      : fullLines;
    const visibleText = visibleLines.join('\n') || ' ';
    const visibleMetrics = CanvasTextMetrics.measureText(visibleText, style);
    const textW = Math.min(Math.max(visibleMetrics.width + this.PADDING * 2, 60), this.MAX_WIDTH);
    const textH = Math.max(this.MIN_HEIGHT, visibleMetrics.height + this.PADDING * 2);

    this.textDisplay.text = visibleText;
    this.textDisplay.position.set(
      -textW / 2 + this.PADDING,
      -this.TAIL_HEIGHT - textH + this.PADDING
    );

    // Show "..." overflow indicator at top of bubble when text is clipped
    if (isOverflowing) {
      this.overflowIndicator.visible = true;
      // Position at the top-center of the bubble text area
      const indicatorX = -this.overflowIndicator.width / 2;
      const indicatorY = -this.TAIL_HEIGHT - textH + this.PADDING - 1;
      this.overflowIndicator.position.set(indicatorX, indicatorY);
    } else {
      this.overflowIndicator.visible = false;
    }

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

  update(delta: number): void {
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
      this.dotTime += delta * 0.016; // scale dot motion with the ticker delta
      this.drawTypingDots();
    }

    // Layout when dirty
    if (this.dirty && this.visible) {
      this.layout();
      this.dirty = false;
    }
  }
}
