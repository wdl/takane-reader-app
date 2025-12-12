// Cookie utility functions
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name + "=" + (value || "") + expires + "; path=/; secure; samesite=strict";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie =
    name + "=; Max-Age=-99999999; path=/; secure; samesite=strict";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("DONE_", registration);
      })
      .catch((e) => {
        console.log("SW registration failed: ", e);
      });
  });
}

let eventManager = {
  contents: {
    touchValue: {
      x: null,
      y: null,
    },
  },
  contentsText: {
    resize: null,
  },
};

function setAppTheme(bgColor, themeColor) {
  document.documentElement.style.backgroundColor = bgColor || "";
  document.body.style.backgroundColor = bgColor || "";
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme && themeColor) {
    metaTheme.setAttribute("content", themeColor);
  }
}

document.addEventListener("keydown", arrowKey);
document.addEventListener("DOMContentLoaded", (e) => {
  loadState(null, "-no-animation");
});

async function digestHashString(algorithm, data) {
  return Array.from(
    new Uint8Array(
      await window.crypto.subtle.digest(
        algorithm,
        new TextEncoder().encode(data)
      )
    )
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function kfClassChange(element, newKFClass, noAnimation = "") {
  const classList = Array.from(element.classList);
  let kfList = classList.filter((o) => /^kf-.*/.test(o));

  for (const kf of kfList) {
    element.classList.remove(kf);
  }

  element.classList.remove("display-none");

  element.classList.add(`${newKFClass}${noAnimation}`);
}

async function capi(options) {
  try {
    const token = getCookie("token");
    if (!options.method) options.method = "GET";
    if (!options.url) options.url = "/";

    const req = {
      method: options.method,
      url: `https://api.text.takane.me${options.url}`,
    };
    if (token) req.headers = { Authorization: token };
    if (options.headers)
      req.headers = Object.assign(req.headers, options.headers);
    if (options.data) req.data = options.data;
    if (options.onUploadProgress)
      req.onUploadProgress = options.onUploadProgress;
    const res = await axios(req);

    if (options.rowResponse) {
      return res;
    }

    if (!res.data?.success) {
      throw new Error("Call api failure");
    }

    if (res.data.token_refresh) {
      try {
        setCookie("token", res.data.token_refresh, 28); // 28d for refresh token
      } catch (e) {
        console.error("Error saving refreshed token:", e);
      }
    }

    if (options.saveCache) {
      try {
        let cache = {};
        const cacheData = await getSetting("cache-api");
        if (cacheData) {
          cache = cacheData;
        }
        cache[`${options.method}${options.url.replace(/\//g, "_")}`] = res.data;
        await saveSetting("cache-api", cache);
      } catch (e) {
        console.error("Error saving API cache:", e);
      }
    }

    return res.data;
  } catch (e) {
    console.log(e);
    if (e.response?.status === 401) {
      const token = getCookie("token");
      if (token && options.url !== "/refresh") {
        try {
          const data = await capi({
            method: "POST",
            url: "/refresh",
            data: { token },
          });

          if (data.token) {
            setCookie("token", data.token, data.token_refresh ? 28 : 0.25);
            return capi(options);
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }
      }

      await clearTokens();
      loadState("login");
      throw new Error("Unauthorized");
    } else if (e.response?.status === 403) {
      throw new Error("Forbidden");
    } else {
      if (options.saveCache) {
        try {
          let cache = {};
          const cacheData = await getSetting("cache-api");
          if (cacheData) {
            cache = cacheData;
          }
          const thisCache =
            cache[`${options.method}${options.url.replace(/\//g, "_")}`];
          return thisCache;
        } catch (e) {
          console.error("Error getting API cache:", e);
          throw new Error(e);
        }
      } else {
        throw new Error(e);
      }
    }
  }
}

async function clearIndexedDB() {
  try {
    const db = await openDB();
    const transaction = db.transaction(
      [STORE_NAME, SETTINGS_STORE_NAME, RECENTS_STORE_NAME],
      "readwrite"
    );

    // Clear all stores
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = transaction.objectStore(STORE_NAME).clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }),
      new Promise((resolve, reject) => {
        const request = transaction.objectStore(SETTINGS_STORE_NAME).clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }),
      new Promise((resolve, reject) => {
        const request = transaction.objectStore(RECENTS_STORE_NAME).clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }),
    ]);
  } catch (e) {
    console.error("Error clearing IndexedDB:", e);
  }
}

