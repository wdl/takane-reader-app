async function fetchContentsText(hash, pos, length) {
    try {
        return await fetchContentsTextFromCache(hash, pos, length)
    } catch(e) {
        console.log(e)
        return await fetchContentsTextFromServer(hash, pos)
    }
}

async function fetchContentsTextFromCache(hash, pos, contentslength) {
    const cacheContentsInfo = JSON.parse(localStorage.getItem('cache-contents-info'))

    if(cacheContentsInfo.hash !== hash) throw new Error('No Cache!')
    
    const cachePosStart = cacheContentsInfo.index
    const cachePosEnd = cacheContentsInfo.index + cacheContentsInfo.length

    const reqPosStart = pos < 0 ? 0 : pos
    const reqPosEnd = pos + config.contents.text.pageLength > contentslength ? contentslength : pos + config.contents.text.pageLength

    if(reqPosStart < cachePosStart || reqPosEnd > cachePosEnd) throw new Error('Range Out!')

    const calcPosStart = reqPosStart - cachePosStart
    const calcPosEnd = reqPosEnd - cachePosStart
    
    const cache = localStorage.getItem('cache-contents')
    return cache.slice(calcPosStart, calcPosEnd)
}

async function fetchContentsTextFromServer(hash, pos) {
    try {
        const posCache = pos - config.contents.text.cacheLength / 2 < 0 ? 0 : pos - config.contents.text.cacheLength / 2

        const res = await capi({
            method: 'GET',
            url: `/${hash}/contents/${posCache}?length=${config.contents.text.cacheLength}`,
            rowResponse: true
        })

        const text = res.data

        localStorage.setItem('cache-contents-info', JSON.stringify({
            hash,
            index: posCache,
            length: text.length
        }))
        localStorage.setItem('cache-contents', text)

        const calcPos = pos - posCache
                
        return text.slice(calcPos, calcPos + config.contents.text.pageLength)
    } catch(e) {
        if (e.message === 'Unauthorized') {} else {
            console.error(e)
            alert('Unknown Error!')
        }
    }
}

async function fetchContentsImage(hash, pos) {
    try {
        const res = await capi({
            method: 'GET',
            url: `/${hash}/contents/${pos}`,
            rowResponse: true
        })

        const image = res.data

        console.log(image)
                
        return 
    } catch(e) {
        if (e.message === 'Unauthorized') {} else {
            console.error(e)
            alert('Unknown Error!')
        }
    }
}