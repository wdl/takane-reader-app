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

    const data = await capi({
        method: 'POST',
        url: '/user',
        data: { email, secret }
    })

    if (data.success) {
        alert('회원가입이 완료되었습니다.\n등록하신 이메일을 확인하세요.')
        memberFormClose()
    } else {
        alert(`회원가입에 실패했습니다.\n${data.error}`)
        articleRegister.classList.remove('display-none')
    }
}

async function memberReminderTry() {
    const articleRegister = document.querySelector('#member > .reminder')

    const inputEmail = document.querySelector('#member > .reminder [name="email"]')

    const email = inputEmail.value

    if (!email) {
        alert('이메일을 입력해주세요.')
        return
    }

    articleRegister.classList.add('display-none')

    const data = await capi({
        method: 'PUT',
        url: '/user',
        data: { email }
    })

    if (data.success) {
        alert('계정찾기를 시도하였습니다.\n등록하신 이메일을 확인하세요.')
        memberFormClose()
    } else {
        alert(`계정찾기에 실패했습니다.\n${data.error}`)
        articleRegister.classList.remove('display-none')
    }
}

async function memberReauthorTry() {
    const articleRegister = document.querySelector('#member > .reauthor')

    const inputSecret = document.querySelector('#member > .register [name="secret"]')

    const secret = inputSecret.value

    if (!secret) {
        alert('변경할 비밀번호를 입력해주세요.')
        return
    }

    articleRegister.classList.add('display-none')

    const data = await capi({
        method: 'PATCH',
        url: '/user',
        data: { new_secret: secret }
    })

    if (data.success) {
        alert('비밀번호가 변경되었습니다!')
        memberFormClose()
    } else {
        alert(`비밀번호 변경에 실패했습니다.\n${data.error}`)
        articleRegister.classList.remove('display-none')
    }
}

function memberRegisterEmailEnter(event) {
    if (event.code === 'Enter') {
        const inputSecret = document.querySelector('#member > .register [name="secret"]')
        inputSecret.focus()
    }
}

function memberRegisterSecretEnter(event) {
    if (event.code === 'Enter') {
        memberRegisterTry()
    }
}

function memberReminderEmailEnter(event) {
    if (event.code === 'Enter') {
        memberReminderTry()
    }
}

function memberReauthorSecretEnter(event) {
    if (event.code === 'Enter') {
        memberReauthorTry()
    }
}