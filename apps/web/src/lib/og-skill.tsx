import { cachePolicy, toHeaderRecord } from '~/lib/cache-policy.mjs'
import { resolveOgAvatar } from '~/lib/og-avatar'
import { renderOgImage } from '~/lib/og-image.server'
import {
  FILL,
  INK,
  INK_SOFT,
  isLatinOnly,
  loadOgFonts,
  PAPER,
  seededWash,
  TEXT_FAINT,
  TEXT_SECONDARY,
  UME,
} from '~/lib/og-shared'
import { apiClient } from '~/lib/request'
import { fetchSkill } from '~/lib/skill.server'
import { buildSkillOgText } from '~/lib/skill-og-text'

export async function renderSkillOg(name: string): Promise<Response> {
  try {
    const [aggregation, skill] = await Promise.all([
      apiClient.aggregate.getAggregateData<AppThemeConfig>('yohaku|shiro'),
      fetchSkill(name),
    ])

    if (!skill) {
      return new Response('Failed to generate the OG image. Skill not found.', {
        status: 404,
      })
    }

    const {
      user: { avatar },
      seo,
      theme,
      url: aggregationUrl,
    } = aggregation as typeof aggregation & { url?: { webUrl?: string } }

    let domain = ''
    try {
      domain = aggregationUrl?.webUrl
        ? new URL(aggregationUrl.webUrl).hostname
        : ''
    } catch {
      domain = ''
    }

    const { description, eyebrow, sections, title, titleFontSize } =
      buildSkillOgText({
        name: skill.name ?? name,
        description: skill.description,
        body: skill.body,
      })

    const useGeist =
      isLatinOnly(title) &&
      isLatinOnly(description) &&
      isLatinOnly(sections.join('')) &&
      isLatinOnly(seo.title)
    const { fontFamily, fonts } = await loadOgFonts(useGeist)

    const ogAvatar = resolveOgAvatar(
      theme?.config.module?.og?.avatar || avatar,
      48,
    )

    const png = await renderOgImage(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          backgroundColor: PAPER,
          position: 'relative',
          overflow: 'hidden',
          fontFamily,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: seededWash(name),
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '44px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            height={44}
            src={ogAvatar}
            width={44}
            style={{
              borderRadius: '50%',
              marginRight: '16px',
              border: `1px solid ${FILL}`,
            }}
          />
          <span
            style={{
              fontSize: '26px',
              fontFamily,
              color: INK_SOFT,
              letterSpacing: '0.02em',
            }}
          >
            {seo.title}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '80px',
            bottom: '128px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '1040px',
          }}
        >
          <div
            style={{
              fontSize: '17px',
              letterSpacing: '0.16em',
              color: UME,
              fontWeight: 600,
              marginBottom: '18px',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: INK,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                marginTop: '22px',
                maxWidth: '900px',
                fontSize: '26px',
                lineHeight: 1.5,
                color: INK_SOFT,
              }}
            >
              {description}
            </div>
          ) : null}
          {sections.length > 0 ? (
            <div
              style={{
                marginTop: '30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '96px',
                  height: '1px',
                  backgroundColor: FILL,
                  marginBottom: '18px',
                }}
              />
              <div
                style={{
                  fontSize: '18px',
                  letterSpacing: '0.04em',
                  color: TEXT_SECONDARY,
                }}
              >
                {sections.join('  ·  ')}
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: '80px',
            right: '80px',
            bottom: '44px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {domain ? (
            <span
              style={{
                fontSize: '19px',
                fontFamily,
                color: TEXT_FAINT,
                letterSpacing: '0.04em',
              }}
            >
              {domain}
            </span>
          ) : null}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts,
      },
    )

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        ...toHeaderRecord(cachePolicy.og.primary),
      },
    })
  } catch (e: any) {
    return new Response(`Failed to generate the OG image. Error ${e.message}`, {
      status: 500,
    })
  }
}
