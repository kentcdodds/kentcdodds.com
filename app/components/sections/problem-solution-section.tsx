import * as React from 'react'
import {Grid} from '../grid'
import {H2, H3} from '../title'
import {ArrowButton} from '../arrow-button'
import {ArrowIcon} from '../icons/arrow-icon'
import {Paragraph} from '../paragraph'

function ProblemSolutionSection() {
  const arrow = (
    <span className="h-[50px] hidden items-center mt-4 lg:flex">
      <ArrowIcon size={76} direction="right" />
    </span>
  )

  return (
    <div className="px-8 w-full">
      <div className="pb-16 pt-24 w-full bg-gray-100 dark:bg-gray-800 rounded-lg lg:pb-40 lg:pt-36">
        <div className="-mx-8">
          <Grid>
            <div className="col-span-full lg:col-span-5">
              <H2>
                The JavaScript landscape is incredibly confusing to keep up with
                right?
              </H2>
            </div>
            <div className="col-span-full lg:col-span-5 lg:col-start-7">
              <H2 variant="secondary" as="p">
                You’re in the right place, my website is your one stop shop for
                everything JavaScript related.
              </H2>
            </div>

            <hr className="col-span-full mb-16 mt-20 border-gray-200 dark:border-gray-600" />

            <div className="col-span-full order-2 mt-16 lg:col-span-5 lg:col-start-7 lg:mt-0">
              <img className="-ml-10 w-48" src="/placeholders/skis.png" />
            </div>

            <div className="col-span-full col-start-1 order-1 lg:col-span-5 lg:order-3">
              <ul className="flex flex-row text-white text-xl space-x-8 lg:flex-col lg:text-7xl lg:space-x-0 lg:space-y-7">
                <li>
                  <a
                    href="/blog"
                    className="inline-flex items-center w-full text-black dark:text-white space-x-8"
                  >
                    <span>blog</span>
                    {arrow}
                  </a>
                </li>
                <li>
                  <a
                    href="/courses"
                    className="block inline-flex dark:text-blueGray-500 text-gray-400 space-x-8"
                  >
                    courses
                  </a>
                </li>
                <li>
                  <a
                    href="/podcast"
                    className="block inline-flex dark:text-blueGray-500 text-gray-400 space-x-8"
                  >
                    podcast
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-full order-4 mt-6 space-y-7 lg:col-span-5 lg:col-start-7">
              <H3>Educational blog</H3>

              <Paragraph>
                Vestibulum in cursus est, sit amet rhoncus sapien. Fusce nec
                quam euismod, aliquet nulla at, gravida nunc. Nulla vitae
                hendrerit velit. Duis nisi felis, porta eu convallis sit amet,
                vulputate non mi. Mauris vel pellentesque mauris vivamus.
              </Paragraph>

              <Paragraph>
                Mauris felis orci, suscipit ut feugiat sit amet, tristique non
                odio. Nam a elit non erat posuere ultricies quisque aliquam
                aliquam turpis.
              </Paragraph>

              <div className="pt-7">
                <ArrowButton>Start reading the blog</ArrowButton>
              </div>
            </div>
          </Grid>
        </div>
      </div>
    </div>
  )
}

export {ProblemSolutionSection}
