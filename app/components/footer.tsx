import * as React from 'react'
import {Form} from 'remix'
import {externalLinks} from '../external-links'
import {useOptionalUser, useOptionalUserInfo} from '../utils/providers'
import {H4, H6, Paragraph} from './typography'
import {Grid} from './grid'
import {ArrowButton} from './arrow-button'
import {GithubIcon} from './icons/github-icon'
import {TwitterIcon} from './icons/twitter-icon'
import {YoutubeIcon} from './icons/youtube-icon'
import {Signature} from './signature'

interface FooterLinkProps {
  name: string
  href: string
}

function NewsletterSection() {
  const user = useOptionalUser()
  return (
    <div>
      <H6 as="div">Stay up to date</H6>
      <div className="mt-4 max-w-md">
        <Paragraph>
          Subscribe to the newsletter to stay up to date with articles, courses
          and much more
        </Paragraph>
      </div>

      <Form
        className="mt-8 space-y-4"
        method="post"
        action="TODO: set up action for newsletter"
      >
        <input
          name="firstName"
          defaultValue={user?.firstName}
          autoComplete="name"
          type="text"
          placeholder="First name"
          aria-label="First name"
          className="border-secondary hover:border-primary focus:border-primary focus:bg-secondary px-8 py-6 w-full dark:text-white bg-transparent border rounded-lg focus:outline-none"
        />
        <input
          name="email"
          defaultValue={user?.email}
          type="email"
          autoComplete="email"
          placeholder="email"
          aria-label="email"
          className="border-secondary hover:border-primary focus:border-primary focus:bg-secondary px-8 py-6 w-full dark:text-white bg-transparent border rounded-lg focus:outline-none"
        />

        <ArrowButton className="pt-4" type="submit" direction="right">
          Sign me up
        </ArrowButton>
      </Form>
    </div>
  )
}
function ContactSection() {
  return (
    <div>
      <H6 as="div">Contact</H6>
      <ul className="mt-4">
        <FooterLink name="Contact page" href="/contact" />
        <FooterLink name="Office hours" href="/office-hours" />
        <FooterLink name="Call Kent" href="/call" />
      </ul>
    </div>
  )
}
function GeneralSection() {
  return (
    <div>
      <H6 as="div">General</H6>
      <ul className="mt-4">
        <FooterLink name="Privacy policy" href="/privacy" />
        <FooterLink name="Terms of use" href="/terms" />
        <FooterLink name="Code of conduct" href="/coc" />
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
        <FooterLink name="Podcast" href="/chats" />
        <FooterLink name="Workshops" href="/workshops" />
        <FooterLink name="About" href="/about" />
        <FooterLink name="Credits" href="/credits" />
        <FooterLink name="All pages" href="/sitemap" />
      </ul>
    </div>
  )
}

function AboutSection() {
  return (
    <div>
      <H4 as="div">Kent C. Dodds</H4>

      <p className="text-secondary mt-6 max-w-md text-2xl">
        Full time educator teaching people development
      </p>

      <div className="text-secondary flex items-center justify-between mt-6 lg:flex-col lg:items-start">
        <div className="flex space-x-4">
          <a
            className="hover:text-primary focus:text-primary focus:outline-none"
            href={externalLinks.github}
          >
            <GithubIcon />
          </a>
          <a
            className="hover:text-primary focus:text-primary focus:outline-none"
            href={externalLinks.youtube}
          >
            <YoutubeIcon />
          </a>
          <a
            className="hover:text-primary focus:text-primary focus:outline-none"
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
      <a
        href={href}
        className="text-secondary hover:text-primary focus:text-primary underlined inline-block whitespace-nowrap text-lg focus:outline-none"
      >
        {name}
      </a>
    </li>
  )
}

function Footer() {
  const userInfo = useOptionalUserInfo()
  return (
    <footer className="pb-16 pt-48 border-t border-gray-200 dark:border-gray-600">
      <Grid className="grid-rows-max-content">
        <div className="col-span-full md:col-span-3 lg:row-span-2">
          <AboutSection />
        </div>

        {userInfo?.convertKit?.subscribedToNewsletter ? null : (
          <div className="col-span-full mt-20 md:col-span-3 md:col-start-1 lg:hidden">
            <NewsletterSection />
          </div>
        )}

        <div className="col-span-2 mt-20 md:col-start-5 md:row-start-1 md:mt-0">
          <ContactSection />
        </div>

        <div className="col-span-2 mt-20 md:col-start-7 md:row-start-1 md:mt-0 lg:col-start-5 lg:row-start-2 lg:mt-16">
          <GeneralSection />
        </div>

        <div className="col-span-full mt-20 md:col-span-2 md:col-start-5 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:ml-56 lg:mt-0">
          <SitemapSection />
        </div>

        {/*
          Note that the <NewsletterSection /> is rendered twice. The position of this cell changes based on breakpoint.
          When we would move the cell around with css only, the tabIndex won't match the visual order.
         */}
        {userInfo?.convertKit?.subscribedToNewsletter ? null : (
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
