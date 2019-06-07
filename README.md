This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## PR Welcome!!

## references:

[OAuth 2.0 Security Best Current Practice
draft-ietf-oauth-security-topics-11](https://tools.ietf.org/html/draft-ietf-oauth-security-topics-11)

[OAuth 2.0 for Browser-Based Apps
draft-parecki-oauth-browser-based-apps-02](https://tools.ietf.org/html/draft-parecki-oauth-browser-based-apps-02).

# Summary

The original OAuth2 specification introduces the implicit grant in SPAs as the way JavaScript code can obtain access tokens and call APIs directly from a browser. Returning access tokens in a URL (the technique used by the implicit grant for SPAs) is fraught by known systemic issues requiring explicit mitigation. However, given the state of browser and web technologies when the grant was first introduced, that was also the only game in town for the scenario.

The OAuth2 working group determined it's time to recommend a different grant to obtain access tokens from SPAs — specifically the authorization code grant for public clients with PKCEMain drivers appear to have been the ubiquity of CORS and the emergence of sender-constrained technologies.

The new recommendation imposes more requirements on the authorization server, but it doesn't suffer from the issues inherent in returning access tokens in a URL. That results in less mitigation logic required by the client.

If you are building a new SPA, you should consider implementing the new guidance based on authorization code with PKCE. More details below.

## Keeping things in perspective

Some of you might find that the above summary (and this post in general) doesn't convey the urgency and the alarmed tone you might have noticed in other discussions calling for the immediate cessation of any use of the implicit flow in general. That might have given you a bit of cognitive whiplash, considering that the shortcomings of that grant have been known since 2012 and a very large number of SPAs currently in production, including very prominent products widely adopted and being used every day without major disruptions.

Often those discussions feature well-intentioned generalizations, borne out of necessity to keep communications concise and the discussion accessible to the non-initiated. Add to that the fact that, as trusted security experts, we tend to favor the better-safe-than-sorry mantra, and you'll get advice that often lacks nuance. It's a bit like recommending you to always go buy your groceries in a tank: we'll feel confident we gave you advice that will keep you secure, but you are left to figure out how to exchange your Prius for a tank, how to find parking for it, etc… and if you don't live in a war zone, perhaps the actual risk doesn't justify the investment.

The challenge is that when it comes to standards and security, often deciding whether you live in a war zone or not comes down to reading long specs, paying attention to language with lawyer-like focus. In this post we'll try to spare you some of that and equip you with actionable information, so that you can decide for yourself if and when to do your investment. But of course, when in doubt, if you can afford it, a tank is a pretty cool ride.

## If you are using Auth0:

The existing Auth0 JavaScript SDKs are based on the traditional guidance. Please ensure you are implementing the mitigations that are appropriate for your scenario. More about this later in the post.
The Auth0 endpoints support all the features required to implement the new recommendation: you can find sample code later in this post
Support for the new approach will soon be available in Auth0 JS SDKs

# Available Scripts

In the project directory, you can run:

### `yarn`

Install all dependencies

### `yarn start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

please make sure this is running on port 3000 as only this domain is whitelisted in Auth0

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

`user: batman@gotham.com`
`pwd: Password01!`

### `yarn test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

currently there are no tests, feel free to contribute!

### `yarn run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

# Details

## The Issues

-   `Insufficient redirect URI validation.` If your AS of choice doesn't enforce a strict match between the redirect URI requested at runtime and the one previously registered for your client, for example by accepting URLs containing wildcards, an attacker might redirect the response (containing the token you requested!) to a URL they control and harvest your credentials. Note: Auth0 enforces strict matching by default.
-   `Credential leakage by referrer header.` Without explicit countermeasures (like setting the Referrer-Policy header), requesting a page right after authentication could leak the access token in the Referer header to whoever controls that page .
-   `Browser history.` The fragment with the access token may end up in your browser's history, hence exposed to any attack accessing it .
-   `Token injection.` Say that an attacker manages to modify a response and substitute the token coming from the AS with one stolen from elsewhere, for example a token issued for a completely different user. There's no way to detect this happened when using the implicit grant as described.

## The Solution

The idea is that the redirect leg of the flow, the one engaging with the authorization endpoint, would only be used to request and obtain an authorization code, and that that interaction would be protected by PKCE to prevent attackers from messing with the code. Once obtained the authorization code, the JavaScript would then proceed to redeem it with the token endpoint- just like it's done by mobile and desktop clients. That would nicely make issues I, II, and III moot.

The catch? The token endpoint on your AS of choice MUST support CORS for the trick to come together. That's not too exotic a feature, but I believe that at this time not every major vendor supports it yet.

The best way to get a feeling of how different this grant is from the implicit one is to compare and contrast what actually goes on the wire.

Here there's the initial request for an authorization code

```GET https://yourAuth0Domain.auth0.com/authorize
  ?audience=https://yourAuth0Domain.com/api/
  &redirect_uri=http://localhost:3000/
  &client_id=IrbblpeZJRMewq8suTx0PcmHlporj6yZ
  &response_type=code
  &scope=openid profile email read:appointments
  &code_challenge=xc3uY4-XMuobNWXzzfEqbYx3rUYBH69_zu4EFQIJH8w
  &code_challenge_method=S256
  &state=p1Qaoiy67CA1J7iNRaPsu1AWQYXVShYI
```

That looks like a classic authorization code request, doesn't it? Note the `code_challenge` and `code_challenge_method`, showing that we are using PKCE.

Assuming successful authentication and consent (not traced here) here the Response:

```
302 HTTP/2.0
location: http://localhost:3000/
  ?code=DiXOZqP_t1eX1CVc
  &state=p1Qaoiy67CA1J7iNRaPsu1AWQYXVShYI
set-cookie: auth0=s%3AMaLRoS9Q0WdZ2oI5T4sgOxBna16OarTI.pSedvnX9ctZOkcs9lPkXcNfQn3ciUSxc%2B2K8N6XzOPg; Path=/; Expires=Sun, 06 Jan 2019 19:25:57 GMT; HttpOnly; Secure
Found. Redirecting to <a href="http://localhost:3000/?code=DiXOZqP_t1eX1CVc&amp;state=p1Qaoiy67CA1J7iNRaPsu1AWQYXVShYI">http://localhost:3000/?code=DiXOZqP_t1eX1CVc&amp;state=p1Qaoiy67CA1J7iNRaPsu1AWQYXVShYI</a>
```

Your JavaScript code picks up the code, and redeems it against the token endpoint. This is the part where the CORS support for the token endpoint becomes necessary.

then the code will fire a POST to the Token Server:

```
POST https://yourAuth0Domain.auth0.com/oauth/token HTTP/2.0
authority: yourAuth0Domain.auth0.com
content-length: 231
origin: http://localhost:3000
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36
content-type: application/x-www-form-urlencoded; charset=UTF-8
accept: */*
referer: http://localhost:3000/?code=DiXOZqP_t1eX1CVc&state=p1Qaoiy67CA1J7iNRaPsu1AWQYXVShYI
  audience=https%3A%2F%2FyourAuth0Domain.com%2Fapi%2F
  &client_id=IrbblpeZJRMewq8suTx0PcmHlporj6yZ
  &redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F
  &grant_type=authorization_code
  &code_verifier=Huag6ykQU7SaEYKtmNUeM8txt4HzEIfG
  &code=DiXOZqP_t1eX1CVc
```

Please note the code verifier here, to close the PKCE check.

and the Response:

```
200 HTTP/2.0
date: Thu, 03 Jan 2019 19:25:58 GMT
content-type: application/json
content-length: 1932

{
  "access_token":"eyJ[..]7GQ",
  "id_token":"eyJ0[..]kH7g",
  "expires_in":86400,
  "token_type":"Bearer"
}
```

We got back an access token to our JavaScript client, without leaving any trace of it in the browser history or in future referral header, and without exposing ourselves to the risk of routing the token bits to the wrong place via redirects. This is kinda magic!

Done so, the current implementation of this library will poll the AS to renew the session and eventually acquire a new token, this last part depends on your needed implementation as not always we want to poll the AS, an alternative might be checking for token expiration time? We trust your judgement here :)

## Renewing access tokens

he approach described so far works for the initial access token acquisition, entailing explicit user interaction. Access tokens don't strictly need to, but they often expire after a relatively short time. A best practice creates natural opportunities for enforcing revocation and minimizing exposure. When an access token expires, native apps implemented as public clients don't usually force the end user through another prompt — they use refresh tokens to silently obtain a new access token.

Here comes the fun part. If you search through stackoverflow and blogs, you'll see that one of the reasons why identity experts pushed back when customers proposed use of authorization code in SPA — the risk of leaking refresh tokens. Refresh tokens are powerful artifacts, and in the case of public clients you don't even need to steal a secret to use them: once you get your hands on a refresh token, you can use it right away. The fact that a browser doesn't really offer safe places to save critical artifacts (see all the debacle on the use of storage for access tokens, a far less powerful credential, and the significant risk of XSS attacks dumping them out) didn't help at all, of course.

What changed? Why is it suddenly OK to use refresh tokens in a browser? The answer lies mostly in the emerging sender-constrained tokens technologies. Using token binding or mutual TLS authentication, it is possible to tie a particular refresh token to the client instance it originally requested; that means that an attacker obtaining the bits of a refresh token wouldn't be able to use it. That's the theory, at least: unfortunately neither technologies are widely available in the wild. Token binding suffered an important setback when Chrome walked back its support, and iOS never committed to implementation. The MTLS spec is more promising in term of potential adoption, but it's still early days (it's still a draft being actively worked on) and there are details to iron out (for example, using this technique from a browser might pop out UX unexpectedly). That means that in practice today you can't use sender constrained refresh tokens with most mainstream providers.

