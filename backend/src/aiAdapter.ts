import type { AudioMetadata, ClientMessage } from "./protocol.js";

export interface AiAdapter {
  process(message: ClientMessage): unknown[];
}

export class LocalStreamingAdapter implements AiAdapter {
  private readonly transcript: string[] = [];

  process(message: ClientMessage): unknown[] {
    if (message.type === "start") {
      this.transcript.length = 0;
      return [{ type: "status", status: "processing" }];
    }
    if (message.type === "stop") {
      return [{ type: "status", status: "ended" }];
    }
    const segment = this.segmentFromAudio(message.metadata, message.sequence);
    this.transcript.push(segment.text);
    this.transcript.splice(0, Math.max(0, this.transcript.length - 12));
    return [
      { type: "transcript", segment },
      {
        type: "suggestion",
        suggestion: {
          id: `sg-${message.sequence}`,
          kind: message.sequence % 2 === 0 ? "directResponse" : "clarifyingQuestion",
          text:
            message.sequence % 2 === 0
              ? "Confirme o entendimento e proponha o proximo passo."
              : "Pergunte qual criterio deve guiar a decisao agora.",
          confidence: 0.71,
          createdAtMs: Date.now(),
        },
      },
    ];
  }

  private segmentFromAudio(metadata: AudioMetadata, sequence: number) {
    return {
      id: `tr-${sequence}`,
      text:
        metadata.rms > 0.02
          ? "Transcricao parcial recebida em fluxo continuo pelo backend."
          : "Janela atual sem fala relevante.",
      isFinal: sequence % 8 === 0,
      startedAtMs: Date.now() - metadata.durationMs,
      updatedAtMs: Date.now(),
    };
  }
}
