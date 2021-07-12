import * as React from 'react'

export interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
}

function FeatureCard({title, description, icon}: FeatureCardProps) {
  return (
    <div className="bg-secondary relative flex flex-col items-start px-8 py-12 w-full h-full rounded-lg lg:px-12">
      <div className="text-primary mb-8">{icon}</div>
      <div className="text-primary flex flex-none items-end mb-4 text-xl font-medium">
        {title}
      </div>
      <p className="text-secondary flex-auto max-w-sm text-xl">{description}</p>
    </div>
  )
}

export {FeatureCard}
