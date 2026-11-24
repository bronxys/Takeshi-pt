import assert from "node:assert/strict";
import { test } from "node:test";
import { proto } from "zapo-js";
import { createSocketAdapter } from "../services/wa.js";

function createClientSpy() {
  const calls = [];
  const client = {
    message: {
      async send(...args) {
        calls.push(args);
        return { id: "message-id", ack: 1 };
      },
    },
  };

  return { client, calls };
}

test("preserves the audio sticker wrapper and nested voice note on the wire", async () => {
  const { client, calls } = createClientSpy();
  const uploads = [];
  client.message.upload = async (source, options) => {
    uploads.push([source, options]);
    return { mimetype: options.mimetype };
  };
  const socket = createSocketAdapter(client);
  const jid = "5511999999999@s.whatsapp.net";
  const sample = Buffer.from("OggS");
  const result = await socket.sendAudioSticker(jid, "sticker.webp", sample);

  assert.deepStrictEqual(uploads, [
    [sample, { type: "ptt", mimetype: "audio/ogg; codecs=opus" }],
    ["sticker.webp", { type: "sticker", mimetype: "image/webp" }],
  ]);
  assert.strictEqual(result.key.id, "message-id");
  assert.strictEqual(calls.length, 1);

  const { Message } = proto;
  const decoded = Message.decode(Message.encode(calls[0][1]).finish());
  const [wrapper] = decoded.$unknowns;
  assert.deepStrictEqual([...wrapper.subarray(0, 3)], [0xb2, 0x08, wrapper.length - 3]);
  const inner = Message.FutureProofMessage.decode(wrapper.subarray(3)).message;
  const [audio] = inner.stickerMessage.$unknowns;
  assert.deepStrictEqual([...audio.subarray(0, 3)], [0xd2, 0x01, audio.length - 3]);
  assert.deepStrictEqual(decoded.stickerMessage.$unknowns, [audio]);
  assert.strictEqual(Message.AudioMessage.decode(audio.subarray(3)).ptt, true);
});
