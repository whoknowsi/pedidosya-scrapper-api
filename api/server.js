import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static.module'
import products from '../assets/static/db/products.json'
import categories from '../assets/static/db/categories.json'
import markets from '../assets/static/db/markets.json'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))

app.get('/products', (c) => {
  const { offset = 0, limit = 10, marketId } = c.req.queries

  let max = products.length
  let productsToSend = products

  if (marketId) {
    const productsIdByMarket = markets.find((market) => market.id === marketId)?.products || []
    max = productsIdByMarket.length
    productsToSend = productsToSend
      .filter((product) => productsIdByMarket.includes(product.id))
      .map((product) => {
        const { prices, ...prod } = product
        return { ...prod, price: prices.find((price) => price.market === marketId)?.price || null }
      })
  }

  productsToSend = productsToSend.slice(offset, offset + limit)

  const prev = max > offset
    ? `/products?limit=${limit}&offset=${Math.max(0, offset - limit)}${marketId ? `&marketId=${marketId}` : ''}`
    : null

  const next = max > offset + limit
    ? `/products?limit=${limit}&offset=${offset + limit}${marketId ? `&marketId=${marketId}` : ''}`
    : null

  c.json({
    products: productsToSend,
    offset,
    limit,
    count: productsToSend.length,
    max,
    prev,
    next
  })
})

app.get('/products/:id', (c) => {
  const { id } = c.req.param
  const foundProduct = products.find((product) => product.id === id)

  foundProduct ? c.json(foundProduct) : c.status(400).json({ message: 'Product not found' })
})

app.get('/markets', (c) => {
  c.json(
    markets.map(({ id, name }) => {
      return { id, name }
    })
  )
})

app.get('/static/*', serveStatic({ root: './' }))

export default app
