const dogs = [
  {
    id: 'dog-1',
    name: 'Poodle',
    img: 'https://images.dog.ceo/breeds/poodle-standard/n02113799_4557.jpg',
    description:
      'Poodles are a group of formal dog breeds, the Standard Poodle, Miniature Poodle and Toy Poodle. The origin of the breed is still discussed, with a prominent dispute over whether the poodle descends from Germany as a type of water dog, or from the French Barbet.',
    temperament: [
      'Intelligent',
      'Active',
      'Alert',
      'Faithful',
      'Trainable',
      'Instinctual',
    ],
    related: [{name: 'Bernedoodle', id: 'dog-5'}],
  },
  {
    id: 'dog-2',
    name: 'Bernese Mountain Dog',
    img: 'https://images.dog.ceo/breeds/mountain-bernese/n02107683_5745.jpg',
    description:
      'The Bernese Mountain Dog is a large-sized breed of dog, one of the four breeds of Sennenhund-type dogs from the Swiss Alps. Bred from crosses of Mastiffs and guard-type breeds, Bernese Mountain Dogs were brought to Switzerland by the Romans 2,000 years ago.',
    temperament: ['Affectionate', 'Intelligent', 'Loyal', 'Faithful'],
    related: [{name: 'Bernedoodle', id: 'dog-5'}],
  },
  {
    id: 'dog-3',
    name: 'Labrador Retriever',
    img: 'https://images.dog.ceo/breeds/labrador/n02099712_1383.jpg',
    description:
      'The Labrador Retriever, or just Labrador, is a large type of retriever-gun dog. The Labrador is one of the most popular breeds of dog in Canada, the United Kingdom and the United States.',
    temperament: [
      'Intelligent',
      'Even Tempered',
      'Kind',
      'Agile',
      'Outgoing',
      'Trusting',
      'Gentle',
    ],
    related: [],
  },
  {
    id: 'dog-4',
    name: 'Beagle',
    img: 'https://images.dog.ceo/breeds/beagle/n02088364_8477.jpg',
    description:
      'The beagle is a breed of small hound that is similar in appearance to the much larger foxhound. The beagle is a scent hound, developed primarily for hunting hare.',
    temperament: [
      'Intelligent',
      'Even Tempered',
      'Determined',
      'Amiable',
      'Excitable',
      'Gentle',
    ],
    related: [],
  },
  {
    id: 'dog-5',
    name: 'Bernedoodle',
    img: 'https://merchdope-zpq4xnxcq9v.netdna-ssl.com/wp-content/uploads/2019/05/Bernedoodle.jpeg',
    description: 'The best dog ever.',
    temperament: ['All', 'The', 'Good', 'Things'],
    related: [
      {id: 'dog-1', name: 'Poodle'},
      {id: 'dog-2', name: 'Bernese Mountain Dog'},
    ],
  },
]

function getDog(dogId) {
  return Promise.resolve(dogs.find(({id}) => id === dogId))
}

function getDogs() {
  return Promise.resolve(dogs.map(({id, name}) => ({id, name})))
}

export {getDog, getDogs}
