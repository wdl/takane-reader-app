let uploadActiveNow = false;
let allowFiles = [];

function uploadPageLoad() {}

function uploadClose(event) {
  event.stopPropagation();
  loadState("list");
}

function uploadClick(event) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = "text/plain,application/x-zip-compressed";
  input.click();
  input.onchange = (event) => {
    uploadHandle(event.target.files);
  };
}

function uploadDrop(event) {
  const files = event.dataTransfer.files;

  uploadHandle(files);
}

async function uploadHandle(files) {
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!["text/plain", "application/x-zip-compressed"].includes(file.type)) {
        continue;
      }

      const key = `${Date.now()}_${file.lastModified}_${file.size}`;

      const table = document.querySelector("#upload > footer > table > tbody");

      const tr = document.createElement("tr");
      tr.dataset.key = key;

      const tdIcon = document.createElement("td");
      tdIcon.classList.add("icon");

      const imgIcon = document.createElement("img");
      if (file.type === "text/plain") {
        imgIcon.src = "/static/icon/file/TXT.png";
      } else {
        imgIcon.src = "/static/icon/file/ZIP.png";
      }

      tdIcon.append(imgIcon);

      let name = file.name.split(".");
      name.pop();

      const tdTitle = document.createElement("td");
      tdTitle.classList.add("title");
      tdTitle.innerText = name.join(".");

      const tdPercent = document.createElement("td");
      tdPercent.classList.add("percent");
      tdPercent.innerText = "대기중";

      tr.append(tdIcon, tdTitle, tdPercent);

      table.append(tr);

      allowFiles.push({
        key,
        file,
      });
    }

    uploadRun();
  } catch (e) {
    console.error(e);
    uploadError();
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

async function uploadRun() {
  if (uploadActiveNow) return;
  uploadActiveNow = true;

  for (let i = 0; i < allowFiles.length; i++) {
    const key = allowFiles[i].key;
    const file = allowFiles[i].file;

    let form = new FormData();
    form.append("document", file);

    try {
      await capi({
        method: "POST",
        url: "/upload",
        header: { "Content-Type": "multipart/form-data" },
        data: form,
        onUploadProgress: (progressEvent) => uploadProgress(progressEvent, key),
      });
      uploadFinish(key);
    } catch (e) {
      uploadError(key);
    }
  }

  uploadActiveNow = false;
}

function uploadProgress(event, key) {
  const tr = document.querySelector(
    `#upload > footer > table > tbody > tr[data-key="${key}"]`
  );
  tr.classList.add("active");

  const tdPercent = tr.querySelector("td.percent");
  tdPercent.innerText = Math.floor((event.loaded / event.total) * 100) + "%";

  if (event.loaded === event.total) {
    tdPercent.innerText = "마무리";
  }
}

function uploadFinish(key) {
  const tr = document.querySelector(
    `#upload > footer > table > tbody > tr[data-key="${key}"]`
  );
  tr.classList.add("kf-upload-finished");

  const tdPercent = tr.querySelector("td.percent");
  tdPercent.innerText = "성공";

  setTimeout(() => {
    tr.remove();
  }, 1000);
}

function uploadError(key = null) {
  if (key) {
    const tr = document.querySelector(
      `#upload > footer > table > tbody > tr[data-key="${key}"]`
    );

    tr.addEventListener("click", () => {
      tr.remove();
    });

    tr.classList.remove("active");
    tr.classList.add("error");

    const tdPercent = tr.querySelector("td.percent");
    tdPercent.innerText = "실패";
  } else {
    const trs = document.querySelectorAll(
      `#upload > footer > table > tbody > tr:not(.title)`
    );

    for (const tr of trs) {
      tr.addEventListener("click", () => {
        tr.remove();
      });

      tr.classList.remove("active");
      tr.classList.add("error");

      const tdPercent = tr.querySelector("td.percent");
      tdPercent.innerText = "실패";
    }
  }
}

document.addEventListener("DOMContentLoaded", (e) => {
  const divDropZone = document.querySelector(".drop-zone");

  [
    "drag",
    "dragstart",
    "dragend",
    "dragover",
    "dragenter",
    "dragleave",
    "drop",
  ].forEach((eventName) =>
    divDropZone.addEventListener(eventName, (event) =>
      uploadDragDropPrevent(event)
    )
  );
  ["dragover", "dragenter"].forEach((eventName) =>
    divDropZone.addEventListener(eventName, uploadDragOn)
  );
  ["dragend", "dragleave", "drop"].forEach((eventName) =>
    divDropZone.addEventListener(eventName, uploadDragOff)
  );
});

function uploadDragDropPrevent(event) {
  event.stopPropagation();
  event.preventDefault();
}

function uploadDragOn() {
  this.classList.add("active");
}

function uploadDragOff() {
  this.classList.remove("active");
}
