from flask import Flask, render_template, request, jsonify, Response
import re
import html
import json
import urllib.request
import urllib.error

app = Flask(__name__)

TT_HOSTS = (
    "tiktok.com",
    "vm.tiktok.com",
    "vt.tiktok.com"
)

API = "https://tiktokio.com/api/v1/tk/html"
PREFIX = "tiktokio.com"

API_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Linux; Android 13) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Mobile Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://tiktokio.com",
    "Referer": "https://tiktokio.com/",
}


def is_tiktok_url(url):
    return any(host in url.lower() for host in TT_HOSTS)


def call_tiktokio(url):
    payload = json.dumps({
        "vid": url,
        "prefix": PREFIX
    }).encode()

    req = urllib.request.Request(
        API,
        data=payload,
        method="POST"
    )

    for key, value in API_HEADERS.items():
        req.add_header(key, value)

    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read().decode("utf-8", "replace")


def parse_links(fragment):
    links = []
    seen = set()

    pattern = (
        r'<a\s+[^>]*?href\s*=\s*["\']'
        r'([^"\']+)["\'][^>]*?>(.*?)</a>'
    )

    for match in re.finditer(
        pattern,
        fragment,
        re.IGNORECASE | re.DOTALL
    ):
        url = html.unescape(match.group(1).strip())

        label = re.sub(
            r"<[^>]+>",
            "",
            match.group(2)
        )

        label = html.unescape(
            re.sub(r"\s+", " ", label)
        ).strip() or "Download"

        if "dl.tiktokio.com" in url and url not in seen:
            seen.add(url)
            links.append((label, url))

    return links


def find_best_link(links):
    preferences = (
        "no watermark",
        "without watermark",
        "HD"
    )

    for preference in preferences:
        for label, url in links:
            if (
                preference.lower() in label.lower()
                and "mp3" not in label.lower()
            ):
                return label, url

    for label, url in links:
        if "mp3" not in label.lower():
            return label, url

    return None, None


def get_video_url(tiktok_url):
    fragment = call_tiktokio(tiktok_url)
    links = parse_links(fragment)

    if not links:
        raise ValueError("No downloadable video was found.")

    label, video_url = find_best_link(links)

    if not video_url:
        raise ValueError("No video download link was available.")

    return label, video_url


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/download", methods=["POST"])
def download():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url:
        return jsonify({
            "success": False,
            "error": "Please enter a TikTok URL."
        }), 400

    if not is_tiktok_url(url):
        return jsonify({
            "success": False,
            "error": "Please enter a valid TikTok URL."
        }), 400

    try:
        label, video_url = get_video_url(url)

        return jsonify({
            "success": True,
            "label": label,
            "download_endpoint": "/api/download-file",
            "video_token": video_url
        })

    except urllib.error.HTTPError as error:
        return jsonify({
            "success": False,
            "error": f"Extraction service returned HTTP {error.code}."
        }), 502

    except Exception as error:
        print("Download error:", repr(error))

        return jsonify({
            "success": False,
            "error": "Unable to process this TikTok video."
        }), 500


@app.route("/api/download-file")
def download_file():
    video_url = request.args.get("url", "").strip()

    if not video_url:
        return "Missing video URL.", 400

    if not video_url.startswith("https://dl.tiktokio.com/"):
        return "Invalid download source.", 400

    try:
        req = urllib.request.Request(
            video_url,
            headers={
                "User-Agent": API_HEADERS["User-Agent"],
                "Referer": "https://tiktokio.com/"
            }
        )

        response = urllib.request.urlopen(req, timeout=180)

        def stream():
            try:
                while True:
                    chunk = response.read(64 * 1024)

                    if not chunk:
                        break

                    yield chunk
            finally:
                response.close()

        return Response(
            stream(),
            mimetype="video/mp4",
            headers={
                "Content-Disposition":
                    'attachment; filename="tiktok-video.mp4"'
            }
        )

    except Exception as error:
        print("Video proxy error:", repr(error))
        return "Unable to download video.", 502


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