Not everything is lost, though. The best practices doc states that another acceptable mechanism for protecting refresh tokens for use in public clients (not just browsers) is refresh token rotation, a feature that invalidates a refresh token and issues a new one whenever it is used to refresh an access token. Security-wise, that's a great feature. In real life that can become a handful: think of what happens if you have multiple client instances sharing a token store (you need to serialize access) or if you successfully use a refresh token but fail to receive a new one. Either way: I personally know of only two products supporting refresh token rotation as of today. Neither Microsoft, Google, nor Auth0 offer it at the moment.

Given that the guidance above is about public clients, not just browsers, it would appear that most current native clients violate it (though that doesn't make them non-compliant with the standard, given that the best practices document doesn't amend the original OAuth2 specification).

What to do? Considering that a browser is a far more dangerous environment than, say, a mobile platform app sandbox, I would recommend that unless (or until) your scenario does offer one of those refresh token protection features, that you do NOT use refresh tokens in your SPAs.

Luckily, there is an alternative to renew access tokens in SPAs without using refresh tokens AND without falling back to implicit. You can leverage the presence of a session cookie with the AS to request a new authorization code without showing any UX via hidden iframe and prompt=none (assuming your AS does OpenId Connect as well). That is the same trick we use in the implicit flow, but the difference is that here we get back a code rather than a token — obtaining the same advantages we did in the interactive version of the flow.

