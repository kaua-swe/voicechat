import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { LocalStreamingAdapter } from "./aiAdapter.js";
import { validateClientMessage } from "./protocol.js";
import { sanitizeLog } from "./security.js";

const websocketGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const maxFrameBytes = 64 * 1024;

export function handleWebSocket(req: IncomingMessage, socket: Duplex) {
  const key = req.headers["sec-websocket-key"];
  if (typeof key !== "string") {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1").update(key + websocketGuid).digest("base64");
  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n",
    ].join("\r\n"),
  );

  const adapter = new LocalStreamingAdapter();
  let buffer = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    try {
      let decoded;
      while ((decoded = decodeFrame(buffer))) {
        buffer = buffer.subarray(decoded.consumed);
        if (decoded.opcode === 0x8) {
          socket.end();
          return;
        }
        if (decoded.opcode !== 0x1) {
          continue;
        }
        const parsed = JSON.parse(decoded.payload.toString("utf8"));
        const message = validateClientMessage(parsed);
        for (const response of adapter.process(message)) {
          sendText(socket, JSON.stringify(response));
        }
      }
    } catch (error) {
      sendText(socket, JSON.stringify({ type: "error", message: "invalid message" }));
      console.warn("voicechat websocket rejected", sanitizeLog(error));
    }
  });
}

function decodeFrame(buffer: Buffer): { opcode: number; payload: Buffer; consumed: number } | null {
  if (buffer.length < 2) return null;
  const first = buffer[0] ?? 0;
  const second = buffer[1] ?? 0;
  const opcode = first & 0x0f;
  const masked = (second & 0x80) !== 0;
  let length = second & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    throw new Error("large frames are not supported");
  }
  if (!masked) {
    throw new Error("client frames must be masked");
  }
  if (length > maxFrameBytes) {
    throw new Error("frame too large");
  }
  if (buffer.length < offset + 4 + length) return null;
  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;
  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  for (let i = 0; i < payload.length; i += 1) {
    payload[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0);
  }
  return { opcode, payload, consumed: offset + length };
}

function sendText(socket: Duplex, text: string) {
  const payload = Buffer.from(text, "utf8");
  const header = payload.length < 126 ? Buffer.from([0x81, payload.length]) : Buffer.alloc(4);
  if (payload.length >= 126) {
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

export function encodeClientTextFrame(text: string) {
  const payload = Buffer.from(text, "utf8");
  const mask = randomBytes(4);
  const header = payload.length < 126 ? Buffer.from([0x81, 0x80 | payload.length]) : Buffer.alloc(4);
  if (payload.length >= 126) {
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  const masked = Buffer.from(payload);
  for (let i = 0; i < masked.length; i += 1) {
    masked[i] = (masked[i] ?? 0) ^ (mask[i % 4] ?? 0);
  }
  return Buffer.concat([header, mask, masked]);
}
