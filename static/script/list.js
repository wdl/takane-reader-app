let currentList = [];
let searchTimeout = null;

async function listPageLoad() {
  try {
    const data = await capi({
      method: "GET",
      saveCache: true,
    });

    currentList = data.list;

    const list = data.list;

    const main = document.querySelector("#list > main");

    const listHash = await digestHashString("SHA-1", JSON.stringify(list));
    if (main.dataset.listHash !== listHash) {
      main.dataset.listHash = listHash;
      listMainListing(list);
    }

    listFooterListing(list);

    const spanShowEmailHere = document.querySelector("span.show-email-here");
    spanShowEmailHere.innerText = await getSetting("email");
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
      alert("Unknown Error!");
    }
  }
}

function listMainListing(list) {
  const main = document.querySelector("#list > main");
  const tbody = document.querySelector("#list > main > table > tbody");

  const scrollTopMainOrigin = main.scrollTop;
  tbody.innerHTML = "";

  for (item of list) {
    const tr = document.createElement("tr");
    tr.dataset.hash = item.hash;
    tr.addEventListener("click", () => {
      listSelectItem(tr.dataset.hash);
    });

    const tdFileIcon = document.createElement("td");
    tdFileIcon.classList.add("file-icon");

    const imgFileIcon = document.createElement("img");
    if (item.type === "text") imgFileIcon.src = "/static/icon/file/TXT.png";
    else if (item.type === "image")
      imgFileIcon.src = "/static/icon/file/IMG.png";
    else if (item.type === "pdf") imgFileIcon.src = "/static/icon/file/PDF.png";

    const divFileCheckbox = document.createElement("div");
    divFileCheckbox.classList.add("file-checkbox");
    divFileCheckbox.classList.add("display-none");

    const inputFileCheckbox = document.createElement("input");
    inputFileCheckbox.type = "checkbox";
    inputFileCheckbox.name = "list-multiselect";
    inputFileCheckbox.value = item.hash;

    const labelFileCheckbox = document.createElement("label");

    divFileCheckbox.append(inputFileCheckbox, labelFileCheckbox);

    tdFileIcon.append(imgFileIcon, divFileCheckbox);

    const tdFileTitle = document.createElement("td");
    tdFileTitle.classList.add("file-title");
    tdFileTitle.innerText = item.name;

    const tdFilePercent = document.createElement("td");
    tdFilePercent.classList.add("file-percent");

    if (item.bookmark_value > 0) {
      const labelFilePercent = document.createElement("label");
      labelFilePercent.innerText = `${Math.floor(item.bookmark_percent)}%`;

      const progressFilePercent = document.createElement("progress");
      progressFilePercent.max = 100;
      progressFilePercent.value = Number(item.bookmark_percent);

      tdFilePercent.append(labelFilePercent, progressFilePercent);
    }

    tr.append(tdFileIcon, tdFileTitle, tdFilePercent);

    tbody.append(tr);
  }

  main.scrollTop = scrollTopMainOrigin;
}

async function listFooterListing(list) {
  const main = document.querySelector("#list > main");
  const footer = document.querySelector("#list > footer");

  const recents = list.filter((o) => o.recent_read_at);
  if (recents.length) {
    recents.sort((a, b) => {
      return (
        new Date(b.recent_read_at).getTime() -
        new Date(a.recent_read_at).getTime()
      );
    });
    await saveRecents(recents);
    const recent = recents[0];

    const footerFileicon = footer.querySelector("td.file-icon img");
    if (recent.type === "text")
      footerFileicon.src = "/static/icon/file/TXT.png";
    else if (recent.type === "image")
      footerFileicon.src = "/static/icon/file/IMG.png";
    else if (recent.type === "pdf")
      footerFileicon.src = "/static/icon/file/PDF.png";

    const footerFileTitle = footer.querySelector("td.file-title span");
    footerFileTitle.innerText = recent.name;

    const tableFooter = footer.querySelector("table");
    tableFooter.dataset.hash = recent.hash;
    tableFooter.addEventListener("click", () => {
      listSelectItem(tableFooter.dataset.hash);
    });
    footer.classList.remove("display-none");
    main.classList.remove("no-footer");
  } else {
    footer.classList.add("display-none");
    main.classList.add("no-footer");
  }
}

