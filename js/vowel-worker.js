// Vowel check, the listening part (a module worker, so the page stays smooth while it thinks).
// A small Whisper model trained on Quran recitation writes Arabic WITH vowel marks. It is not asked to write what it hears:
// the word on the screen is known, so it only says how well the recording fits the word and each of its wrong-vowel
// variants. Everything runs on this device; the recording goes nowhere.
import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;
const MODEL = 'YunusZJ/whisper-base-ar-quran-ONNX'; // Apache-2.0; from tarteel-ai/whisper-base-ar-quran
let asr = null, device = '';

async function load() {
  let gpu = false;
  try { gpu = !!(self.navigator && navigator.gpu && await navigator.gpu.requestAdapter()); } catch (e) {}
  device = gpu ? 'webgpu' : 'wasm';
  const sizes = {};
  asr = await pipeline('automatic-speech-recognition', MODEL, {
    dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' }, device,
    progress_callback: (p) => {
      if (p.status !== 'progress' || !p.total) return;
      sizes[p.file] = [p.loaded, p.total];
      let got = 0, all = 0;
      for (const k in sizes) { got += sizes[k][0]; all += sizes[k][1]; }
      self.postMessage({ type: 'progress', got, all });
    },
  });
  self.postMessage({ type: 'ready', device });
}

// how well does the recording fit each candidate spelling? (log-probability of the whole word, higher = better)
async function score(audio, cands) {
  const tok = asr.tokenizer, feats = await asr.processor(audio);
  const id = (t) => tok.model.tokens_to_ids.get(t);
  const sp = ['<|startoftranscript|>', '<|ar|>', '<|transcribe|>', '<|notimestamps|>'].map(id), eot = id('<|endoftext|>');
  // listen once, then try every candidate against what was heard
  const encOut = await asr.model.sessions['model'].run({ input_features: feats.input_features.ort_tensor });
  const enc = new Tensor(encOut.last_hidden_state);
  const all = cands.map((c) => { const txt = tok.encode(c, { add_special_tokens: false }); return { c, ids: [...sp, ...txt, eot] }; });
  const L = Math.max(...all.map((x) => x.ids.length)) - 1, N = all.length;
  const inp = new BigInt64Array(N * L).fill(BigInt(eot));
  all.forEach((x, r) => x.ids.slice(0, -1).forEach((v, t) => { inp[r * L + t] = BigInt(v); }));
  // Whisper always takes a 30 s window (1500 frames, 50 a second): keep only the part with the voice, plus a second
  const H = enc.dims[2], F = Math.min(enc.dims[1], Math.ceil(audio.length / 16000 * 50) + 50);
  const ed = enc.data.subarray(0, F * H), encN = new Float32Array(ed.length * N);
  for (let r = 0; r < N; r++) encN.set(ed, r * ed.length);
  const out = await asr.model({ encoder_outputs: new Tensor('float32', encN, [N, F, H]), decoder_input_ids: new Tensor('int64', inp, [N, L]) });
  const V = out.logits.dims[2], data = out.logits.data;
  return all.map((x, r) => {
    let lp = 0;
    for (let t = sp.length - 1; t < x.ids.length - 1; t++) { // position t predicts ids[t + 1]
      const row = data.subarray((r * L + t) * V, (r * L + t + 1) * V);
      let mx = -Infinity; for (let j = 0; j < V; j++) if (row[j] > mx) mx = row[j];
      let s = 0; for (let j = 0; j < V; j++) s += Math.exp(row[j] - mx);
      lp += row[x.ids[t + 1]] - mx - Math.log(s);
    }
    return { c: x.c, lp };
  });
}

let chain = Promise.resolve();
self.onmessage = (e) => {
  const m = e.data;
  chain = chain.then(async () => {
    try {
      if (m.type === 'load') { if (!asr) await load(); else self.postMessage({ type: 'ready', device }); }
      if (m.type === 'score') {
        const t0 = performance.now();
        const res = await score(m.audio, m.cands);
        self.postMessage({ type: 'result', id: m.id, res, ms: Math.round(performance.now() - t0) });
      }
    } catch (err) {
      self.postMessage({ type: 'error', id: m.id, message: String(err && err.message || err) });
    }
  });
};
