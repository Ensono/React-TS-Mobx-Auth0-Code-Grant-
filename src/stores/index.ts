// first party
import { RouterStore as Routing } from 'mobx-react-router'
import { AuthStore } from './Auth.Code.Grant'

// re-exports
export { Routing }
export * from './Auth.Code.Grant'

export interface Stores {
    routing: Routing
    auth: AuthStore
}

type StoreNamesGuard = keyof Stores

export class StoreNames {
    public static routing: StoreNamesGuard = 'routing'
    public static auth: StoreNamesGuard = 'auth'
}

const localStores: Partial<Stores> = {
    routing: new Routing(),
    auth: new AuthStore(),
}

// test comment
export const stores = { ...localStores }
