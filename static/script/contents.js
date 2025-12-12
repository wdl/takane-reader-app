let contentsCheckPosActiveFlag = false;
let contentsCheckPosHandler;

async function contentsCheckPosSetHandler() {
  clearInterval(contentsCheckPosHandler);
  contentsCheckPosHandler = setInterval(async () => {
    const state = await getViewState();
    if (state === "contents") contentsCheckPos();
  }, 20000);
}

async function contentsCheckPos() {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );

    const posClientPrvCapi = Number(articleThis.dataset.index);

    const result = await capi({
      method: "GET",
      url: `/${contents.hash}/contents/pos`,
    });
    const posServer = result.pos;
    const serverReadAt = new Date(result.recent_read_at).getTime();

    const posClient = Number(articleThis.dataset.index);

    // IndexedDB에서 contents 설정 가져오기
    const contentsSetting = await getSetting("contents");
    const clientReadAt = contentsSetting.lastReadAt;

    if (posClientPrvCapi !== posClient) return;

    // 서버의 시간이 더 최신이면 갱신 필요
    if (posServer !== posClient && serverReadAt > clientReadAt) {
      const reloadingBox = document.querySelector("#contents > .reloading-box");
      reloadingBox.classList.remove("display-none");
    }
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

async function contentsPageLoad(prevLoad = false) {
  try {
    const contents = await getSetting("contents");
    const hash = contents.hash;
    const sectionContents = document.querySelector("#contents");

    const data = await capi({
      method: "GET",
      url: `/${hash}/info/`,
    });
    const info = data.info;

    sectionContents.dataset.hash = contents;
    sectionContents.dataset.name = info.name;
    sectionContents.dataset.type = info.type;
    sectionContents.dataset.length = info.length;

    contentsToggleInfo("hide");
    const spanInfoTitle = document.querySelector(
      "#contents > .info-box > .top > .title > label"
    );
    spanInfoTitle.innerText = sectionContents.dataset.name;

    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );

    delete articlePrev.dataset.index;
    delete articlePrev.dataset.length;
    articlePrev.innerHTML = "";
    articlePrev.classList.remove("edge");
    articlePrev.classList.add("loading");

    delete articleThis.dataset.index;
    delete articleThis.dataset.length;
    articleThis.innerHTML = "";
    articleThis.classList.add("loading");

    delete articleNext.dataset.index;
    delete articleNext.dataset.length;
    articleNext.innerHTML = "";
    articleNext.classList.remove("edge");
    articleNext.classList.add("loading");

    articleThis.dataset.index = info.bookmark_value || 0;

    if (sectionContents.dataset.type === "text") {
      sectionContents.classList.add("text");
      sectionContents.classList.remove("image");
      await contentsTextPageLoad(prevLoad);
    } else {
      sectionContents.classList.add("image");
      sectionContents.classList.remove("text");
      await contentsImagePageLoad(prevLoad);
    }

    const loadingBox = document.querySelector("#contents > .loading-box");
    loadingBox.classList.add("display-none");

    document.documentElement.style.backgroundColor = "#fff";
    document.body.style.backgroundColor = "#fff";
    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute("content", "#fff");

    contentsCheckPosSetHandler();
  } catch (e) {
    console.error(e);
  }
}

async function contentsArticlePrevLoad() {
  try {
    const contents = document.querySelector("#contents");
    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );

    articlePrev.classList.add("loading");

    if (contents.dataset.type === "text") {
      await contentsTextArticlePrevLoad();
    } else {
      await contentsImageArticlePrevLoad();
    }

    articlePrev.classList.remove("loading");
  } catch (e) {
    console.error(e);
  }
}

async function contentsArticleNextLoad() {
  try {
    const contents = document.querySelector("#contents");
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );

    articleNext.classList.add("loading");

    if (contents.dataset.type === "text") {
      await contentsTextArticleNextLoad();
    } else {
      await contentsImageArticleNextLoad();
    }

    articleNext.classList.remove("loading");
  } catch (e) {
    console.error(e);
  }
}

async function contentsPrev() {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const sectionContents = document.querySelector("#contents");

    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );

    if (articlePrev.classList.contains("edge")) return;
    articleNext.classList.remove("edge");

    if (!articlePrev.classList.contains("loading")) {
      articlePrev.classList.remove("prev");
      articlePrev.classList.add("this");
      articlePrev.classList.remove("loading");

      articleThis.classList.remove("this");
      articleThis.classList.add("next");
      articleThis.classList.remove("loading");

      articleNext.innerHTML = "";
      articleNext.dataset.index = "";
      articleNext.dataset.length = "";
      articleNext.classList.remove("next");
      articleNext.classList.add("prev");

      contentsArticlePrevLoad();

      capi({
        method: "PUT",
        url: `/${contents.hash}/contents/${articlePrev.dataset.index}`,
      });

      contentsRangeCalc();
      contentsCheckPosSetHandler();

      // 현재 contents 설정 가져오기
      const currentContents = await getSetting("contents");
      // lastReadAt 추가/업데이트
      await saveSetting("contents", {
        hash: currentContents.hash,
        lastReadAt: Date.now(),
      });
    }
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

