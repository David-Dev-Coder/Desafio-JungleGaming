// Generated-style route tree. Keep route registrations in sync with src/routes.
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as detailRoute } from './routes/nft.$nftId'
import { Route as cartRoute } from './routes/cart'
import { Route as loginRoute } from './routes/login'
import { Route as checkoutRoute } from './routes/checkout'
import { Route as confirmationRoute } from './routes/confirmation.$orderId'
import { Route as profileRoute } from './routes/profile'

const rootWithChildren = rootRoute.addChildren([indexRoute, detailRoute, cartRoute, loginRoute, checkoutRoute, confirmationRoute, profileRoute])
export const routeTree = rootWithChildren
