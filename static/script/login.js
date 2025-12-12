async function loginPageLoad() {
  try {
    const inputEmail = document.querySelector(
      '#login > form > main > div > input[name="email"]'
    );
    const inputSecret = document.querySelector(
      '#login > form > main > div > input[name="secret"]'
    );

    inputEmail.disabled = false;
    inputSecret.disabled = false;

    // Check if we have a token
    const token = getCookie("token");
    if (token) {
      try {
        // Try to get a new token
        const res = await axios({
          method: "POST",
          url: "https://api.text.takane.me/refresh",
          data: { token },
        });

        if (res.data?.success && res.data.token) {
          // If token_refresh exists, it's a 28d token, otherwise 6h
          setCookie(
            "token",
            res.data.token,
            res.data.token_refresh ? 28 : 0.25
          );
          loadState("list");
          return;
        }
      } catch (e) {
        // If refresh fails, clear token
        if (e.response?.status === 401) {
          deleteCookie("token");
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function loginTry() {
  try {
    const inputEmail = document.querySelector(
      '#login > form > main > div > input[name="email"]'
    );
    const inputSecret = document.querySelector(
      '#login > form > main > div > input[name="secret"]'
    );
    const inputSave = document.querySelector("#login-checkbox-save");

    const email = inputEmail.value;
    const secret = inputSecret.value;
    const save = inputSave.checked;

    if (!email || !secret) {
      alert("이에일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    const res = await axios({
      method: "POST",
      url: "https://api.text.takane.me/authorize",
      data: { email, secret, save },
    });

    if (!res.data?.success) {
      throw new Error("Login failed");
    }

    inputEmail.disabled = true;
    inputSecret.disabled = true;

    setTimeout(() => {
      inputEmail.value = "";
      inputSecret.value = "";
    }, 500);

    await saveSetting("email", email);
    // If save is true, token is valid for 28d, otherwise 6h
    setCookie("token", res.data.token, save ? 28 : 0.25);

    loadState("list");
  } catch (e) {
    console.log(e);
    if (e.response?.status === 401) {
      alert("이메일 또는 비밀번호가 잘못되었습니다.");
    } else if (e.response?.status === 403) {
      alert("이메일 인증을 먼저 진행해주세요.");
    } else {
      console.error(e);
    }
  }
}

function loginCheckSave(checkbox) {
  if (checkbox.checked) {
    alert("로그인 상태 유지는 반드시 본인의 기기에서만 사용해주세요.");
  }
}

function loginEmailEnter(event) {
  if (event.code === "Enter") {
    const inputSecret = document.querySelector(
      '#login > form > main > div > input[name="secret"]'
    );
    inputSecret.focus();
  }
}

function loginSecretEnter(event) {
  if (event.code === "Enter") {
    loginTry();
  }
}
