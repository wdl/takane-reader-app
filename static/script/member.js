const memberSecurityLogActions = {
    'register': '회원가입',
    'login': '로그인',
    'secret-change': '비밀번호 변경',
    'recovery-code-issue': '복구 코드 발급',
    'recover': '복구 코드로 비밀번호 재설정',
    'admin-reset': '관리자 비밀번호 초기화',
}

let memberRecoveryChecked = false

function memberFormOpen(form) {
    const sectionMember = document.querySelector('#member')

    const articles = document.querySelectorAll('#member > article')
    for (const article of articles) {
        article.classList.add('display-none')
    }

    const articleSelected = document.querySelector(`#member > article.${form}`)
    articleSelected.classList.remove('display-none')

    kfClassChange(sectionMember, `kf-list-wating-box-show`)
}

function memberFormClose() {
    const sectionMember = document.querySelector('#member')

    kfClassChange(sectionMember, `kf-list-wating-box-hide`)
    sectionMember.classList.add('display-none')

    for (const input of document.querySelectorAll('#member input')) {
        input.value = ''
    }
}

// Calls the API without capi() so that 4xx responses come back as values instead of throwing
async function memberApi(method, url, data, auth = false) {
    const req = {
        method,
        url: `https://api.text.takane.me${url}`,
    }
    if (data) req.data = data
    if (auth) req.headers = { Authorization: getCookie('token') }

    try {
        const res = await axios(req)
        return res.data
    } catch (e) {
        return { success: false, status: e.response?.status }
    }
}

function memberErrorMessage(status, messages = {}) {
    if (messages[status]) return messages[status]
    if (status === 429) return '시도 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.'
    return '알 수 없는 오류가 발생했습니다.'
}

// The session was signed out (e.g. password changed on another device)
function memberSessionExpired(status) {
    if (status !== 401) return false

    alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
    memberFormClose()
    clearTokens()
    return true
}

