import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>AzerothAH - WoW Anniversary Realm AH Tracker</title>
        <meta name="description" content="Track WoW Classic Anniversary realm auction house prices and calculate crafting profits across all servers" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