async function contentsNext() {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const sectionContents = document.querySelector("#contents");

    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );

    if (articleNext.classList.contains("edge")) return;
    articlePrev.classList.remove("edge");

    if (!articleNext.classList.contains("loading")) {
      articleNext.classList.remove("next");
      articleNext.classList.add("this");
      articleNext.classList.remove("loading");

      articleThis.classList.remove("this");
      articleThis.classList.add("prev");
      articleThis.classList.remove("loading");

      articlePrev.innerHTML = "";
      articlePrev.dataset.index = "";
      articlePrev.dataset.length = "";
      articlePrev.classList.remove("prev");
      articlePrev.classList.add("next");

      contentsArticleNextLoad();

      capi({
        method: "PUT",
        url: `/${contents.hash}/contents/${articleNext.dataset.index}`,
      });

      contentsRangeCalc();
      contentsCheckPosSetHandler();

      // 현재 contents 설정 가져오기
      const currentContents = await getSetting("contents");
      // lastReadAt 추가/업데이트
      await saveSetting("contents", {
        hash: currentContents.hash,
        lastReadAt: Date.now(),
      });
    }
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

async function contentsToggleInfo(force = false) {
  try {
    const info = document.querySelector("#contents > .info-box");
    const infoTop = document.querySelector("#contents > .info-box > .top");
    const infoBottom = document.querySelector(
      "#contents > .info-box > .bottom"
    );

    let type = "show";
    if (force) {
      if (force === "show") {
        type = "show";
      } else {
        type = "hide";
      }
    } else {
      if (info.classList.contains("visibility-hidden")) {
        type = "show";
      } else {
        type = "hide";
      }
    }

    if (type === "show") {
      info.classList.remove("visibility-hidden");
      kfClassChange(infoTop, `kf-contents-info-show-down`);
      kfClassChange(infoBottom, `kf-contents-info-show-up`);
      document
        .querySelector('meta[name="theme-color"]')
        .setAttribute("content", "rgb(73, 0, 23)");
      document.documentElement.style.backgroundColor = "#fff";
      document.body.style.backgroundColor = "#fff";
    } else {
      info.classList.add("visibility-hidden");
      kfClassChange(infoTop, `kf-contents-info-hide-up`);
      kfClassChange(infoBottom, `kf-contents-info-hide-down`);
      document
        .querySelector('meta[name="theme-color"]')
        .setAttribute("content", "#fff");
      document.documentElement.style.backgroundColor = "#fff";
      document.body.style.backgroundColor = "#fff";
    }
  } catch (e) {
    console.error(e);
    alert("Unknown Error!");
  }
}

document
  .querySelector("#contents .touch-box")
  .addEventListener("touchstart", (e) => {
    const pageX =
      e.pageX ||
      e?.touches[0]?.pageX ||
      e?.changedTouches[0]?.pageX ||
      e?.originalEvent?.touches[0]?.pageX ||
      e?.originalEvent?.changedTouches[0]?.pageX;
    const pageY =
      e.pageY ||
      e?.touches[0]?.pageY ||
      e?.changedTouches[0]?.pageY ||
      e?.originalEvent?.touches[0]?.pageY ||
      e?.originalEvent?.changedTouches[0]?.pageY;
    eventManager.contents.touchValue.x = pageX;
    eventManager.contents.touchValue.y = pageY;
    if (pageX < 10 || pageX > window.innerWidth - 10) {
      e.preventDefault();
    }
  });