async function clearTokens() {
  try {
    // Clear cookies
    deleteCookie("token");

    // Clear localStorage
    localStorage.clear();

    // Clear IndexedDB
    await clearIndexedDB();

    listAsideClose();
    loadState("login");
  } catch (e) {
    console.error("Error clearing tokens:", e);
    loadState("login");
  }
}

async function getViewState() {
  return Array.from(
    document.querySelectorAll("section:not(.display-none)")
  ).sort((a, b) => {
    const wrapper = document.querySelector("#wrapper");
    const AEH = Math.abs(
      wrapper.offsetWidth / 2 - (a.offsetLeft + a.offsetWidth) / 2
    );
    const AEW = Math.abs(
      wrapper.offsetHeight / 2 - (a.offsetTop + a.offsetHeight) / 2
    );
    const BEH = Math.abs(
      wrapper.offsetWidth / 2 - (b.offsetLeft + b.offsetWidth) / 2
    );
    const BEW = Math.abs(
      wrapper.offsetHeight / 2 - (b.offsetTop + b.offsetHeight) / 2
    );
    return AEH + AEW - (BEH + BEW);
  })[0].id;
}

async function loadState(stateNextTentatively = false, noAnimation = "") {
  let stateNext, statePrev;

  stateNext =
    stateNextTentatively || location.hash.replace(/#!\//g, "") || "list";
  statePrev = await getViewState();

  const pageLogin = document.querySelector("#login");
  const pageList = document.querySelector("#list");
  const pageRecent = document.querySelector("#recent");
  const pageContents = document.querySelector("#contents");
  const pageUpload = document.querySelector("#upload");

  if (stateNext === "list") {
    if (statePrev === "login") {
      kfClassChange(pageList, `kf-bg-show-front`, noAnimation);
      kfClassChange(pageLogin, `kf-modal-hide-down`, noAnimation);
    } else if (statePrev === "recent") {
      kfClassChange(pageRecent, `kf-hide-right`, noAnimation);
      kfClassChange(pageList, `kf-show-right`, noAnimation);
    } else if (statePrev === "contents") {
      kfClassChange(pageContents, `kf-hide-right`, noAnimation);
      kfClassChange(pageList, `kf-show-right`, noAnimation);
    } else if (statePrev === "upload") {
      kfClassChange(pageUpload, `kf-hide-right`, noAnimation);
      kfClassChange(pageList, `kf-show-right`, noAnimation);
    }

    setAppTheme("rgb(73, 0, 23)", "rgb(73, 0, 23)");
    listPageLoad();
  } else if (stateNext === "recent") {
    if (statePrev === "list") {
      kfClassChange(pageList, `kf-hide-left`, noAnimation);
      kfClassChange(pageRecent, `kf-show-left`, noAnimation);
    } else if (statePrev === "contents") {
      kfClassChange(pageContents, `kf-hide-right`, noAnimation);
      kfClassChange(pageRecent, `kf-show-right`, noAnimation);
    }

    setAppTheme("rgb(73, 0, 23)", "rgb(73, 0, 23)");
    recentPageLoad();
  } else if (stateNext === "login") {
    if (statePrev === "list") {
      kfClassChange(pageList, `kf-bg-hide-back`, noAnimation);
      kfClassChange(pageLogin, `kf-modal-show-up`, noAnimation);
    } else if (statePrev === "contents") {
      kfClassChange(pageContents, `kf-bg-hide-back`, noAnimation);
      kfClassChange(pageLogin, `kf-modal-show-up`, noAnimation);
    }

    setAppTheme("rgb(73, 0, 23)", "rgb(73, 0, 23)");
    loginPageLoad();
  } else if (stateNext === "contents") {
    if (statePrev === "list") {
      kfClassChange(pageList, `kf-hide-left`, noAnimation);
      kfClassChange(pageContents, `kf-show-left`, noAnimation);
    } else if (statePrev === "recent") {
      kfClassChange(pageRecent, `kf-hide-left`, noAnimation);
      kfClassChange(pageContents, `kf-show-left`, noAnimation);
    } else if (statePrev === "login") {
      kfClassChange(pageContents, `kf-bg-show-front`, noAnimation);
      kfClassChange(pageLogin, `kf-modal-hide-down`, noAnimation);
    }

    contentsPageLoad();
  } else if (stateNext === "upload") {
    if (statePrev === "list") {
      kfClassChange(pageList, `kf-hide-left`, noAnimation);
      kfClassChange(pageUpload, `kf-show-left`, noAnimation);
    }

    setAppTheme("rgb(73, 0, 23)", "rgb(73, 0, 23)");
    uploadPageLoad();
  }
}

async function arrowKey(e) {
  const state = await getViewState();

  if (
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"].includes(
      e.key
    )
  )
    return;

  if (state === "list") {
    if (e.key === "ArrowDown") {
      document.querySelector("footer table").click();
    } else if (e.key === "ArrowLeft") {
      const aside = document.querySelector("section#list > aside");
      if (aside.classList.contains("kf-list-aside-show-left")) listAsideClose();
    } else if (e.key === "ArrowRight") {
      listAsideOpen();
    } else if (e.key === "Escape") {
      const aside = document.querySelector("section#list > aside");
      if (aside.classList.contains("kf-list-aside-show-left")) listAsideClose();
    }
  } else if (state === "recent") {
    if (e.key === "ArrowLeft") {
      recentClose();
    } else if (e.key === "Escape") {
      recentClose();
    }
  } else if (state === "contents") {
    if (e.key === "ArrowUp") {
      contentsToggleInfo();
    } else if (e.key === "ArrowDown") {
      contentsToggleInfo();
    } else if (e.key === "ArrowLeft") {
      contentsPrev();
    } else if (e.key === "ArrowRight") {
      contentsNext();
    } else if (e.key === "Escape") {
      contentsClose();
    }
  }
}

