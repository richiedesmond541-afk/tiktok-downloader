const urlInput = document.getElementById("url");
const downloadBtn = document.getElementById("downloadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("status");
const resultBox = document.getElementById("result");

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
            "No-watermark video found. Your download is ready.";

        resultBox.innerHTML = `
            <a
                href="/api/download-file?url=${encodeURIComponent(data.video_token)}"
                target="_blank"
                rel="noopener"
                class="download-link"
                download
            >
                ⬇ Download No-Watermark Video
            </a>
        `;

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
