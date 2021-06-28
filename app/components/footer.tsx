import * as React from 'react'
import {H4, H6} from './title'
import {Grid} from './grid'
import {Paragraph} from './paragraph'
import {ArrowButton} from './arrow-button'
import {GithubIcon} from './icons/github-icon'
import {TwitterIcon} from './icons/twitter-icon'
import {YoutubeIcon} from './icons/youtube-icon'

interface FooterLinkProps {
  name: string
  href: string
}

function NewsletterSection() {
  return (
    <div>
      <H6>Stay up to date</H6>
      <div className="mt-4 max-w-md">
        <Paragraph>
          Subscribe to the newsletter to stay up to date with articles, courses
          and much more
        </Paragraph>
      </div>

      <form className="mt-8 space-y-4">
        <input
          name="name"
          autoComplete="name"
          type="text"
          placeholder="name"
          aria-label="name"
          className="dark:focus:bg-gray-800 px-8 py-6 w-full dark:text-white focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none"
        />
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="email"
          aria-label="email"
          className="dark:focus:bg-gray-800 px-8 py-6 w-full dark:text-white focus:bg-gray-100 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none"
        />

        <div className="pt-4">
          <ArrowButton direction="right">Sign me up</ArrowButton>
        </div>
      </form>
    </div>
  )
}
function ContactSection() {
  return (
    <div>
      <H6>Contact</H6>
      <ul className="mt-4">
        <FooterLink name="contact page" href="/contact" />
        <FooterLink name="office hours" href="/office-hours" />
        <FooterLink name="Join discord" href="https://kcd.im/discord" />
      </ul>
    </div>
  )
}
function GeneralSection() {
  return (
    <div>
      <H6>General</H6>
      <ul className="mt-4">
        <FooterLink name="privacy policy" href="/privacy" />
        <FooterLink name="terms of use" href="/terms" />
        <FooterLink name="code of conduct" href="/coc" />
      </ul>
    </div>
  )
}

function SitemapSection() {
  return (
    <div>
      <H6>Sitemap</H6>
      <ul className="mt-4">
        <FooterLink name="home" href="/legal/terms" />
        <FooterLink name="blog" href="/legal/privacy" />
        <FooterLink name="courses" href="/contact" />
        <FooterLink name="discord" href="/contact" />
        <FooterLink name="podcast" href="/contact" />
        <FooterLink name="workshops" href="/contact" />
        <FooterLink name="about" href="/contact" />
        <FooterLink name="all pages" href="/contact" />
      </ul>
    </div>
  )
}

function AboutSection() {
  return (
    <div>
      <H4 as="h6">Kent C. Dodds</H4>

      <p className="mt-6 max-w-md dark:text-blueGray-500 text-gray-500 text-2xl">
        Full time educator teaching people development
      </p>

      <div className="flex mt-6 dark:text-blueGray-500 text-gray-500 space-x-4">
        <a href="https://kcd.im/github">
          <GithubIcon />
        </a>
        <a href="https://kcd.im/youtube">
          <YoutubeIcon />
        </a>
        <a href="https://kcd.im/twitter">
          <TwitterIcon />
        </a>
      </div>
    </div>
  )
}

function FooterLink({name, href}: FooterLinkProps) {
  return (
    <li>
      <a
        href={href}
        className="inline-block py-1 dark:text-blueGray-500 text-gray-500 hover:underline whitespace-nowrap text-lg"
      >
        {name}
      </a>
    </li>
  )
}

function Footer() {
  return (
    <footer className="pb-16 pt-48 border-t border-gray-200 dark:border-gray-600">
      <Grid className="grid-rows-max-content">
        <div className="col-span-full md:col-span-3 lg:row-span-2">
          <AboutSection />
        </div>

        <div className="col-span-full mt-20 md:col-span-3 md:col-start-1 lg:hidden">
          <NewsletterSection />
        </div>

        <div className="col-span-2 mt-20 md:col-start-5 md:row-start-1 md:mt-0">
          <ContactSection />
        </div>

        <div className="col-span-2 mt-20 md:col-start-7 md:row-start-1 md:mt-0 lg:col-start-5 lg:row-start-2 lg:mt-10">
          <GeneralSection />
        </div>

        <div className="col-span-full mt-20 md:col-span-2 md:col-start-5 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:ml-56 lg:mt-0">
          <SitemapSection />
        </div>

        {/*
          Note that the <NewsletterSection /> is rendered twice. The position of this cell changes based on breakpoint.
          When we would move the cell around with css only, the tabIndex won't match the visual order.
         */}
        <div className="hidden col-span-3 col-start-10 row-span-2 row-start-1 mt-0 lg:block">
          <NewsletterSection />
        </div>

        <div className="col-span-full mt-20 dark:text-blueGray-500 text-gray-500 text-lg md:mt-36">
          <span>All rights reserved</span>{' '}
          <span className="block md:inline">{`© Kent C. Dodds ${new Date().getFullYear()}`}</span>
        </div>
      </Grid>
    </footer>
  )
}

export {Footer}
