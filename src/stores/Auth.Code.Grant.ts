import { Auth0UserProfile, WebAuth, AuthOptions } from 'auth0-js'
import { observable } from 'mobx'
import axios from './axios'

import opts from '../constants/auth'
import {
    getConfig,
    randomString,
    sha256,
    bufferToBase64UrlEncoded,
} from '../utils/auth0Utils'

const REFRESH_TOKEN_INTERVAL = 30 // seconds
const LOGOUT_INTERVAL = 5 * 60 // seconds

export class AuthStore {
    private logoutTimeout: any = null
    private checkSessionTimeout: any = null

    private auth0: WebAuth

    @observable
    private loggedUser?: Auth0UserProfile

    @observable
    private redirect?: string

    private settings: AuthOptions

    private config: any

    constructor() {
        this.settings = {
            domain: opts.AUTH0_DOMAIN,
            clientID: opts.AUTH0_CLIENT_ID,
            responseType: opts.AUTH0_RESPONSE_TYPE,
            redirectUri: opts.REDIRECT_URI,
        }
        this.auth0 = new WebAuth(this.settings)
    }

    // public api //

    public get user() {
        return this.loggedUser
    }

    public get redirectToPage() {
        return this.redirect
    }

    public async login() {
        try {
            this.config = this.config || (await getConfig(opts.AUTH0_DOMAIN))
            const search = new URLSearchParams(window.location.search)

            if (!search.has('code')) {
                this.redirectToLoginPage()
            }

            const code = search.get('code')
            const state = search.get('state')
            const code_verifier = sessionStorage.getItem(
                `login-code-verifier-${state}`
            )
            sessionStorage.removeItem(`login-code-verifier-${state}`)
            this.redirect = localStorage.getItem('currentPage') || undefined
            window.history.pushState('', document.title, window.location.origin)

            if (!code_verifier) {
                console.debug('unexpected state parameter')
                return
            }

            const settings: any = {
                code_verifier,
                code,
                audience: opts.API_AUDIENCE,
                client_id: opts.AUTH0_CLIENT_ID,
                redirect_uri: opts.REDIRECT_URI,
                grant_type: 'authorization_code',
            }

            // exchange the authorization code for a tokenset
            this.exchangeForToken(settings, true)
        } catch (err) {
            console.debug(err)
        }
    }

    public logout = () => {
        this.loggedUser = undefined
        if (this.logoutTimeout) clearTimeout(this.logoutTimeout)
        if (this.checkSessionTimeout) clearTimeout(this.checkSessionTimeout)
        this.auth0.logout({ returnTo: opts.REDIRECT_URI })
    }

    public setTimer() {
        console.debug('logout timeout: ', this.logoutTimeout)
        clearTimeout(this.logoutTimeout)
        this.logoutTimeout = setTimeout(() => {
            this.logout()
        }, LOGOUT_INTERVAL * 1000)
    }

    // private api //

    private checkSession = async () => {
        try {
            this.config = this.config || (await getConfig(opts.AUTH0_DOMAIN))
            const state = randomString(32)
            const codeVerifier = randomString(32)
            const codeChallenge = await sha256(codeVerifier).then(
                bufferToBase64UrlEncoded
            )
            const authorizationEndpointUrl = new URL(
                this.config.authorization_endpoint
            )

            // here we encode the authorization request
            authorizationEndpointUrl.search = new URLSearchParams({
                state,
                audience: opts.API_AUDIENCE,
                redirect_uri: opts.REDIRECT_URI,
                client_id: opts.AUTH0_CLIENT_ID,
                response_type: opts.AUTH0_RESPONSE_TYPE,
                response_mode: 'web_message',
                prompt: 'none',
                scope: opts.AUTH0_SCOPE,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
            }) as any

            // load the url in an iframe and wait for the response
            let authorizeResponse: any = {}
            try {
                authorizeResponse = await new Promise((resolve, reject) =>
                    this.injectIphrame(
                        resolve,
                        reject,
                        authorizationEndpointUrl,
                        state
                    )
                )
            } catch (injectIphrameError) {
                this.logout()
                console.debug(injectIphrameError)
            }

            // exchange the authorization code for a tokenset
            const settings = {
                audience: opts.API_AUDIENCE,
                client_id: opts.AUTH0_CLIENT_ID,
                redirect_uri: opts.REDIRECT_URI,
                grant_type: 'authorization_code',
                code_verifier: codeVerifier,
                code: authorizeResponse.code,
            }
            this.exchangeForToken(settings)
        } catch (err) {
            this.logout()
            console.debug(err)
        }
    }

