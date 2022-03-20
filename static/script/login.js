async function loginPageLoad() {
    try {
        const inputEmail = document.querySelector('#login > form > main > div > input[name="email"]')
        const inputSecret = document.querySelector('#login > form > main > div > input[name="secret"]')

        inputEmail.disabled = false
        inputSecret.disabled = false

        localStorage.removeItem('access_token')
    } catch(e) {
        console.error(e)
        alert('Unknown Error!')
    }
}

async function loginTry() {
    try {
        const inputEmail = document.querySelector('#login > form > main > div > input[name="email"]')
        const inputSecret = document.querySelector('#login > form > main > div > input[name="secret"]')
        const inputSave = document.querySelector('#login-checkbox-save')

        const email = inputEmail.value
        const secret = inputSecret.value
        const save = inputSave.checked

        if(!email || !secret) {
            alert('이에일과 비밀번호를 모두 입력해주세요.')
            return
        }

        const data = await capi({
            method: 'POST',
            url: '/authorize',
            data: { email, secret, save }
        })

        inputEmail.disabled = true
        inputSecret.disabled = true

        setTimeout(() => {
            inputEmail.value = ''
            inputSecret.value = ''
        }, 500)
        
        localStorage.setItem('email', email)
        localStorage.setItem('access_token', data.token)

        loadState('list')
    } catch(e) {
        console.log(e)
        if (e.message === 'Unauthorized') {
            alert('이메일 또는 비밀번호가 잘못되었습니다.')
        } else if (e.message === 'Forbidden') {
            alert('이메일 인증을 먼저 진행해주세요.')
        } else {
            console.error(e)
            alert('Unknown Error!')
        }
    }
}

function loginCheckSave(checkbox) {
    if (checkbox.checked) {
        alert('로그인 상태 유지는 반드시 본인의 기기에서만 사용해주세요.')
    }
}

function loginEmailEnter(event) {
    if (event.code === 'Enter') {
        const inputSecret = document.querySelector('#login > form > main > div > input[name="secret"]')
        inputSecret.focus()
    }
}

function loginSecretEnter(event) {
    if (event.code === 'Enter') {
        loginTry()
    }
}