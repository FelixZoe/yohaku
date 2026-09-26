export const getDefaultLinkSections = (
  t: (key: string) => string,
  socialIds: Record<string, string | undefined> = {},
): LinkSection[] => {
  const email = socialIds.email || socialIds.mail
  const github = socialIds.github
  const contactLinks: LinkSection['links'] = [
    {
      name: t('footer_write_message'),
      href: '/message',
    },
  ]

  if (email) {
    contactLinks.push({
      name: t('footer_send_email'),
      href: `mailto:${email}`,
      external: true,
    })
  }

  if (github) {
    contactLinks.push({
      name: 'GitHub',
      href: `https://github.com/${github}`,
      external: true,
    })
  }

  return [
    {
      name: t('footer_section_about'),
      links: [
        {
          name: t('footer_about_site'),
          href: '/about-site',
        },
        {
          name: t('footer_about_me'),
          href: '/about-me',
        },
        {
          name: t('footer_about_project'),
          href: 'https://github.com/Innei/Yohaku',
          external: true,
        },
      ],
    },
    {
      name: t('footer_section_more'),
      links: [
        {
          name: t('nav_timeline'),
          href: '/timeline',
        },
        {
          name: t('nav_friends'),
          href: '/friends',
        },
      ],
    },
    {
      name: t('footer_section_contact'),
      links: contactLinks,
    },
  ]
}

export interface FooterConfig {
  linkSections: LinkSection[]
  otherInfo: OtherInfo
}
