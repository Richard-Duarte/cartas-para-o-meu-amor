#!/usr/bin/env python3
"""Conservative edge-key: keep the whole figurine, only drop studio backdrop."""

from pathlib import Path
import subprocess
import numpy as np
from PIL import Image

CREAM = np.array([243.0, 230.0, 216.0], np.float32)
FLOOR = np.array([172.0, 170.0, 166.0], np.float32)

VIDEOS = {
    "pigeon": "/workspace/artifacts/imagine_videos/01767e84-d098-46fb-8101-e729e8b2cbcf.mp4",
    "horse": "/workspace/artifacts/imagine_videos/faf7b87a-6365-43b3-bf10-64688938a6cc.mp4",
    "donkey": "/workspace/artifacts/imagine_videos/671585b3-a1bd-4ad8-aab0-2a518a2eced6.mp4",
    "stork": "/workspace/artifacts/imagine_videos/e84dd761-3c1d-4b27-8926-0682d12cf9ed.mp4",
    "swan": "/workspace/artifacts/imagine_videos/4f3aa2ab-4d27-4b81-be83-6ffbadb82563.mp4",
    "turtle": "/workspace/artifacts/imagine_videos/268b7d5a-97e5-46ea-b49c-f2399548332d.mp4",
    "plane": "/workspace/artifacts/imagine_videos/80adda4d-fe06-45c0-9fd8-6c3fe042c28a.mp4",
}
ARRIVE = {
    "pigeon": "/workspace/artifacts/imagine_videos/815346ad-7098-4446-b908-81782ea46f98.mp4",
    "horse": "/workspace/artifacts/imagine_videos/dd0e0e97-cfea-41b3-b152-bfe8c259fdf1.mp4",
    "donkey": "/workspace/artifacts/imagine_videos/4355cdf7-b6c1-4240-a704-943dfc2137d3.mp4",
    "stork": "/workspace/artifacts/imagine_videos/94a0ea8b-18d1-4f8c-8193-04b235226a37.mp4",
    "swan": "/workspace/artifacts/imagine_videos/53fa772d-784d-4234-9679-f674c6256962.mp4",
    "turtle": "/workspace/artifacts/imagine_videos/39dad6ca-d0f8-41db-b6e6-f28ac542b813.mp4",
    "plane": "/workspace/artifacts/imagine_videos/6d0f21e2-5af0-4898-a8cd-aed91d14471a.mp4",
}


def dilate(mask: np.ndarray, steps: int = 1) -> np.ndarray:
    out = mask
    for _ in range(steps):
        n = out.copy()
        n[1:] |= out[:-1]
        n[:-1] |= out[1:]
        n[:, 1:] |= out[:, :-1]
        n[:, :-1] |= out[:, 1:]
        out = n
    return out


def flood(like: np.ndarray) -> np.ndarray:
    mask = np.zeros_like(like, dtype=bool)
    mask[0] = True
    mask[-1] = True
    mask[:, 0] = True
    mask[:, -1] = True
    mask &= like
    for _ in range(640):
        n = dilate(mask, 1) & like
        if n.sum() == mask.sum():
            break
        mask = n
    return mask


def center_protect(h: int, w: int, rx=0.38, ry=0.42) -> np.ndarray:
    yy, xx = np.ogrid[:h, :w]
    cy, cx = (h - 1) / 2.0, (w - 1) / 2.0
    return ((yy - cy) / (ry * h)) ** 2 + ((xx - cx) / (rx * w)) ** 2 <= 1.0


def key_frame(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    rgb = np.array(im, dtype=np.float32)
    h, w, _ = rgb.shape
    sat = rgb.max(-1) - rgb.min(-1)
    mean = rgb.mean(-1)
    d_cream = np.sqrt(((rgb - CREAM) ** 2).sum(-1))
    d_floor = np.sqrt(((rgb - FLOOR) ** 2).sum(-1))
    protect = center_protect(h, w)

    pale = (d_cream < 30) & (sat < 28)
    very_pale = (mean > 214) & (sat < 16) & (d_cream < 42)
    trans = flood(pale | very_pale)
    trans &= ~protect

    floor = (d_floor < 36) & (sat < 22) & (np.indices((h, w))[0] > h * 0.52) & ~protect
    trans |= flood(trans | floor) & floor

    keep = ~trans
    keep = dilate(keep, 3)
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    a = alpha.astype(np.float32)
    p = np.pad(a, 1, mode="edge")
    a = (p[1:-1, 1:-1] * 2 + p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 6.0
    alpha = np.clip(a, 0, 255).astype(np.uint8)

    out = np.dstack([np.array(im.convert("RGB")), alpha])
    out[alpha == 0, :3] = 0
    return Image.fromarray(out, "RGBA")


def extract(src: str, tmp: Path) -> None:
    tmp.mkdir(exist_ok=True)
    for f in tmp.glob("*"):
        f.unlink()
    vf = (
        "fps=10,scale=176:176:force_original_aspect_ratio=decrease,"
        "pad=220:220:(ow-iw)/2:(oh-ih)/2:color=0xF3E6D8"
    )
    subprocess.check_call(
        ["ffmpeg", "-y", "-i", src, "-vf", vf, str(tmp / "%03d.png")],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def save_webp(frames: list[Image.Image], dest: Path) -> None:
    frames[0].save(
        dest,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=100,
        loop=0,
        lossless=False,
        quality=82,
        method=4,
    )


def process(name: str, src: str, dest: Path, qc: Path) -> None:
    tmp = Path(f"/tmp/keyfix-{dest.stem}")
    extract(src, tmp)
    frames = [key_frame(Image.open(p)) for p in sorted(tmp.glob("*.png"))]
    save_webp(frames, dest)
    bg = Image.new("RGBA", frames[0].size, (46, 140, 92, 255))
    bg.alpha_composite(frames[min(12, len(frames) - 1)])
    qc.parent.mkdir(parents=True, exist_ok=True)
    bg.save(qc)
    print(dest.name, round(dest.stat().st_size / 1024), "kb", len(frames))


def main() -> None:
    out = Path("/workspace/public/messengers")
    qc_dir = Path("/workspace/screenshots/gifs")
    for name, src in VIDEOS.items():
        process(name, src, out / f"{name}.webp", qc_dir / f"{name}-fix.png")
    for name, src in ARRIVE.items():
        process(name, src, out / f"{name}-arrive.webp", qc_dir / f"{name}-arrive-fix.png")


if __name__ == "__main__":
    main()
