export interface ActivityAssets {
  readonly appDescription: Record<string, string>
  readonly appIcon: Record<string, string>
}

export const emptyActivityAssets: ActivityAssets = {
  appDescription: {},
  appIcon: {},
}

export const ACTIVITY_ASSET_CDN =
  'https://fastly.jsdelivr.net/gh/Innei/reporter-assets@main'

export const fetchActivityAssets = () =>
  Promise.all([
    fetch(`${ACTIVITY_ASSET_CDN}/app-icon.json`).then(
      (response) => response.json() as Promise<Record<string, string>>,
    ),
    fetch(`${ACTIVITY_ASSET_CDN}/app-desc.json`).then(
      (response) => response.json() as Promise<Record<string, string>>,
    ),
  ])

export const resolveActivityAppIconURL = (
  displayName: string | null | undefined,
  explicitURL: string | null | undefined,
  appIcons: Record<string, string>,
) => {
  if (explicitURL) return explicitURL
  if (!displayName) return null

  const assetName = appIcons[displayName]
  return assetName ? `${ACTIVITY_ASSET_CDN}/apps/${assetName}.png` : null
}
