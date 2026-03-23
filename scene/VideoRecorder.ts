// Preferred mime types in order — MP4 for broad playback, WebM as fallback
const MIME_PREFERENCES = [
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function pickMimeType(): string {
  for (const mime of MIME_PREFERENCES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ''; // Let browser pick default
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recording = false;
  private mimeType = '';

  start(canvas: HTMLCanvasElement) {
    const stream = canvas.captureStream(30);
    this.mimeType = pickMimeType();

    const options: MediaRecorderOptions = {};
    if (this.mimeType) options.mimeType = this.mimeType;

    this.mediaRecorder = new MediaRecorder(stream, options);
    // Store the actual mime type the recorder chose
    this.mimeType = this.mediaRecorder.mimeType;

    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(1000);
    this.recording = true;
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.recording) {
        resolve(new Blob([], { type: this.mimeType || 'video/webm' }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'video/webm' });
        this.chunks = [];
        this.recording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /** File extension matching the recorded format */
  get extension(): string {
    return this.mimeType.includes('mp4') ? 'mp4' : 'webm';
  }

  get isRecording(): boolean {
    return this.recording;
  }
}
