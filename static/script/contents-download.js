async function contentsDownload() {
  const downloadIcon = document.querySelector(
    "#contents > .info-box > .top > header > .right > img"
  );
  try {
    if (downloadIcon) downloadIcon.classList.add("kf-spin");

    const contents = await getSetting("contents");
    const hash = contents?.hash;
    if (!hash) throw new Error("No document hash found");

    const response = await capi({
      method: "GET",
      url: `/${hash}/download`,
      rowResponse: true,
    });

    // Create a blob from the text content
    const blob = new Blob([response.data], {
      type: "text/plain; charset=utf-8",
    });

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers["content-disposition"];
    let filename;
    if (contentDisposition) {
      // Handle RFC 5987 encoded filename
      const matches = /filename\*=UTF-8''([^;]+)/.exec(contentDisposition);
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1]);
      } else {
        // Fallback to regular filename
        const regularMatches = /filename="([^"]+)"/.exec(contentDisposition);
        if (regularMatches && regularMatches[1]) {
          filename = regularMatches[1];
        }
      }
    }
    if (!filename) {
      filename = `${hash}.txt`;
    }

    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (e) {
    console.error("Download failed:", e);
    if (e.message === "Unauthorized") {
      // Handle unauthorized case
    } else {
      alert("다운로드 중 오류가 발생했습니다.");
    }
  } finally {
    if (downloadIcon) downloadIcon.classList.remove("kf-spin");
  }
}
