import React, { Component } from 'react'
import { Router, Switch } from 'react-router-dom'
import { ProtectedRoute } from './containers/ProtectedRoute'
import { createBrowserHistory, History } from 'history'
import { Provider } from 'mobx-react'
import { syncHistoryWithStore } from 'mobx-react-router'

import { Home } from './routes'
import { stores } from './stores'

class App extends Component {
    public browserHistory: History
    public mobxSyncedHistory: any
    constructor(props: any) {
        super(props)
        this.browserHistory = createBrowserHistory()
        this.mobxSyncedHistory = syncHistoryWithStore(
            this.browserHistory,
            stores.routing!
        )
    }
    public render() {
        return (
            <Provider {...stores}>
                <Router history={this.mobxSyncedHistory}>
                    <Switch>
                        <ProtectedRoute
                            path="/"
                            exact={true}
                            component={Home}
                        />
                    </Switch>
                </Router>
            </Provider>
        )
    }
}

export default App
