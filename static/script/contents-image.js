async function contentsImagePageLoad(prevLoad) {
  try {
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    articleThis.dataset.length = 0;

    if (prevLoad) {
      await contentsImageArticleThisLoad();
      await contentsImageArticlePrevLoad();
      await contentsPrev();
      await contentsImageArticlePrevLoad();
    } else {
      await contentsImageArticleThisLoad();
      await contentsImageArticleNextLoad();
      await contentsImageArticlePrevLoad();
    }
  } catch (e) {
    console.error(e);
  }
}

async function contentsImageArticlePrevLoad() {
  try {
    const sectionContents = document.querySelector("#contents");

    const articlePrev = document.querySelector(
      "#contents > .contents-box > .prev"
    );
    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );

    const indexPrev = Number(articleThis.dataset.index) - 1;

    if (indexPrev < 0) {
      articlePrev.classList.add("edge");
      return;
    }

    const img = document.createElement("img");
    img.classList.add("contents-image");
    const accessToken = await getSetting("access_token");
    img.src = `https://api.text.takane.me/${sectionContents.dataset.hash}/contents/${indexPrev}?token=${accessToken}`;

    articlePrev.append(img);

    articlePrev.dataset.index = indexPrev;

    articlePrev.classList.remove("loading");
  } catch (e) {
    console.error(e);
  }
}

async function contentsImageArticleThisLoad() {
  try {
    const sectionContents = document.querySelector("#contents");

    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );

    const indexThis = Number(articleThis.dataset.index);

    if (indexThis < 0 || indexThis >= sectionContents.dataset.length) {
      articleThis.classList.add("edge");
      return;
    }

    const img = document.createElement("img");
    img.classList.add("contents-image");
    const accessToken = await getSetting("access_token");
    img.src = `https://api.text.takane.me/${sectionContents.dataset.hash}/contents/${indexThis}?token=${accessToken}`;

    articleThis.append(img);

    articleThis.dataset.index = indexThis;

    articleThis.classList.remove("loading");
  } catch (e) {
    console.error(e);
  }
}

async function contentsImageArticleNextLoad() {
  try {
    const sectionContents = document.querySelector("#contents");

    const articleThis = document.querySelector(
      "#contents > .contents-box > .this"
    );
    const articleNext = document.querySelector(
      "#contents > .contents-box > .next"
    );

    const indexNext = Number(articleThis.dataset.index) + 1;

    if (indexNext >= sectionContents.dataset.length) {
      articleNext.classList.add("edge");
      return;
    }

    const img = document.createElement("img");
    img.classList.add("contents-image");
    const accessToken = await getSetting("access_token");
    img.src = `https://api.text.takane.me/${sectionContents.dataset.hash}/contents/${indexNext}?token=${accessToken}`;

    articleNext.append(img);

    articleNext.dataset.index = indexNext;

    articleNext.classList.remove("loading");
  } catch (e) {
    console.error(e);
  }
}
