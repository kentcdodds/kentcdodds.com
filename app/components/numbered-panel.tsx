import {H6, Paragraph} from './typography'

type NumberedPanelProps = {
  number: number
} & ({title?: never; titleHTML: string} | {title: string; titleHTML?: never}) &
  (
    | {description?: never; descriptionHTML: string}
    | {description: string; descriptionHTML?: never}
  )

function NumberedPanel({
  number,
  title,
  titleHTML,
  description,
  descriptionHTML,
}: NumberedPanelProps) {
  // Note, we can move the counters to pure css if needed, but I'm not sure if it adds anything
  return (
    <li>
      <H6 as="h3" className="relative mb-6 lg:mb-8">
        <span className="mb-4 block lg:absolute lg:-left-16 lg:mb-0">
          {number.toString().padStart(2, '0')}.
        </span>
        {titleHTML ? (
          <span dangerouslySetInnerHTML={{__html: titleHTML}} />
        ) : (
          title
        )}
      </H6>
      {descriptionHTML ? (
        <Paragraph dangerouslySetInnerHTML={{__html: descriptionHTML}} />
      ) : (
        <Paragraph>{description}</Paragraph>
      )}
    </li>
  )
}

export {NumberedPanel}
