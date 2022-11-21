export interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
}

function FeatureCard({title, description, icon}: FeatureCardProps) {
  return (
    <div className="bg-secondary relative flex h-full w-full flex-col items-start rounded-lg px-8 py-12 lg:px-12">
      <div className="text-primary mb-8">{icon}</div>
      <div className="text-primary mb-4 flex flex-none items-end text-xl font-medium">
        {title}
      </div>
      <p className="text-secondary max-w-sm flex-auto text-xl">{description}</p>
    </div>
  )
}

export {FeatureCard}
