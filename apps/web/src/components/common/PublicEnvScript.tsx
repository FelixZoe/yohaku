const publicEnv = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  NEXT_PUBLIC_CLIENT_API_URL: process.env.NEXT_PUBLIC_CLIENT_API_URL || '',
  NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL || '',
}

const serializedPublicEnv = JSON.stringify(publicEnv).replaceAll('<', '\\u003c')

export const PublicEnvScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `window.__ENV = ${serializedPublicEnv}`,
    }}
  />
)
