import { firefox } from 'playwright'
import dotenv from 'dotenv'
import { saveMarketStatic } from './db/local.js'
import { randomBetween } from './utils/utils.js'

dotenv.config()

const ScrapeData = async (browser, { marketName, partnerId }) => {
  const page = await browser.newPage()
  const baseUrl = process.env.BASE_URL
  await page.goto(baseUrl)

  const categoryUrlSplit = process.env.PEDIDOSYA_CATEGORY_URL.split('${}')
  const categoriesUrl =
    categoryUrlSplit[0] + randomBetween(100000, 999999) + categoryUrlSplit[1] + partnerId + categoryUrlSplit[2]

  console.log(marketName)

  const productLink = process.env.PEDIDOSYA_PRODUCT_URL.split('${}')

  const categories = await page.evaluate(
    async ({ categoriesUrl, partnerId, marketName, productLink }) => {
      const getCategoryUrl = (productId, partnerId) => productLink[0] + productId + productLink[1] + partnerId + productLink[2]

      const response = await fetch(categoriesUrl)
      const categories = await response.json()
      const categoriesResponse = []

      for (const category of categories.data) {
        const categoryId = category.id
        const categoryName = category.name

        const response = await fetch(getCategoryUrl(categoryId, partnerId))
        const productsData = await response.json()
        console.log('products data', productsData)
        const products = productsData.data.map((d) => {
          return {
            image: d.image,
            name: d.name,
            price: d.price,
            date: new Date(Date.now()),
            barcode: d.integrationCode,
            measurementUnit: d.measurementUnit,
            pricePerMeasurementUnit: d.pricePerMeasurementUnit
          }
        })

        const categories = {
          name: marketName,
          category: {
            name: categoryName,
            products
          }
        }

        categoriesResponse.push(categories)
      }

      return categoriesResponse
    },
    { categoriesUrl, partnerId, marketName, productLink }
  )

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]
    await saveMarketStatic(category, i + 1)
  }

  return await page.close()
}

;(async () => {
  const browser = await firefox.launch()
  const initalTime = Date.now()

  const dataMarkets = JSON.parse(process.env.DATA_MARKETS)
  console.log(dataMarkets)
  for (const data of dataMarkets) {
    await ScrapeData(browser, data)
  }

  await browser.close()

  const finalTime = Date.now()
  console.log(`Finish scraping in ${((finalTime - initalTime) / 1000).toFixed()} seconds`)
})()
