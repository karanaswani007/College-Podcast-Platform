export type DemoCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
};

export type DemoEpisode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  speakerName: string;
  categoryId: string;
  audioPath: string;
  thumbnailPath: string;
  durationSeconds: number;
  tags: string;
  ageDays: number;
};

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    id: "cat-education",
    name: "Education",
    slug: "education",
    description: "Study skills, courses, and how learning actually happens.",
    icon: "graduation",
  },
  {
    id: "cat-technology",
    name: "Technology",
    slug: "technology",
    description: "Tools, computing, and how students build with them.",
    icon: "laptop",
  },
  {
    id: "cat-college-life",
    name: "College Life",
    slug: "college-life",
    description: "Campus culture, clubs, and everyday student life.",
    icon: "users",
  },
  {
    id: "cat-events",
    name: "Events",
    slug: "events",
    description: "Talks, fests, and gatherings worth showing up for.",
    icon: "calendar",
  },
  {
    id: "cat-motivation",
    name: "Motivation",
    slug: "motivation",
    description: "Focus, habits, and staying with the work.",
    icon: "heart",
  },
];

/** Fictional demo episodes. Speaker names are personas, not real faculty. */
export const DEMO_EPISODES: DemoEpisode[] = [
  {
    id: "pod-ai-2026",
    slug: "ai-in-2026",
    title: "AI in 2026",
    description:
      "A campus briefing on using AI tools without handing over your judgment. It covers how to cite a source, test a claim, and keep student data out of public models.",
    speakerName: "Prof. Rahul Sharma",
    categoryId: "cat-technology",
    audioPath: "/audio/ai-in-2026.mp3",
    thumbnailPath: "/covers/ai.jpg",
    durationSeconds: 33,
    tags: "ai, study, judgment",
    ageDays: 1,
  },
  {
    id: "pod-college-life",
    slug: "college-life-and-career",
    title: "College Life & Career",
    description:
      "A practical tour of the first year: one protected study block, one club that is not only about marks, and career conversations that start before placement week.",
    speakerName: "Student Club",
    categoryId: "cat-education",
    audioPath: "/audio/college-life.mp3",
    thumbnailPath: "/covers/college.jpg",
    durationSeconds: 34,
    tags: "first year, career, campus",
    ageDays: 2,
  },
  {
    id: "pod-tech-trends",
    slug: "tech-trends",
    title: "Tech Trends",
    description:
      "How to read a technology headline without chasing it. Three questions help a student decide whether a trend belongs in a project or only in a group chat.",
    speakerName: "Prof. Neha Joshi",
    categoryId: "cat-technology",
    audioPath: "/audio/tech-trends.mp3",
    thumbnailPath: "/covers/tech.jpg",
    durationSeconds: 33,
    tags: "trends, projects, tools",
    ageDays: 3,
  },
  {
    id: "pod-motivation",
    slug: "motivation-and-success",
    title: "Motivation & Success",
    description:
      "Motivation fades on a Thursday. This episode argues for a smaller plan: a twenty-five minute start, a phone in another room, and the decision to return after a bad week.",
    speakerName: "Alumni Speaker",
    categoryId: "cat-motivation",
    audioPath: "/audio/motivation.mp3",
    thumbnailPath: "/covers/motivation.jpg",
    durationSeconds: 34,
    tags: "habits, focus, exams",
    ageDays: 4,
  },
  {
    id: "pod-events",
    slug: "campus-events",
    title: "Campus Events",
    description:
      "A short guide for students who organize events and students who attend them. The useful event leaves you with a name, a next step, and a reason to come back.",
    speakerName: "Events Committee",
    categoryId: "cat-events",
    audioPath: "/audio/events.mp3",
    thumbnailPath: "/covers/events.jpg",
    durationSeconds: 33,
    tags: "events, clubs, community",
    ageDays: 5,
  },
  {
    id: "pod-mind",
    slug: "a-healthier-mind",
    title: "A Healthier Mind",
    description:
      "Three campus-sized practices: protect sleep before a test, walk between classes without a screen, and use the counseling desk early. This is not a diagnosis.",
    speakerName: "Campus Wellness Desk",
    categoryId: "cat-motivation",
    audioPath: "/audio/healthy-mind.mp3",
    thumbnailPath: "/covers/mind.jpg",
    durationSeconds: 35,
    tags: "wellbeing, sleep, campus",
    ageDays: 6,
  },
  {
    id: "pod-study",
    slug: "study-systems",
    title: "Study Systems",
    description:
      "Most students do not need another app. They need a system small enough to survive a busy week: three weekly priorities, a short recall review, and one question notebook.",
    speakerName: "Study Circle",
    categoryId: "cat-education",
    audioPath: "/audio/study-systems.mp3",
    thumbnailPath: "/covers/study.jpg",
    durationSeconds: 32,
    tags: "revision, recall, planning",
    ageDays: 7,
  },
  {
    id: "pod-guide",
    slug: "making-a-campus-podcast",
    title: "Making a Campus Podcast",
    description:
      "A production guide for a quiet room and a phone: a clear opening, a soft recording space, a title a classmate would search for, and consent before anyone's voice is shared.",
    speakerName: "Media Club",
    categoryId: "cat-college-life",
    audioPath: "/audio/podcast-guide.mp3",
    thumbnailPath: "/covers/studio.jpg",
    durationSeconds: 32,
    tags: "audio, media, consent",
    ageDays: 8,
  },
];
