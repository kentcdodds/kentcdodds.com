import * as React from 'react'
import clsx from 'clsx'
import {externalLinks} from '../external-links'
import {useOptionalUserInfo, useRequestInfo} from '~/utils/providers'
import {AnchorOrLink} from '~/utils/misc'
import {ConvertKitForm} from '../convertkit/form'
import {H4, H6, Paragraph} from './typography'
import {Grid} from './grid'
import {GithubIcon} from './icons/github-icon'
import {TwitterIcon} from './icons/twitter-icon'
import {YoutubeIcon} from './icons/youtube-icon'
import {Signature} from './signature'

interface FooterLinkProps {
  name: string
  href: string
}

function NewsletterSection() {
  return (
    <div>
      <H6 as="div">Stay up to date</H6>
      <div className="mt-4 max-w-md">
        <Paragraph>
          Subscribe to the newsletter to stay up to date with articles, courses
          and much more
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
  const requestInfo = useRequestInfo()
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
        {/*
          can't use client-side routing here, so we need the full URL so our
          AnchorOrLink treats it as a full page reload
        */}
        <FooterLink
          name="Full Sitemap"
          href={`${requestInfo.origin}/sitemap.xml`}
        />
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

      <div className="text-secondary flex items-center justify-between mt-6 lg:flex-col lg:items-start">
        <div className="flex space-x-4">
          <a
            className="text-primary hover:text-team-current focus:text-team-current focus:outline-none"
            href={externalLinks.github}
          >
            <GithubIcon />
          </a>
          <a
            className="text-primary hover:text-team-current focus:text-team-current focus:outline-none"
            href={externalLinks.youtube}
          >
            <YoutubeIcon />
          </a>
          <a
            className="text-primary hover:text-team-current focus:text-team-current focus:outline-none"
            href={externalLinks.twitter}
          >
            <TwitterIcon />
          </a>
        </div>

        <div className="text-secondary relative flex items-center w-24 lg:mt-20 lg:w-32">
          {/* absolute position so that it doesn't change line-height of social icons */}
          <Signature className="absolute block w-full" />
        </div>
      </div>
    </div>
  )
}

function FooterLink({name, href}: FooterLinkProps) {
  return (
    <li className="py-1">
      <AnchorOrLink
        href={href}
        className="text-secondary underlined inline-block hover:text-team-current focus:text-team-current whitespace-nowrap text-lg focus:outline-none"
      >
        {name}
      </AnchorOrLink>
    </li>
  )
}

function Footer() {
  const userInfo = useOptionalUserInfo()
  const subscribedToNewsletter = userInfo?.convertKit?.tags.some(
    ({name}) => name === 'Subscribed: general newsletter',
  )
  return (
    <footer className="pb-16 pt-48 border-t border-gray-200 dark:border-gray-600">
      <Grid className="grid-rows-max-content">
        <div className="col-span-full md:col-span-3 lg:row-span-2">
          <AboutSection />
        </div>

        {subscribedToNewsletter ? null : (
          <div className="col-span-full mt-20 md:col-span-5 md:col-start-1 lg:hidden">
            <NewsletterSection />
          </div>
        )}

        <div className="col-span-2 mt-20 md:col-start-5 md:row-start-1 md:mt-0">
          <ContactSection />
        </div>

        <div className="col-span-2 mt-20 md:col-start-7 md:row-start-1 md:mt-0 lg:col-start-5 lg:row-start-2 lg:mt-16">
          <GeneralSection />
        </div>

        <div
          className={clsx(
            'col-span-full mt-20 md:col-span-2 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:ml-56 lg:mt-0',
            {
              'md:col-start-7': !subscribedToNewsletter,
              'md:col-start-5': subscribedToNewsletter,
            },
          )}
        >
          <SitemapSection />
        </div>

        {/*
          Note that the <NewsletterSection /> is rendered twice. The position of this cell changes based on breakpoint.
          When we would move the cell around with css only, the tabIndex won't match the visual order.
         */}
        {subscribedToNewsletter ? null : (
          <div className="hidden col-span-3 col-start-10 row-span-2 row-start-1 mt-0 lg:block">
            <NewsletterSection />
          </div>
        )}

        <div className="col-span-full mt-24 dark:text-blueGray-500 text-gray-500 text-lg md:mt-44">
          <span>All rights reserved</span>{' '}
          <span className="block md:inline">{`© Kent C. Dodds ${new Date().getFullYear()}`}</span>
        </div>
      </Grid>
    </footer>
  )
}

export {Footer}