document
  .querySelector("#contents .touch-box")
  .addEventListener("touchend", (e) => {
    const pageX =
      e.pageX ||
      e?.touches[0]?.pageX ||
      e?.changedTouches[0]?.pageX ||
      e?.originalEvent?.touches[0]?.pageX ||
      e?.originalEvent?.changedTouches[0]?.pageX;
    const pageY =
      e.pageY ||
      e?.touches[0]?.pageY ||
      e?.changedTouches[0]?.pageY ||
      e?.originalEvent?.touches[0]?.pageY ||
      e?.originalEvent?.changedTouches[0]?.pageY;
    const startX = eventManager.contents.touchValue.x;
    const startY = eventManager.contents.touchValue.y;
    eventManager.contents.touchValue.x = null;
    eventManager.contents.touchValue.y = null;
    if (startX && startY) {
      const moveX = pageX - startX;
      const moveY = pageY - startY;

      e.preventDefault();
      if (Math.abs(moveX) + Math.abs(moveY) > 30) {
        const angle = Math.abs((Math.atan(moveY / moveX) * 180) / Math.PI);
        const quadrant =
          (moveY < 0 ? moveX : -1 * moveX) / Math.abs(moveX) / -2 +
          moveY / Math.abs(moveY) +
          2.5;

        if ([1, 4].includes(quadrant) && angle <= 45) {
          contentsPrev();
        } else if ([2, 3].includes(quadrant) && angle <= 45) {
          contentsNext();
        }
      } else {
        const target = document.elementFromPoint(startX, startY);
        if (target === document.querySelector(".touch-box .left")) {
          contentsPrev();
        } else if (target === document.querySelector(".touch-box .center")) {
          contentsToggleInfo();
        } else if (target === document.querySelector(".touch-box .right")) {
          contentsNext();
        }
      }
    }
  });

if (matchMedia("(pointer:fine)").matches) {
  document
    .querySelector("#contents .touch-box .left")
    .addEventListener("click", (e) => {
      contentsPrev();
    });
  document
    .querySelector("#contents .touch-box .center")
    .addEventListener("click", (e) => {
      contentsToggleInfo();
    });
  document
    .querySelector("#contents .touch-box .right")
    .addEventListener("click", (e) => {
      contentsNext();
    });
}

function contentsRangeCalc() {
  const sectionContents = document.querySelector("#contents");
  const articleThis = document.querySelector(
    "#contents > .contents-box > .this"
  );
  const inputRange = document.querySelector(
    "#contents > .info-box > .bottom > .center > input"
  );
  const percent =
    (articleThis.dataset.index / sectionContents.dataset.length) * 10000;

  inputRange.value = percent;
  contentsRangeInput(inputRange);
}

function contentsRangeInput(inputRange) {
  const labelRange = document.querySelector(
    "#contents > .info-box > .bottom > .left > label"
  );
  inputRange.style.background = `linear-gradient(to right, #4BD663, #4BD663 ${
    inputRange.value / 100
  }%, white ${inputRange.value / 100}%)`;
  labelRange.innerText = String(inputRange.value / 100) + "%";
}

async function contentsRangeChange(inputRange) {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const loadingBox = document.querySelector("#contents > .loading-box");
    loadingBox.classList.remove("display-none");

    const sectionContents = document.querySelector("#contents");
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );

    const imgBackOriginRange = document.querySelector(
      "#contents > .info-box > .bottom > .right > img"
    );
    imgBackOriginRange.dataset.origin = articleThis.dataset.index;
    imgBackOriginRange.classList.add("active");

    let thisPos = Math.round(
      (inputRange.value * Number(sectionContents.dataset.length)) / 10000
    );

    let last = false;
    if (thisPos >= Number(sectionContents.dataset.length)) {
      thisPos = Number(sectionContents.dataset.length);
      last = true;
    }

    await capi({
      method: "PUT",
      url: `/${contents.hash}/contents/${thisPos}`,
    });

    contentsPageLoad(last);
  } catch (e) {
    console.error(e);
  }
}

async function contentsBackOriginRange() {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const imgBackOriginRange = document.querySelector(
      "#contents > .info-box > .bottom > .right > img"
    );

    if (!imgBackOriginRange.classList.contains("active")) return;

    imgBackOriginRange.classList.remove("active");

    const loadingBox = document.querySelector("#contents > .loading-box");
    loadingBox.classList.remove("display-none");

    const sectionContents = document.querySelector("#contents");

    let thisPos = imgBackOriginRange.dataset.origin;

    let last = false;
    if (thisPos >= Number(sectionContents.dataset.length)) {
      thisPos = Number(sectionContents.dataset.length);
      last = true;
    }

    await capi({
      method: "PUT",
      url: `/${contents.hash}/contents/${thisPos}`,
    });

    contentsPageLoad(last);
  } catch (e) {
    console.error(e);
  }
}

async function contentsReload() {
  try {
    const reloadingBox = document.querySelector("#contents > .reloading-box");
    const reloadingBoxImage = document.querySelector(
      "#contents > .reloading-box > img"
    );
    reloadingBoxImage.classList.add("kf-spin");

    await contentsPageLoad();
    reloadingBox.classList.add("display-none");
    reloadingBoxImage.classList.remove("kf-spin");
  } catch (e) {
    if (e.message === "Unauthorized") {
    } else {
      console.error(e);
    }
  }
}

function contentsClose(event = null) {
  event?.stopPropagation();
  document.documentElement.style.backgroundColor = "";
  document.body.style.backgroundColor = "";
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", "rgb(73, 0, 23)");

  clearInterval(contentsCheckPosHandler);
  loadState("list");
}
