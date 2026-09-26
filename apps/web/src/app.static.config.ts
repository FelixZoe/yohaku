export const appStaticConfig = {
  cache: {
    enabled: true,

    ttl: {
      // Shared by aggregate data fetches in RootLayout and `/aggregate/site` metadata fetches.
      aggregation: 600,
    },
  },

  revalidate: 1000 * 10, // 10s
}

export const CDN_HOST = 'cdn.innei.ren'
