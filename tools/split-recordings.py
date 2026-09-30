"""Cuts one recording per story (recordings/<id>.wav, made from the texts in "Story texts for ChatGPT")
into the story's parts, questions and answers, and saves them as MP3 files in audio/ for the game.

How the cuts are found: every paragraph's length is known, so its expected end time is estimated from the
text lengths, and the best pause near that time is chosen (dynamic programming over all pauses).
Each piece's speaking speed is then checked against the story's average to catch a wrong cut.

Usage:  python tools/split-recordings.py            (all recordings)
        python tools/split-recordings.py yunus      (one story)
Needs numpy and ffmpeg.
"""
import json, os, re, shutil, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = shutil.which("ffmpeg") or "ffmpeg"


def load_stories():
    src = open(os.path.join(ROOT, "stories.js"), encoding="utf-8").read()
    node = subprocess.run(["node", "-e", "global.window={};eval(require('fs').readFileSync(0,'utf8'));"
                           "process.stdout.write(JSON.stringify({s:window.TALA_STORIES,u:window.TALA_UI}))"],
                          input=src.encode("utf-8"), capture_output=True, check=True)
    d = json.loads(node.stdout.decode("utf-8"))
    return d["s"], d["u"]


def pieces_for(sid, stories, ui):
    """(key, file, text) in the order they are read in the recording"""
    if sid == "owl":
        return [(k, "audio/ui/%s.mp3" % k[3:], t) for k, t in ui.items()]
    s = next(x for x in stories if x["id"] == sid)
    out = [("%s:p%d" % (sid, i), "audio/%s/p%d.mp3" % (sid, i), p[1]) for i, p in enumerate(s["p"]) if not isinstance(p[1], list)]
    for i, q in enumerate(s["q"]):
        out.append(("%s:q%d" % (sid, i), "audio/%s/q%d.mp3" % (sid, i), q["q"]))
        out.append(("%s:a%d" % (sid, i), "audio/%s/a%d.mp3" % (sid, i), "الإجابة: " + q["a"]))
    return out


def weight(text):
    return len(re.sub(r"[ً-ْٰ«»\s]", "", text)) + 6  # letters, plus a little for the breath at the end


def to_wav(path):
    if path.lower().endswith(".wav"):
        return path
    out = path + ".tmp.wav"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "24000", out], check=True)
    return out


def split(sid, stories, ui):
    rec = next((os.path.join(ROOT, "recordings", f) for f in os.listdir(os.path.join(ROOT, "recordings"))
                if os.path.splitext(f)[0].lower() == sid and not f.endswith(".tmp.wav")), None)
    if not rec:
        return None
    wav = to_wav(rec)
    w = wave.open(wav)
    sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32)
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    hop = int(sr * 0.02)
    db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1)) + 1e-9)
    quiet = db < np.percentile(db, 95) - 35
    loud = np.where(~quiet)[0]
    t0, t1 = loud[0] * 0.02, (loud[-1] + 1) * 0.02
    # pauses (runs of quiet frames of at least 0.25 s): candidate cut points
    cands, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        if (not q or i == len(quiet) - 1) and start is not None:
            dur = (i - start) * 0.02
            mid = (start + i) / 2 * 0.02
            if dur >= 0.25 and t0 < mid < t1:
                cands.append((mid, dur, start * 0.02, i * 0.02))
            start = None
    pieces = pieces_for(sid, stories, ui)
    ws = [weight(p[2]) for p in pieces]
    cum = np.cumsum(ws)[:-1] / sum(ws)
    expect = t0 + (t1 - t0) * cum
    K, M = len(expect), len(cands)
    if M < K:
        raise SystemExit("%s: only %d pauses for %d cuts" % (sid, M, K))
    # dynamic programming: choose K increasing pauses, close to the expected times, preferring long pauses
    sigma, lam = 3.0, 6.0
    cost = np.full((K, M), np.inf)
    back = np.zeros((K, M), dtype=int)
    ct = np.array([c[0] for c in cands])
    cd = np.array([c[1] for c in cands])
    for j in range(K):
        local = ((ct - expect[j]) / sigma) ** 2 - lam * np.minimum(cd, 2.5)
        if j == 0:
            cost[0] = local
            continue
        best, arg = np.inf, -1
        for m in range(M):
            if m > 0 and cost[j - 1, m - 1] < best:
                best, arg = cost[j - 1, m - 1], m - 1
            if arg >= 0:
                cost[j, m] = best + local[m]
                back[j, m] = arg
    m = int(np.argmin(cost[K - 1]))
    chosen = [m]
    for j in range(K - 1, 0, -1):
        m = back[j, m]
        chosen.append(m)
    chosen = chosen[::-1]
    # piece boundaries: from the end of the previous pause (keep 0.15 s) to the start of the next one (plus 0.25 s)
    bounds, prev = [], t0
    for c in chosen:
        _, _, ps, pe = cands[c]
        bounds.append((max(0, prev - 0.15), ps + 0.25))
        prev = pe
    bounds.append((max(0, prev - 0.15), min(n / sr, t1 + 0.3)))
    rate = sum(ws) / sum(b - a for a, b in bounds)
    report = []
    for (key, file, text), (a, b), wgt in zip(pieces, bounds, ws):
        r = wgt / (b - a) / rate
        report.append((key, round(a, 2), round(b - a, 2), round(r, 2), "" if 0.6 <= r <= 1.6 else "  <-- check"))
        out = os.path.join(ROOT, file)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", "%.3f" % a, "-t", "%.3f" % (b - a), "-i", wav,
                        "-af", "afade=t=in:d=0.05,areverse,afade=t=in:d=0.08,areverse", "-ac", "1", "-ar", "24000",
                        "-codec:a", "libmp3lame", "-b:a", "48k", out], check=True)
    if wav != rec:
        os.remove(wav)
    return report


def main():
    stories, ui = load_stories()
    ids = sys.argv[1:] or [s["id"] for s in stories] + ["owl"]
    for sid in ids:
        rep = split(sid, stories, ui)
        if rep is None:
            print("%s: no recording yet" % sid)
            continue
        bad = [r for r in rep if r[4]]
        print("%s: %d pieces, %d to check" % (sid, len(rep), len(bad)))
        for r in rep:
            print("   %-10s start %7.2f s  length %6.2f s  speed %.2f%s" % r)
    # the list the game reads: every piece that has a file
    files, voice = {}, "Gemini (Google AI Studio)"
    for s in stories + [{"id": "owl"}]:
        for key, file, _ in pieces_for(s["id"], stories, ui):
            if os.path.exists(os.path.join(ROOT, file)):
                files[key] = file
    with open(os.path.join(ROOT, "audio", "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"voice": voice, "ai": True, "files": files}, f, ensure_ascii=False, indent=1)
    print("audio/manifest.json lists %d files" % len(files))


if __name__ == "__main__":
    main()
