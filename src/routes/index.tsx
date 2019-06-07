import React, { Component } from 'react'
import { observer, inject } from 'mobx-react'
import { StoreNames, AuthStore } from '../stores'

// internal props
export interface HomeProps {}

// MobX props
interface HomeConnectedProps extends HomeProps {
    auth: AuthStore
}
// intersection of all props

@inject(StoreNames.auth)
@observer
export class Home extends Component<HomeProps> {
    get store() {
        return this.props as HomeConnectedProps
    }
    public render() {
        const { logout, user, setTimer } = this.store.auth
        return (
            <div
                onClick={setTimer}
                onScroll={setTimer}
                onKeyDown={setTimer}
            >
                {user && <h1> hey {user.name}</h1>}
                <button onClick={logout}>Logout</button>
            </div>
        )
    }
}
