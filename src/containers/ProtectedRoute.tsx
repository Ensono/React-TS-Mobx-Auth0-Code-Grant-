import React, { Component } from 'react'
import { observer, inject } from 'mobx-react'
import { Route, RouteProps } from 'react-router-dom'
import { AuthStore, StoreNames, Routing } from '../stores'
import Loader from 'react-loader'

export interface ProtectedRouteProps extends RouteProps {
    component: any
    redirectTo?: string
}

export interface ProtectedRouteConnectedProps extends ProtectedRouteProps {
    auth: AuthStore
    routing: Routing
}

@inject(StoreNames.auth, StoreNames.routing)
@observer
export class ProtectedRoute extends Component<ProtectedRouteProps> {
    private redirected: boolean = false
    get store() {
        return this.props as ProtectedRouteConnectedProps
    }

    public componentDidMount() {
        const { user } = this.store.auth
        if (!user) {
            this.store.auth.login()
        }
    }

    public render() {
        const { user, redirectToPage } = this.store.auth
        const { push } = this.store.routing
        if (user && redirectToPage && !this.redirected) {
            this.redirected = true
            push(redirectToPage)
        }
        // tslint:disable-next-line: no-shadowed-variable
        const { component: Component, redirectTo, ...rest } = this.props as any
        console.debug('deep-linking -> redirect to: ', redirectToPage)
        return (
            <Route
                {...rest}
                render={props => {
                    if (user) {
                        window.location.hash = ''
                        return <Component {...props} />
                    }
                    return <Loader loaded={true} />
                }}
            />
        )
    }
}

export default ProtectedRoute
