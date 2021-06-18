import * as React from 'react'
import {H4, H6} from './title'
import {Grid} from './grid'
import {Paragraph} from './paragraph'
import {ArrowButton} from './arrow-button'

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
      <H4>Kent C. Dodds</H4>

      <p className="mt-6 max-w-md dark:text-blueGray-500 text-gray-500 text-2xl">
        Full time educator teaching people development
      </p>

      <div className="flex mt-6 dark:text-blueGray-500 text-gray-500 space-x-4">
        <GithubLink />
        <YoutubeLink />
        <TwitterLink />
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

function GithubLink() {
  return (
    <a href="https://kcd.im/github">
      <svg className="w-8 h-8" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"
        />
      </svg>
    </a>
  )
}

function YoutubeLink() {
  return (
    <a href="https://kcd.im/twitter">
      <svg className="w-8 h-8" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"
        />
      </svg>
    </a>
  )
}

function TwitterLink() {
  return (
    <a href="https://kcd.im/twitter">
      <svg className="w-8 h-8" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z"
        />
      </svg>
    </a>
  )
}

// mt-20 md:mt-36
function Footer() {
  return (
    <footer className="pb-16 pt-48 border-t border-gray-200 dark:border-gray-600">
      <Grid className="grid-rows-max-content">
        {/*about section*/}
        <div className="col-span-full md:col-span-3 lg:row-span-2">
          <AboutSection />
        </div>

        {/*newsletter section*/}
        <div className="col-span-full mt-20 md:col-span-3 md:col-start-1 lg:col-start-10 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <NewsletterSection />
        </div>

        {/*links section*/}
        <div className="col-span-2 mt-20 md:col-start-5 md:row-start-1 md:mt-0">
          <ContactSection />
        </div>

        <div className="col-span-2 mt-20 md:col-start-7 md:row-start-1 md:mt-0 lg:col-start-5 lg:row-start-2 lg:mt-10">
          <GeneralSection />
        </div>

        <div className="col-span-full mt-20 md:col-span-2 md:col-start-5 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:ml-56 lg:mt-0">
          <SitemapSection />
        </div>

        {/*copyright & design section*/}
        <div className="col-span-full order-last mt-20 dark:text-blueGray-500 text-gray-500 text-lg md:col-span-5 md:mt-36 lg:col-span-6">
          <span>All rights reserved</span>{' '}
          <span className="block md:inline">{`© Kent C. Dodds ${new Date().getFullYear()}`}</span>
        </div>
        <div className="col-span-full order-last dark:text-blueGray-500 text-gray-500 text-lg md:col-span-3 md:mt-36 md:text-right lg:col-span-6">
          Webdesign by Gil
        </div>
      </Grid>
    </footer>
  )
}

export {Footer}
