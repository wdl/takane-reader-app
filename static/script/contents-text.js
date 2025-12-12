window.addEventListener("resize", resizeDebouncer, false);

function resizeDebouncer() {
  if (eventManager.contentsText.resize) {
    clearTimeout(eventManager.contentsText.resize);
    eventManager.contentsText.resize = null;
  }
  eventManager.contentsText.resize = setTimeout(function () {
    eventManager.contentsText.resize = null;
    if (location.hash.includes("contents")) actualResizeHandler();
  }, 330);
}

function actualResizeHandler() {
  const articles = document.querySelectorAll(
    "#contents > .contents-box > article"
  );
  const columnWidth =
    document.querySelector("#contents > .contents-box").offsetWidth + "px";
  articles.forEach((o) => (o.style.columnWidth = columnWidth));

  const articlePrev = document.querySelector(
    "#contents > .contents-box > .prev"
  );
  const articleNext = document.querySelector(
    "#contents > .contents-box > .next"
  );

  if (!articlePrev.classList.contains("loading")) {
    articlePrev.classList.add("loading");
    contentsTextArticleNextLoad();
  }
  if (!articleNext.classList.contains("loading")) {
    articleNext.classList.add("loading");
    contentsTextArticlePrevLoad();
  }
}

async function contentsTextPageLoad(prevLoad = false) {
  try {
    actualResizeHandler();

    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    articleThis.dataset.length = 0;

    if (prevLoad) {
      await contentsTextArticlePrevLoad();
      await contentsPrev();
      await contentsTextArticleNextLoad();
    } else {
      await contentsTextArticleNextLoad();
      await contentsNext();
      await contentsTextArticlePrevLoad();
    }
  } catch (e) {
    console.error(e);
  }
}

async function contentsTextArticlePrevLoad() {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const sectionContents = document.querySelector("#contents");
    if (!sectionContents) {
      throw new Error("Contents section not found");
    }

    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );

    if (!articlePrev || !articleThis) {
      throw new Error("Required article elements not found");
    }

    const indexPrev = Number(articleThis.dataset.index) - 8192;

    const articlePrevExisting = articlePrev.innerText;

    const text = await fetchContentsText(
      contents.hash,
      indexPrev,
      Number(sectionContents.dataset.length)
    );

    if (!text) {
      throw new Error("No text content received");
    }

    if (articlePrevExisting !== articlePrev.innerText) {
      return;
    }

    const spansText = text
      .split("")
      .map((o) => `<span>${o.replace(/[\n\r]/g, "<br />")}</span>`)
      .join("");

    articlePrev.innerHTML = spansText;

    const spans = articlePrev.querySelectorAll("span");
    if (!spans || spans.length === 0) {
      throw new Error("No spans created from text");
    }

    let position, lastPageHeight;
    let findFlag = false;

    for (let i = 0; i < spans.length; i++) {
      const span = spans[spans.length - i - 1];
      if (span.offsetWidth || span.offsetHeight) {
        if (!lastPageHeight) lastPageHeight = span.offsetTop;
        position = i;
        if (
          span.offsetLeft < articlePrev.scrollWidth - articlePrev.offsetWidth &&
          span.offsetTop <= lastPageHeight
        ) {
          findFlag = true;
          break;
        }
      }
    }
    if (!findFlag) position = spans.length;

    articlePrev.dataset.length = position;
    articlePrev.dataset.index = Number(articleThis.dataset.index) - position;
    if (articlePrev.dataset.length <= 0 || articlePrev.dataset.index < 0) {
      articlePrev.classList.add("edge");
    } else {
      const vaildText = text.slice(text.length - position);
      const spansVaildText = vaildText
        .split("")
        .map((o) => `<span>${o.replace(/[\n\r]/g, "<br />")}</span>`)
        .join("");
      articlePrev.innerHTML = spansVaildText;
    }

    articlePrev.classList.remove("loading");
  } catch (e) {
    console.error("Error in contentsTextArticlePrevLoad:", e);
    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );
    if (articlePrev) {
      articlePrev.classList.remove("loading");
      articlePrev.classList.add("edge");
    }
  }
}

async function contentsTextArticleNextLoad() {
  try {
    const contents = await getSetting("contents");
    if (!contents || !contents.hash) {
      throw new Error("No contents hash found in settings");
    }

    const sectionContents = document.querySelector("#contents");
    if (!sectionContents) {
      throw new Error("Contents section not found");
    }

    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );

    if (!articleThis || !articleNext) {
      throw new Error("Required article elements not found");
    }

    const indexNext =
      Number(articleThis.dataset.index) + Number(articleThis.dataset.length);

    articleNext.dataset.index = indexNext;
    const articleNextExisting = articleNext.innerText;

    const text = await fetchContentsText(
      contents.hash,
      Number(articleNext.dataset.index),
      Number(sectionContents.dataset.length)
    );

    if (!text) {
      throw new Error("No text content received");
    }

    if (articleNextExisting !== articleNext.innerText) {
      return;
    }

    const spansText = text
      .split("")
      .map((o) => `<span>${o.replace(/[\n\r]/g, "<br />")}</span>`)
      .join("");

    articleNext.innerHTML = spansText;

    const spans = articleNext.querySelectorAll("span");
    if (!spans || spans.length === 0) {
      throw new Error("No spans created from text");
    }

    let position;
    let findFlag = false;

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      if (span.offsetWidth || span.offsetHeight) {
        position = i;
        if (span.offsetLeft > articleNext.offsetWidth) {
          findFlag = true;
          break;
        }
      }
    }
    if (!findFlag) position = spans.length;

    articleNext.dataset.length = position;

    if (articleNext.dataset.length <= 0 || articleNext.dataset.index < 0) {
      articleNext.classList.add("edge");
    } else {
      const vaildText = text.slice(0, position);
      const spansVaildText = vaildText
        .split("")
        .map((o) => `<span>${o.replace(/[\n\r]/g, "<br />")}</span>`)
        .join("");
      articleNext.innerHTML = spansVaildText;
    }

    articleNext.classList.remove("loading");
  } catch (e) {
    console.error("Error in contentsTextArticleNextLoad:", e);
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );
    if (articleNext) {
      articleNext.classList.remove("loading");
      articleNext.classList.add("edge");
    }
  }
}
