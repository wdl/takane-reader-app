document.querySelector('#wrapper').addEventListener('touchmove', (e) => {
    const pageX = e.pageX || e?.touches[0]?.pageX || e?.changedTouches[0]?.pageX || e?.originalEvent?.touches[0]?.pageX || e?.originalEvent?.changedTouches[0]?.pageX
    const pageY = e.pageY || e?.touches[0]?.pageY || e?.changedTouches[0]?.pageY || e?.originalEvent?.touches[0]?.pageY || e?.originalEvent?.changedTouches[0]?.pageY
    if(pageX && pageY) {
        let object = document.elementFromPoint(pageX, pageY)
        while(object) {
            if(object.classList?.contains('scrollable')) {
                if(object.scrollHeight > object.offsetHeight) return
            }
            object = object.parentNode
        }
        e.preventDefault()
    }
})

document.querySelector('#wrapper').addEventListener('touchstart', (e) => {
    const pageX = e.pageX || e?.touches[0]?.pageX || e?.changedTouches[0]?.pageX || e?.originalEvent?.touches[0]?.pageX || e?.originalEvent?.changedTouches[0]?.pageX
    if(pageX < 10 || pageX > window.innerWidth - 10) {
        e.preventDefault()
    }
})

document.querySelectorAll('.scrollable').forEach(scrollable => {
    scrollable.addEventListener('touchstart', (e) => {
        const pageX = e.pageX || e?.touches[0]?.pageX || e?.changedTouches[0]?.pageX || e?.originalEvent?.touches[0]?.pageX || e?.originalEvent?.changedTouches[0]?.pageX
        if(pageX < 10 || pageX > window.innerWidth - 10) {
            e.preventDefault()
        }
        e.stopPropagation()
    })
    scrollable.addEventListener('scroll', (e) => {
        if(e.target.scrollTop === 0) e.target.scrollTop = 1
        if(e.target.scrollTop === e.target.scrollHeight - e.target.offsetHeight) e.target.scrollTop = e.target.scrollHeight - e.target.offsetHeight - 1
    })
})