import { EventEmitter } from 'events';

// ── Output Stream Manager ────────────────────────────────────────────
// Enables real-time stdout/stderr streaming from sandbox executions
// to the client via SSE. Keyed by chatId (one active stream per
// conversation since tool calls execute sequentially).
//
// NOTE: This uses in-memory state, so streaming works when the chat
// API route and the SSE route share the same process (local dev, or
// single-instance deployments). In serverless environments where
// routes run in separate instances, the client gracefully falls back
// to showing output only after execution completes.

export interface StreamChunk {
  type: 'stdout' | 'stderr';
  data: string;
}

class OutputStreamManager {
  private emitter = new EventEmitter();
  private buffers = new Map<string, StreamChunk[]>();
  private closedStreams = new Set<string>();

  /** Mark a new stream as active (resets any prior state for this id) */
  start(id: string): void {
    this.buffers.set(id, []);
    this.closedStreams.delete(id);
  }

  /** Push a chunk to the stream and notify subscribers */
  push(id: string, chunk: StreamChunk): void {
    let buffer = this.buffers.get(id);
    if (!buffer) {
      buffer = [];
      this.buffers.set(id, buffer);
    }
    buffer.push(chunk);
    this.emitter.emit(`chunk:${id}`, chunk);
  }

  /**
   * Subscribe to a stream. Buffered chunks are delivered immediately,
   * then new chunks arrive via `onChunk`. When the stream ends, `onDone`
   * fires. Returns an unsubscribe function.
   */
  subscribe(
    id: string,
    onChunk: (chunk: StreamChunk) => void,
    onDone: () => void,
  ): () => void {
    // Deliver any buffered chunks
    const buffer = this.buffers.get(id) ?? [];
    for (const chunk of buffer) {
      onChunk(chunk);
    }

    // If already closed, signal completion immediately
    if (this.closedStreams.has(id)) {
      onDone();
      return () => {};
    }

    const chunkHandler = (c: StreamChunk) => onChunk(c);
    const doneHandler = () => {
      this.emitter.off(`chunk:${id}`, chunkHandler);
      onDone();
    };

    this.emitter.on(`chunk:${id}`, chunkHandler);
    this.emitter.once(`close:${id}`, doneHandler);

    return () => {
      this.emitter.off(`chunk:${id}`, chunkHandler);
      this.emitter.off(`close:${id}`, doneHandler);
    };
  }

  /** Mark a stream as finished and schedule cleanup */
  end(id: string): void {
    this.closedStreams.add(id);
    this.emitter.emit(`close:${id}`);
    // Clean up buffer after 10 seconds
    setTimeout(() => {
      this.buffers.delete(id);
      this.closedStreams.delete(id);
    }, 10_000);
  }
}

export const outputManager = new OutputStreamManager();