    private redirectToLoginPage = async () => {
        try {
            localStorage.setItem('currentPage', window.location.pathname)
            const state = randomString(32)
            const codeVerifier = randomString(32)
            const codeChallenge = await sha256(codeVerifier).then(
                bufferToBase64UrlEncoded
            )
            // we need to store the state to validate the callback
            // and also the code verifier to send later
            sessionStorage.setItem(`login-code-verifier-${state}`, codeVerifier)
            this.config = this.config || (await getConfig(opts.AUTH0_DOMAIN))
            const authorizationEndpointUrl = new URL(
                this.config.authorization_endpoint
            )
            // here we encode the authorization request
            authorizationEndpointUrl.search = new URLSearchParams({
                state,
                audience: opts.API_AUDIENCE,
                redirect_uri: opts.REDIRECT_URI,
                // tslint:disable-next-line: no-string-literal
                client_id: opts.AUTH0_CLIENT_ID,
                response_type: 'code',
                scope: opts.AUTH0_SCOPE,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
            }) as any

            window.location.assign(authorizationEndpointUrl as any)
        } catch (err) {
            console.debug(err)
        }
    }

    private async exchangeForToken(
        settings: Record<string, string>,
        callUserInfo?: boolean
    ) {
        const tokenSet = await axios.post(
            this.config.token_endpoint,
            new URLSearchParams(settings)
        )

        // this has access_token, id_token, expires_in, scope, token_type.
        if (tokenSet.data.access_token) {
            const exp = tokenSet.data.expires_in * 1000 + new Date().getTime()
            console.debug('session expires at:', new Date(exp))
            this.checkSessionTimeout = setTimeout(
                this.checkSession,
                REFRESH_TOKEN_INTERVAL * 1000
            )
            this.setToken(tokenSet.data)
            if (callUserInfo) {
                try {
                    await this.auth0!.client.userInfo(
                        tokenSet.data.access_token,
                        (error, data) => {
                            if (error) {
                                console.debug(error)
                            }
                            this.setUser(data)
                            this.setTimer()
                        }
                    )
                } catch (userInfoError) {
                    console.debug(userInfoError)
                }
            }
        }
    }

    private setUser(user: Auth0UserProfile) {
        this.loggedUser = user
    }

    private setToken(data: any) {
        if (data.id_token && data.expires_in) {
            try {
                axios.defaults.headers.common.Authorization = `Bearer ${
                    data.access_token
                }` // for all requests
                // TODO do this better
                const axiosInterceptorResponse: any =
                    axios.interceptors.response
                if (axiosInterceptorResponse.handlers.length <= 1) {
                    axios.interceptors.response.use(
                        response => response,
                        error => {
                            if (
                                error.response &&
                                error.response.status === 401
                            ) {
                                console.debug('handling 401 response')
                                this.logout()
                                return error.response
                            }
                            return Promise.reject(error)
                        }
                    )
                }
            } catch (err) {
                console.log('impossible to parse Bearer Token')
            }
        }
    }

    private injectIphrame = async (
        resolve: any,
        reject: any,
        authorizationEndpointUrl: any,
        state: any
    ) => {
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'

        const timeoutSetTimeoutId = setTimeout(() => {
            try {
                reject(new Error('timed out'))
            } catch (err) {
                console.debug(err)
            }
            window.document.body.removeChild(iframe)
        }, 60 * 1000)

        function responseHandler(e: any) {
            try {
                if (
                    e.origin !== authorizationEndpointUrl.origin ||
                    e.data.type !== 'authorization_response'
                ) {
                    return
                }
                e.source.close()
                clearTimeout(timeoutSetTimeoutId)
                window.removeEventListener('message', responseHandler, false)
                window.document.body.removeChild(iframe)
                const response = e.data.response
                if (response.error) {
                    return reject(response)
                }
                if (response.state !== state) {
                    return reject(new Error('State does not match.'))
                }
                resolve(response)
            } catch (genericError) {
                console.debug(genericError)
            }
        }

        window.addEventListener('message', responseHandler)
        window.document.body.appendChild(iframe)
        iframe.setAttribute('src', authorizationEndpointUrl as any)
    }
}
export default AuthStore
