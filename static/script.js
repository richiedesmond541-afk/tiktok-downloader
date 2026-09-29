const urlInput = document.getElementById("url");
const downloadBtn = document.getElementById("downloadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("status");
const resultBox = document.getElementById("result");

const historyCard = document.getElementById("historyCard");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

function loadHistory() {
    const history = JSON.parse(localStorage.getItem("tiktokHistory") || "[]");

    if (!history.length) {
        historyCard.hidden = true;
        return;
    }

    historyCard.hidden = false;

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item">
            <div class="history-info">
                <strong>TikTok Video ${index + 1}</strong>
                <small>${item.date}</small>
            </div>

            <a href="${item.download}" target="_blank" rel="noopener" download>
                Download
            </a>
        </div>
    `).join("");
}

function saveHistory(url, download) {
    const history = JSON.parse(localStorage.getItem("tiktokHistory") || "[]");

    history.unshift({
        url: url,
        download: download,
        date: new Date().toLocaleString()
    });

    localStorage.setItem(
        "tiktokHistory",
        JSON.stringify(history.slice(0, 10))
    );

    loadHistory();
}

clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("tiktokHistory");
    loadHistory();
});

loadHistory();


pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();

        if (!text) {
            statusBox.textContent = "Your clipboard is empty.";
            return;
        }

        urlInput.value = text;
        statusBox.textContent = "TikTok link pasted.";
    } catch (error) {
        statusBox.textContent =
            "Paste permission was blocked. Paste the link manually.";
    }
});

clearBtn.addEventListener("click", () => {
    urlInput.value = "";
    statusBox.textContent = "";
    resultBox.innerHTML = "";
    urlInput.focus();
});

downloadBtn.addEventListener("click", async () => {

    const url = urlInput.value.trim();

    resultBox.innerHTML = "";

    if (!url) {
        statusBox.textContent =
            "Please paste a TikTok link first.";
        return;
    }

    downloadBtn.disabled = true;
    pasteBtn.disabled = true;
    downloadBtn.textContent = "Processing...";
    statusBox.textContent = "Finding the best available video...";

    try {

        const response = await fetch("/api/download", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!data.success) {
            statusBox.textContent =
                data.error || "Unable to process this video.";
            return;
        }

        statusBox.textContent =
            `${data.label || "Video"} — Your download is ready.`;

        const downloadUrl =
            `/api/download-file?url=${encodeURIComponent(data.video_token)}`;

        resultBox.innerHTML = `
            <a
                href="${downloadUrl}"
                target="_blank"
                rel="noopener"
                class="download-link"
                download
            >
                ↓ Download Video
            </a>

            <div class="result-actions">
                <button type="button" id="copyLinkBtn">
                    📋 Copy Link
                </button>

                <button type="button" id="shareBtn">
                    ↗ Share
                </button>
            </div>
        `;

        const copyLinkBtn = document.getElementById("copyLinkBtn");
        const shareBtn = document.getElementById("shareBtn");

        copyLinkBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                copyLinkBtn.textContent = "✓ Copied";
                setTimeout(() => {
                    copyLinkBtn.textContent = "📋 Copy Link";
                }, 1800);
            } catch {
                copyLinkBtn.textContent = "Copy failed";
            }
        });

        shareBtn.addEventListener("click", async () => {
            if (!navigator.share) {
                statusBox.textContent =
                    "Sharing isn't supported in this browser.";
                return;
            }

            try {
                await navigator.share({
                    title: "TikTok Downloader",
                    text: "Download TikTok videos without a watermark.",
                    url: window.location.href
                });
            } catch (error) {
                if (error.name !== "AbortError") {
                    statusBox.textContent = "Unable to open sharing.";
                }
            }
        });

        saveHistory(url, downloadUrl);

    } catch (error) {

        console.error(error);

        statusBox.textContent =
            "Could not connect to the downloader.";

    } finally {

        downloadBtn.disabled = false;
        pasteBtn.disabled = false;
        downloadBtn.textContent = "Download Video";

    }
});

/* App Boot */
window.addEventListener("load", () => {
    const bootScreen = document.getElementById("bootScreen");
    const bootText = document.getElementById("bootText");

    if (!bootScreen) return;

    setTimeout(() => {
        if (bootText) bootText.textContent = "Ready";
    }, 900);

    setTimeout(() => {
        bootScreen.classList.add("hide");
    }, 1500);
});