async function listSelectItem(hash) {
  try {
    await saveSetting("contents", {
      hash: hash,
      lastReadAt: Date.now(),
    });
    loadState("contents");
  } catch (e) {
    console.error(e);
    alert("Unknown Error!");
  }
}

async function recentPageLoad() {
  try {
    const recents = await getRecents();

    const main = document.querySelector("#recent > main");
    const tbody = document.querySelector("#recent > main > table > tbody");

    const recentHash = await digestHashString("SHA-1", JSON.stringify(recents));
    if (main.dataset.recentHash === recentHash) {
      return;
    } else {
      main.dataset.recentHash = recentHash;
    }
    tbody.innerHTML = "";

    for (recent of recents) {
      const tr = document.createElement("tr");
      tr.dataset.hash = recent.hash;
      tr.addEventListener("click", () => {
        listSelectItem(tr.dataset.hash);
      });

      const tdFileIcon = document.createElement("td");
      tdFileIcon.classList.add("file-icon");

      const imgFileIcon = document.createElement("img");
      if (recent.type === "text") imgFileIcon.src = "/static/icon/file/TXT.png";
      else if (recent.type === "image")
        imgFileIcon.src = "/static/icon/file/IMG.png";
      else if (recent.type === "pdf")
        imgFileIcon.src = "/static/icon/file/PDF.png";

      tdFileIcon.append(imgFileIcon);

      const tdFileTitle = document.createElement("td");
      tdFileTitle.classList.add("file-title");
      tdFileTitle.innerText = recent.name;

      const tdFilePercent = document.createElement("td");
      tdFilePercent.classList.add("file-percent");

      if (recent.bookmark_value > 0) {
        const labelFilePercent = document.createElement("label");
        labelFilePercent.innerText = `${Math.floor(recent.bookmark_percent)}%`;

        const progressFilePercent = document.createElement("progress");
        progressFilePercent.max = 100;
        progressFilePercent.value = Number(recent.bookmark_percent);

        tdFilePercent.append(labelFilePercent, progressFilePercent);
      }

      tr.append(tdFileIcon, tdFileTitle, tdFilePercent);

      tbody.append(tr);
    }

    if (main.scrollHeight > main.offsetHeight) {
      main.scrollTop = 1;
    }
  } catch (e) {
    console.error(e);
    alert("Unknown Error!");
  }
}

function recentOpen(event = null) {
  event?.stopPropagation();
  loadState("recent");
}

function recentClose(event = null) {
  event?.stopPropagation();
  loadState("list");
}

function listAsideOpen(event = null) {
  event?.stopPropagation();

  const aside = document.querySelector("#list > aside");
  kfClassChange(aside, `kf-list-aside-show-left`);

  const watingBox = document.querySelector("#list > .wating-box");
  kfClassChange(watingBox, `kf-list-wating-box-show`);
}

function listAsideClose(event = null) {
  event?.stopPropagation();

  const watingBox = document.querySelector("#list > .wating-box");
  kfClassChange(watingBox, `kf-list-wating-box-hide`);
  watingBox.classList.add("display-none");

  const aside = document.querySelector("#list > aside");
  kfClassChange(aside, `kf-list-aside-hide-right`);
}

function uploadOpen(event) {
  event.stopPropagation();
  loadState("upload");
}

function listSearch(searchTerm) {
  if (!currentList) return;

  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Set new timeout for debouncing
  searchTimeout = setTimeout(() => {
    const searchTermLower = searchTerm
      .toLowerCase()
      .replace(/[^a-zㄱ-ㅎ가-힣0-9]/g, "")
      .trim();

    if (!searchTermLower) {
      // If search is empty, show all items
      listMainListing(currentList);
      return;
    }

    // Decompose the search term
    const decomposedSearch = Hangul.disassemble(searchTermLower).join("");

    const filteredList = currentList.filter((item) => {
      const itemName = item.name
        .toLowerCase()
        .replace(/[^a-zㄱ-ㅎ가-힣0-9]/g, "");
      const decomposedName = Hangul.disassemble(itemName).join("");

      // Check both original and decomposed versions
      return (
        itemName.includes(searchTermLower) ||
        decomposedName.includes(decomposedSearch)
      );
    });

    listMainListing(filteredList);
  }, 300); // 300ms debounce delay
}
