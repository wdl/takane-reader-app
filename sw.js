const CACHE_NAME = "takane-reader-cache-v4";
const API_CACHE_NAME = "takane-api-cache-v1";
const urlsToCache = [
  "/",
  "/manifest.webmanifest",
  "/index.html",
  "/static/script/axios.js",
  "/static/script/hangul.js",
  "/static/script/platform.js",
  "/static/script/config.js",
  "/static/script/common.js",
  "/static/script/login.js",
  "/static/script/member.js",
  "/static/script/list.js",
  "/static/script/upload.js",
  "/static/script/contents.js",
  "/static/script/contents-text.js",
  "/static/script/contents-image.js",
  "/static/script/contents-download.js",
  "/static/script/mobile.js",
  "/static/script/fetch.js",
  "/static/lib/contents.css",
  "/static/lib/list.css",
  "/static/lib/login.css",
  "/static/lib/member.css",
  "/static/lib/upload.css",
  "/static/lib/common.css",
  "/static/lib/mobile.css",
  "/static/lib/theme.css",
  "/static/lib/contents-image.css",
  "/static/lib/contents-text.css",
  "/static/lib/keyframes.css",
  "/static/icon/tknicon192.png",
  "/static/icon/tknicon144.png",
  "/static/icon/tknicon72.png",
  "/static/icon/tknicon96.png",
  "/static/icon/tknicon96v2.png",
  "/static/icon/tknicon48.png",
  "/static/icon/tknicon192v2.png",
  "/static/icon/faviconv2.ico",
  "/static/icon/faviconv2c.ico",
  "/static/icon/tknicon168.png",
  "/static/icon/tknicon144v2.png",
  "/static/icon/tknicon48v2.png",
  "/static/icon/tknicon72v2.png",
  "/static/icon/favicon.ico",
  "/static/icon/tknicon168v2.png",
  "/static/icon/tknicon192v2c.png",
  "/static/icon/tknicon300v2c.png",
  "/static/icon/svg/download_white_24dp.svg",
  "/static/icon/svg/close_white_24dp.svg",
  "/static/icon/svg/manage_accounts_white_24dp.svg",
  "/static/icon/svg/undo_white_24dp.svg",
  "/static/icon/svg/arrow_back_ios_white_24dp.svg",
  "/static/icon/svg/loading_crimson_200px.svg",
  "/static/icon/svg/menu_white_24dp.svg",
  "/static/icon/svg/sync_white_24dp.svg",
  "/static/icon/svg/toc_white_24dp.svg",
  "/static/icon/svg/edit_white_24dp.svg",
  "/static/icon/svg/file_upload_white_24dp.svg",
  "/static/icon/svg/logout_white_24dp.svg",
  "/static/icon/file/PDF.png",
  "/static/icon/file/ZIP.png",
  "/static/icon/file/IMG.png",
  "/static/icon/file/TXT.png",
];

// Install event - 캐시 생성 및 초기 리소스 저장
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event - 오래된 정적 캐시 정리 (API 캐시는 유지)
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          // 현재 정적 캐시가 아니고, API 캐시도 아닌 경우 삭제
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// API 요청인지 확인하는 함수
function isApiRequest(request) {
  return request.url.includes("api.text.takane.me");
}

// 네트워크 요청에 타임아웃을 설정하는 함수
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error("Network timeout"));
      }, timeout);
    }),
  ]);
}

// Fetch event - 네트워크 요청 처리
self.addEventListener("fetch", function (event) {
  const request = event.request;

  // API 요청인 경우
  if (isApiRequest(request)) {
    // GET 요청인 경우에만 캐싱 전략 적용 (Cache API는 GET만 저장 가능)
    if (request.method === "GET") {
      event.respondWith(
        // 먼저 네트워크 요청 시도 (5초 타임아웃)
        fetchWithTimeout(request, 5000)
          .then(function (response) {
            // 네트워크 요청 성공
            if (!response || response.status !== 200) {
              return response;
            }

            // 성공한 응답을 캐시에 저장 (캐시 시간 헤더 추가)
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append("sw-cache-time", new Date().toISOString());

            const cachedResponse = new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers: headers,
            });

            // API 전용 캐시에 저장
            caches.open(API_CACHE_NAME).then(function (cache) {
              cache.put(request, cachedResponse);
            });

            return response;
          })
          .catch(function (error) {
            // 네트워크 요청 실패 또는 타임아웃 (5초 이상)
            console.log(
              "Network request failed or timeout, checking cache:",
              error
            );
            // API 캐시 확인
            return caches.open(API_CACHE_NAME).then(function (cache) {
              return cache.match(request).then(function (cachedResponse) {
                if (cachedResponse) {
                  console.log("Using cached API response");
                  return cachedResponse;
                }
                // 캐시도 없으면 원래 에러를 그대로 전달
                throw error;
              });
            });
          })
      );
    } else {
      // GET이 아닌 요청(POST, PUT 등)은 캐싱하지 않고 네트워크로 직접 요청
      event.respondWith(fetch(request));
    }
  } else {
    // 일반 리소스 요청 처리
    event.respondWith(
      caches.match(request).then(function (response) {
        if (response) {
          return response;
        }

        return fetch(request)
          .then(function (response) {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch(function () {
            return caches.match("/");
          });
      })
    );
  }
});