function memberSetToken(token) {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    setCookie('token', token, (payload.exp * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
}

function memberPrefillLoginEmail(email) {
    document.querySelector('#login > form > main > div > input[name="email"]').value = email
}

function memberShowRecoveryCode(code, message) {
    document.querySelector('#member > .recovery-code .result').innerText = message
    document.querySelector('#member > .recovery-code code').innerText = code
    memberFormOpen('recovery-code')
}

async function memberRecoveryCodeCopy() {
    const code = document.querySelector('#member > .recovery-code code')

    try {
        await navigator.clipboard.writeText(code.innerText)
        alert('복구 코드를 복사했습니다.')
    } catch (e) {
        const range = document.createRange()
        range.selectNodeContents(code)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
    }
}

function memberRecoveryCodeDone() {
    if (!confirm('복구 코드를 안전한 곳에 저장하셨나요?\n이 창을 닫으면 다시 볼 수 없습니다.')) return

    document.querySelector('#member > .recovery-code code').innerText = ''
    memberFormClose()
}

async function memberRegisterTry() {
    const articleRegister = document.querySelector('#member > .register')

    const inputEmail = document.querySelector('#member > .register [name="email"]')
    const inputSecret = document.querySelector('#member > .register [name="secret"]')

    const email = inputEmail.value
    const secret = inputSecret.value

    if (!email || !secret) {
        alert('이메일과 비밀번호를 모두 입력해주세요.')
        return
    }

    articleRegister.classList.add('display-none')

    const data = await memberApi('POST', '/user', { email, secret })

    if (data.success) {
        memberPrefillLoginEmail(email)
        memberShowRecoveryCode(data.recovery_code, '회원가입이 완료되었습니다. 바로 로그인할 수 있습니다.')
    } else {
        alert(`회원가입에 실패했습니다.\n${memberErrorMessage(data.status, {
            400: '이메일 형식을 확인해주세요.',
            409: '이미 가입된 이메일입니다.',
        })}`)
        articleRegister.classList.remove('display-none')
    }
}

async function memberReminderTry() {
    const articleReminder = document.querySelector('#member > .reminder')

    const inputEmail = document.querySelector('#member > .reminder [name="email"]')
    const inputRecoveryCode = document.querySelector('#member > .reminder [name="recovery_code"]')
    const inputSecretNew = document.querySelector('#member > .reminder [name="new_secret"]')

    const email = inputEmail.value
    const recoveryCode = inputRecoveryCode.value
    const secretNew = inputSecretNew.value

    if (!email || !recoveryCode || !secretNew) {
        alert('이메일, 복구 코드, 새로운 비밀번호를 모두 입력해주세요.')
        return
    }

    articleReminder.classList.add('display-none')

    const data = await memberApi('POST', '/user/recover', {
        email,
        recovery_code: recoveryCode,
        new_secret: secretNew,
    })

    if (data.success) {
        memberPrefillLoginEmail(email)
        memberShowRecoveryCode(data.recovery_code, '비밀번호를 재설정했습니다. 새 비밀번호로 로그인해주세요.\n사용한 복구 코드는 폐기되고 아래 코드로 바뀌었습니다.')
    } else {
        alert(`비밀번호 재설정에 실패했습니다.\n${memberErrorMessage(data.status, {
            403: '이메일 또는 복구 코드가 올바르지 않습니다.',
        })}`)
        articleReminder.classList.remove('display-none')
    }
}

async function memberReauthorTry() {
    const articleReauthor = document.querySelector('#member > .reauthor')

    const inputSecret = document.querySelector('#member > .reauthor [name="secret"]')
    const inputSecretNew = document.querySelector('#member > .reauthor [name="new_secret"]')

    const secret = inputSecret.value
    const secretNew = inputSecretNew.value

    if (!secret || !secretNew) {
        alert('현재 비밀번호와 변경할 비밀번호를 모두 입력해주세요.')
        return
    }

    articleReauthor.classList.add('display-none')

    const data = await memberApi('PATCH', '/user', { secret, new_secret: secretNew }, true)

    if (data.success) {
        memberSetToken(data.token)
        alert('비밀번호가 변경되었습니다!\n다른 기기에서는 로그아웃되었습니다.')
        memberFormClose()
    } else if (!memberSessionExpired(data.status)) {
        alert(`비밀번호 변경에 실패했습니다.\n${memberErrorMessage(data.status, {
            403: '현재 비밀번호가 올바르지 않습니다.',
        })}`)
        articleReauthor.classList.remove('display-none')
    }
}

function memberRecoveryIssueOpen(prompted = false) {
    const notice = document.querySelector('#member > .recovery-issue .notice')
    notice.classList.toggle('display-none', !prompted)

    memberFormOpen('recovery-issue')
}

async function memberRecoveryIssueTry() {
    const articleRecoveryIssue = document.querySelector('#member > .recovery-issue')

    const inputSecret = document.querySelector('#member > .recovery-issue [name="secret"]')

    const secret = inputSecret.value

    if (!secret) {
        alert('현재 비밀번호를 입력해주세요.')
        return
    }

    articleRecoveryIssue.classList.add('display-none')

    const data = await memberApi('POST', '/user/recovery-code', { secret }, true)

    if (data.success) {
        inputSecret.value = ''
        memberShowRecoveryCode(data.recovery_code, '새 복구 코드를 발급했습니다. 이전 복구 코드는 더 이상 쓸 수 없습니다.')
    } else if (!memberSessionExpired(data.status)) {
        alert(`복구 코드 발급에 실패했습니다.\n${memberErrorMessage(data.status, {
            403: '현재 비밀번호가 올바르지 않습니다.',
        })}`)
        articleRecoveryIssue.classList.remove('display-none')
    }
}

// Members who signed up before recovery codes existed are asked once per app load
async function memberRecoveryCheck() {
    if (memberRecoveryChecked) return
    memberRecoveryChecked = true

    const data = await memberApi('GET', '/user', null, true)
    if (data.success && !data.has_recovery_code) memberRecoveryIssueOpen(true)
}

async function memberSecurityLogOpen() {
    const data = await memberApi('GET', '/user', null, true)

    if (!data.success) {
        if (!memberSessionExpired(data.status)) alert('보안 기록을 불러오지 못했습니다.')
        return
    }

    const tbody = document.querySelector('#member > .security-log tbody')
    tbody.innerHTML = ''

    for (const log of data.security_log) {
        const tr = document.createElement('tr')
        tr.title = log.user_agent || ''

        const tdTime = document.createElement('td')
        tdTime.innerText = new Date(log.created_at).toLocaleString('ko-KR', {
            dateStyle: 'short',
            timeStyle: 'short',
        })

        const tdAction = document.createElement('td')
        tdAction.innerText = memberSecurityLogActions[log.action] || log.action

        const tdIp = document.createElement('td')
        tdIp.innerText = log.ip || '-'

        tr.append(tdTime, tdAction, tdIp)
        tbody.append(tr)
    }

    memberFormOpen('security-log')
}

function memberInputEnter(event, submit) {
    if (event.key !== 'Enter') return

    const inputs = Array.from(event.target.closest('article').querySelectorAll('input'))
    const next = inputs[inputs.indexOf(event.target) + 1]

    if (next) next.focus()
    else submit()
}