function webAppLoadedCheck() {
  if (!matchMedia("(display-mode: standalone)").matches) {
    if (platform.os.family === "iOS") {
      document
        .querySelectorAll("#webapp-guide div")
        .forEach((v) => v.classList.add("display-none"));
      document
        .querySelector("#webapp-guide div.iOS")
        .classList.remove("display-none");
      document.querySelector("#webapp-guide").classList.remove("display-none");
    } else if (platform.os.family === "Android") {
      if (platform.name.includes("Samsung")) {
        document
          .querySelectorAll("#webapp-guide div")
          .forEach((v) => v.classList.add("display-none"));
        document
          .querySelector("#webapp-guide div.Android-Samsung")
          .classList.remove("display-none");
        document
          .querySelector("#webapp-guide")
          .classList.remove("display-none");
      } else {
        document
          .querySelectorAll("#webapp-guide div")
          .forEach((v) => v.classList.add("display-none"));
        document
          .querySelector("#webapp-guide div.Android-Chrome")
          .classList.remove("display-none");
        document
          .querySelector("#webapp-guide")
          .classList.remove("display-none");
      }
    } else if (platform.os.family === "Windows Phone") {
      alert("Windows Phone: 이 페이지를 설치하여 사용하세요!");
    }
  }
}

function webAppGuideClose() {
  document.querySelector("#webapp-guide").classList.add("display-none");
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  console.log(e);
});

window.addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = "";
});

webAppLoadedCheck();