Here a request for a new access token via hidden iFrame

```
GET https://yourAuth0Domain.auth0.com/authorize
  ?audience=https://yourAuth0Domain.com/api/
  &redirect_uri=http://localhost:3000/
  &client_id=IrbblpeZJRMewq8suTx0PcmHlporj6yZ
  &response_type=code
  &response_mode=web_message
  &prompt=none
  &scope=openid profile email read:appointments
  &code_challenge=WtcXoh6_3hCtvn15TW0VEFrjru2kRZO8kWcFurXMo4Y
  &code_challenge_method=S256
  &state=QIA33u4JKTwCmXjPcZXoHyJD5h5szwFs
cookie: auth0=s%3AMaLRoS9Q0WdZ2oI5T4sgOxBna16OarTI.pSedvnX9ctZOkcs9lPkXcNfQn3ciUSxc%2B2K8N6XzOPg
```

Things to notice:

-   The request looks a lot like the one we observed during the interactive phase, including all the PKCE machinery.
-   One important difference is the prompt=none directive. We want this to happen without any UX.
-   Another fundamental difference is that our request is accompanied by the session cookie, which should prove the user's sign in status without prompts
-   In Auth0 we like web_message as response_mode when communicating with iframes. For the purpose of discussing differences between implicit vs authorization code grants it doesn't make much of a difference.

The response returns the requested code, delivered via JS as expected. The AS also takes the opportunity to update the session cookie.

```
200 HTTP/2.0
set-cookie: auth0=s%3AMaLRoS9Q0WdZ2oI5T4sgOxBna16OarTI.pSedvnX9ctZOkcs9lPkXcNfQn3ciUSxc%2B2K8N6XzOPg; Path=/; Expires=Sun, 06 Jan 2019 20:12:07 GMT; HttpOnly; Secure

<!DOCTYPE html><html><head><title>Authorization Response</title></head><body><script type="text/javascript">(function(window, document) {var targetOrigin = "http://localhost:3000";var webMessageRequest = {};var authorizationResponse = {type: "authorization_response",response: {"code":"a_Yja9QKgxtwCnA2","state":"QIA33u4JKTwCmXjPcZXoHyJD5h5szwFs"}};var mainWin = (window.opener) ? window.opener : window.parent;if (webMessageRequest["web_message_uri"] && webMessageRequest["web_message_target"]) {window.addEventListener("message", function(evt) {if (evt.origin != targetOrigin)return;switch (evt.data.type) {case "relay_response":var messageTargetWindow = evt.source.frames[webMessageRequest["web_message_target"]];if (messageTargetWindow) {messageTargetWindow.postMessage(authorizationResponse, webMessageRequest["web_message_uri"]);window.close();}break;}});mainWin.postMessage({type: "relay_request"}, targetOrigin);} else {mainWin.postMessage(authorizationResponse, targetOrigin);}})(this, this.document);</script></body></html>
```

From this point onward, the code redemption against the token endpoint plays out just like we described for the interactive portion of the flow.

Hopefully this clarified how you can perform background token renewals without requiring a refresh token in JavaScript. That works pretty well, though there's something that kind of ruins the party for me. The mechanism described here still relies on the iframe to be able to access the session cookie. There are various situations where that access might not be granted, as it is the case in Apple's ITP2 (see discussion [here](https://github.com/whatwg/html/issues/3338)). Using a refresh token would make the issue moot, which is why I believe it is worth it to keep an eye on this matter and push for more widespread adoption of the security measures that would make refresh tokens usable from JavaScript. There is an entirely different chapter about what the implications for distributed session termination would be, but this post is long enough as it is already.

This solution is based on [this Auth0 article](https://auth0.com/blog/oauth2-implicit-grant-and-spa/) by [Vittorio Bertocci](https://auth0.com/blog/authors/vittorio-bertocci/) Principal Architect at Auth0 and some snippets of code (mainly the iFrame bit) from [Jose Romaniello](https://www.linkedin.com/in/joseromaniello/?locale=en_US)
