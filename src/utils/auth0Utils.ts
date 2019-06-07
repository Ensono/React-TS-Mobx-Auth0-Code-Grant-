/**
 * Generates a cryptographically secure random string
 * of variable length.
 *
 * The returned string is also url-safe.
 *
 * @param {Number} length the length of the random string.
 * @returns {String}
 */
export const randomString = (length: number) => {
    const validChars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    array = array.map(x => validChars.charCodeAt(x % validChars.length))
    return String.fromCharCode(...(array as any))
}

/**
 * Takes a base64 encoded string and returns a url encoded string
 * by replacing the characters + and / with -, _ respectively,
 * and removing the = (fill) character.
 *
 * @param {String} input base64 encoded string.
 * @returns {String}
 */
export const urlEncodeB64 = (input: any): string => {
    const b64Chars = { '+': '-', '/': '_', '=': '' }
    return input.replace(/[\+\/=]/g, (m: any) => b64Chars[m])
}

/**
 * Takes an ArrayBuffer and convert it to Base64 url encoded string.
 * @param {ArrayBuffer} input
 * @returns {String}
 */
export const bufferToBase64UrlEncoded = (input: any) => {
    const bytes = new Uint8Array(input)
    return urlEncodeB64(window.btoa(String.fromCharCode(...(bytes as any))))
}

/**
 * Returns the sha256 digst of a given message.
 * This function is async.
 *
 * @param {String} message
 * @returns {Promise<ArrayBuffer>}
 */
export const sha256 = (message: any) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    return window.crypto.subtle.digest('SHA-256', data)
}

/**
 * fetch the openid configuration for the issuer
 * @returns {Promise<any>}
 */
export const getConfig = async (url: string) => {
    try {
        const response = await fetch(
            // tslint:disable-next-line: no-string-literal
            `https://${url}/.well-known/openid-configuration`
        )
        return response.json()
    } catch (err) {
        console.debug(err)
    }
}

/**
 * delays execution of a function
 * @returns {Function}
 */
export const debounce = (func: any, delay: any) => {
    let debounceTimer: any
    return function() {
        // tslint:disable-next-line: no-this-assignment
        const context = this
        const args = arguments
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => func.apply(context, args), delay)
    }
}
