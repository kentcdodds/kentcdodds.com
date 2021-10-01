import * as React from 'react'
import {externalLinks} from '../external-links'
import {AnchorOrLink} from '~/utils/misc'
import {useRootData} from '~/utils/use-root-data'
import {ConvertKitForm} from '../convertkit/form'
import {H4, H6, Paragraph} from './typography'
import {GithubIcon} from './icons/github-icon'
import {TwitterIcon} from './icons/twitter-icon'
import {YoutubeIcon} from './icons/youtube-icon'
import {Signature} from './signature'
import {Link} from 'remix'
import {ArrowIcon} from './icons/arrow-icon'
import {getImgProps, images} from '~/images'

function NewsletterSection() {
  return (
    <div>
      <H6 as="div">Stay up to date</H6>
      <div className="mt-4 max-w-md">
        <Paragraph prose={false}>
          {`
            Subscribe to the newsletter to stay up to date with articles,
            courses and much more!
          `}
          <Link
            prefetch="intent"
            to="/subscribe"
            className="text-secondary underlined hover:text-team-current focus:text-team-current"
          >
            {`Learn more`}{' '}
            <ArrowIcon className="inline-block" direction="top-right" />
          </Link>
        </Paragraph>
      </div>

      <ConvertKitForm formId="newsletter" convertKitFormId="827139" />
    </div>
  )
}
function ContactSection() {
  return (
    <div>
      <H6 as="div">Contact</H6>
      <ul className="mt-4">
        <FooterLink name="Email Kent" href="/contact" />
        <FooterLink name="Call Kent" href="/calls" />
        <FooterLink name="Office hours" href="/office-hours" />
      </ul>
    </div>
  )
}
function GeneralSection() {
  return (
    <div>
      <H6 as="div">General</H6>
      <ul className="mt-4">
        <FooterLink name="My Mission" href="/transparency" />
        <FooterLink name="Privacy policy" href="/transparency#privacy" />
        <FooterLink name="Terms of use" href="/transparency#terms" />
        <FooterLink name="Code of conduct" href="/conduct" />
      </ul>
    </div>
  )
}

function SitemapSection() {
  return (
    <div>
      <H6 as="div">Sitemap</H6>
      <ul className="mt-4">
        <FooterLink name="Home" href="/" />
        <FooterLink name="Blog" href="/blog" />
        <FooterLink name="Courses" href="/courses" />
        <FooterLink name="Discord" href="/discord" />
        <FooterLink name="Chats Podcast" href="/chats" />
        <FooterLink name="Workshops" href="/workshops" />
        <FooterLink name="About" href="/about" />
        <FooterLink name="Credits" href="/credits" />
        <FooterLink name="Full Sitemap" reload href="/sitemap.xml" />
      </ul>
    </div>
  )
}

function AboutSection() {
  return (
    <div>
      <H4 as="div">Kent C. Dodds</H4>

      <p className="text-secondary mt-6 max-w-md text-2xl">
        Full time educator making our world better
      </p>

      <div className="text-secondary flex gap-4 items-center justify-between mt-6 xl:flex-col xl:items-start">
        <div className="flex gap-4">
          <a
            className="text-primary hover:text-team-current focus:text-team-current focus:outline-none"
            href={externalLinks.github}
          >
            <GithubIcon size={32} />
          </a>
          <a
            className="text-primary hover:text-team-current focus:text-team-current focus:outline-none"
            href={externalLinks.youtube}
          >
            <YoutubeIcon size={32} />
          </a>
          <a
            className="text-primary hover:text-team-current focus:text-team-current focus:outline-none"
            href={externalLinks.twitter}
          >
            <TwitterIcon size={32} />
          </a>
        </div>

        <div className="text-secondary relative flex items-center w-24 xl:mt-20 xl:w-32">
          {/* absolute position so that it doesn't change line-height of social icons */}
          <Signature className="absolute block w-full" />
        </div>
      </div>
    </div>
  )
}

function FooterLink({
  name,
  href,
  reload,
}: {
  name: string
  href: string
  reload?: boolean
}) {
  return (
    <li className="py-1">
      <AnchorOrLink
        prefetch={href.startsWith('http') ? undefined : 'intent'}
        href={href}
        className="text-secondary underlined inline-block hover:text-team-current focus:text-team-current whitespace-nowrap text-lg focus:outline-none"
        reload={reload}
      >
        {name}
      </AnchorOrLink>
    </li>
  )
}

function Footer() {
  const {userInfo} = useRootData()
  const subscribedToNewsletter = userInfo?.convertKit?.tags.some(
    ({name}) => name === 'Subscribed: general newsletter',
  )
  const snowboardImg = (
    <img
      className="w-full"
      {...getImgProps(images.snowboard, {
        widths: [300, 600, 850, 1600, 2550],
        sizes: [
          '(max-width: 639px) 80vw',
          '(min-width: 640px) and (max-width: 1499px) 50vw',
          '(min-width: 1500px) and (max-width: 1620px) 25vw',
          '410px',
        ],
      })}
    />
  )
  return (
    <footer className="pb-16 pt-48 border-t border-gray-200 dark:border-gray-600">
      <div className="relative mx-10vw">
        <div className="relative grid gap-x-4 grid-cols-4 grid-rows-max-content mx-auto max-w-7xl md:grid-cols-8 xl:gap-x-6 xl:grid-cols-12">
          <div className="col-span-full md:col-span-3 xl:row-span-2">
            <AboutSection />
          </div>

          <div className="col-span-full mt-20 md:col-span-5 md:col-start-1 xl:hidden">
            {subscribedToNewsletter ? snowboardImg : <NewsletterSection />}
          </div>

          <div className="col-span-2 mt-20 md:col-start-5 md:row-start-1 md:mt-0">
            <ContactSection />
          </div>

          <div className="col-span-2 mt-20 md:col-start-7 md:row-start-1 md:mt-0 xl:col-start-5 xl:row-start-2 xl:mt-16">
            <GeneralSection />
          </div>

          <div className="col-span-full mt-20 md:col-span-2 md:col-start-7 xl:col-start-5 xl:row-span-2 xl:row-start-1 xl:ml-56 xl:mt-0">
            <SitemapSection />
          </div>

          {/*
          Note that the <NewsletterSection /> is rendered twice. The position of this cell changes based on breakpoint.
          When we would move the cell around with css only, the tabIndex won't match the visual order.
         */}
          <div className="hidden col-span-4 col-start-9 row-span-2 row-start-1 mt-0 xl:block">
            {subscribedToNewsletter ? snowboardImg : <NewsletterSection />}
          </div>

          <div className="col-span-full mt-24 dark:text-blueGray-500 text-gray-500 text-lg md:mt-44">
            <span>All rights reserved</span>{' '}
            <span className="block md:inline">{`© Kent C. Dodds ${new Date().getFullYear()}`}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export {Footer}
