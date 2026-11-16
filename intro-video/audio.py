"""
Synthesised soundtrack for the BPL-2027 intro (45 s, 48 kHz stereo) -> audio.wav.
Floodlight clunks, slams, a bat-on-ball crack, whooshes, a 120 BPM broadcast
beat and stadium crowd swells. No samples, no downloads.
"""
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR, DUR = 48000, 45.0
N = int(SR * DUR)
rng = np.random.default_rng(2027)
mix = np.zeros((N, 2))


def t_arr(sec):
    return np.arange(int(sec * SR)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    mix[i:i + len(sig), 0] += sig * gain * l
    mix[i:i + len(sig), 1] += sig * gain * r


def filt(x, kind, f):
    return sosfilt(butter(4, f, kind, fs=SR, output='sos'), x)


def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def kick(dur=0.45, f0=120, f1=42, gain=1.0):
    t = t_arr(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = filt(rng.standard_normal(len(t)), 'highpass', 2500) * np.exp(-t * 250) * 0.25
    return (np.sin(ph) * np.exp(-t * 7) + click) * gain


def boom(dur=2.2):
    t = t_arr(dur)
    f = 30 + 70 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    noise = filt(rng.standard_normal(len(t)), 'lowpass', 900) * np.exp(-t * 5) * 0.6
    return sub + noise


def hat(dur=0.08):
    t = t_arr(dur)
    return filt(rng.standard_normal(len(t)), 'highpass', 7000) * np.exp(-t * 60)


def clunk():
    """Floodlight contactor: metallic clack plus a low thump and hum."""
    t = t_arr(0.9)
    clack = filt(rng.standard_normal(len(t)), 'bandpass', [1800, 4200]) * np.exp(-t * 70)
    thump = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 9)
    hum = np.sin(2 * np.pi * 100 * t) * 0.08 * np.minimum(1, t * 6) * np.exp(-t * 2)
    return clack * 0.9 + thump * 0.8 + hum


def crack():
    """Bat-on-ball / ball-on-stumps: sharp wooden transient with a ringing body."""
    t = t_arr(0.6)
    tr = filt(rng.standard_normal(len(t)), 'highpass', 1500) * np.exp(-t * 120)
    body = (np.sin(2 * np.pi * 1150 * t) * 0.5 + np.sin(2 * np.pi * 1730 * t) * 0.3) * np.exp(-t * 28)
    return tr + body


def whoosh(dur=0.9, up=True):
    t = t_arr(dur)
    n = rng.standard_normal(len(t))
    shape = np.sin(np.pi * t / dur) ** 2
    lo = filt(n, 'bandpass', [400, 1600]) * shape
    hi = filt(n, 'bandpass', [1600, 6000]) * (t / dur if up else 1 - t / dur) * shape
    return lo * 0.7 + hi * 0.6


def crowd(dur, peak_at, rise=1.5, fall=3.0):
    t = t_arr(dur)
    n = filt(rng.standard_normal(len(t)), 'bandpass', [250, 2500])
    n += filt(rng.standard_normal(len(t)), 'bandpass', [600, 3500]) * 0.5
    e = np.where(t < peak_at, (t / peak_at) ** 2, np.exp(-(t - peak_at) / fall))
    wob = 1 + 0.25 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t)
    return n * e * wob


def riser(dur):
    t = t_arr(dur)
    f = 200 + 1800 * (t / dur) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    n = filt(rng.standard_normal(len(t)), 'highpass', 3000) * (t / dur) ** 3 * 0.5
    return (tone + n) * (t / dur)


# ---- Scene 1: dark drone, four floodlights, two slams
t = t_arr(8.2)
drone = (np.sin(2 * np.pi * 41 * t) + 0.5 * np.sin(2 * np.pi * 61.5 * t)) * np.minimum(1, t / 2) * 0.18
add(drone, 0, 1.0)
for i, at in enumerate([0.5, 1.15, 1.75, 2.3]):
    add(clunk(), at, 0.55, pan=[-0.7, -0.3, 0.3, 0.7][i])
add(riser(0.9), 2.1, 0.7)
add(boom(), 3.0, 0.9)
add(kick(gain=0.8), 3.0)
add(riser(1.2), 4.1, 0.6)
add(boom(), 5.3, 0.8)
add(boom(), 5.95, 0.9)
add(riser(1.6), 6.6, 0.8)

# ---- Scene 2: whoosh, crack, logo boom, beat starts
add(whoosh(1.15), 8.2, 0.9, pan=-0.4)
add(crack(), 9.35, 1.1)
add(boom(3.0), 9.35, 1.0)
add(crowd(6.5, 1.2, fall=2.8), 9.3, 0.35)

BPM = 120
beat = 60 / BPM
start, end = 9.35, 37.9
k = 0
tt = start
while tt < end:
    add(kick(gain=0.75), tt)
    if k % 2 == 1:
        add(filt(rng.standard_normal(int(0.18 * SR)), 'bandpass', [900, 4000])
            * np.exp(-t_arr(0.18) * 22), tt, 0.32)  # clap/snare on 2 and 4
    add(hat(), tt + beat / 2, 0.22, pan=0.3)
    # sub bass pulse following the kick
    sb = np.sin(2 * np.pi * 55 * t_arr(beat * 0.9)) * env(int(beat * 0.9 * SR), 0.01, 0.25)
    add(sb, tt, 0.35)
    k += 1
    tt += beat

# ---- Scene 3 and 4 accents
for at in (16.0, 22.4, 28.0):
    add(whoosh(0.8), at - 0.2, 0.7, pan=0.5 if at == 22.4 else -0.5)
for i in range(12):  # badge pops
    add(filt(rng.standard_normal(int(0.05 * SR)), 'bandpass', [2000, 5000])
        * np.exp(-t_arr(0.05) * 80), 17.0 + (i // 6) * 0.25 + (i % 6) * 0.18, 0.4)
add(crack(), 28.48, 1.0)  # the six
add(crowd(4.0, 0.8, fall=1.6), 28.5, 0.45)
add(whoosh(0.55), 31.4, 0.8, pan=0.2)
add(crack(), 31.95, 1.0)  # yorker on the stumps
add(boom(1.6), 32.1, 0.7)
add(crowd(7.0, 1.4, fall=3.0), 34.6, 0.5)  # trophy roar
add(riser(1.6), 36.4, 0.7)

# ---- Scene 5: final hit, crowd, gentle tail
add(boom(3.5), 38.85, 1.1)
add(kick(gain=0.9), 38.85)
add(crowd(6.0, 1.0, fall=2.5), 38.6, 0.4)
t = t_arr(6.0)
pad = sum(np.sin(2 * np.pi * f * t) for f in (110, 164.8, 220, 277.2)) * 0.05
add(pad * np.minimum(1, t / 1.2) * np.exp(-t / 3.5), 39.0)

# master: soft clip, fade out, normalise
mix = np.tanh(mix * 0.9)
fade = np.ones(N)
fi = int(44.0 * SR)
fade[fi:] = np.linspace(1, 0, N - fi) ** 2
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio.wav')
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out)
