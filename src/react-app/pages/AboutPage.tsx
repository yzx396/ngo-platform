import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FounderCard } from '../components/FounderCard';
import { Button } from '../components/ui/button';
import { Mic, Users, Handshake, Lightbulb, Heart, TrendingUp, Star, HeartHandshake, Rocket } from 'lucide-react';

/**
 * AboutPage Component
 * Displays community introduction, mission, values, and founders
 * Public page accessible to all users
 */
export function AboutPage() {
  const { t } = useTranslation();

  // Leadership activities
  const activities = [
    {
      id: 1,
      icon: Mic,
      title: t('about.whatWeDo.item1Title', 'Public Speaking'),
      description: t('about.whatWeDo.item1Desc', 'Develop communication skills and confidence in presenting ideas to audiences'),
    },
    {
      id: 2,
      icon: Rocket,
      title: t('about.whatWeDo.item2Title', 'Become AI Builder'),
      description: t('about.whatWeDo.item2Desc', 'Explore how to leverage AI tools and technologies in leadership and innovation'),
    },
    {
      id: 3,
      icon: Users,
      title: t('about.whatWeDo.item3Title', 'Team Building'),
      description: t('about.whatWeDo.item3Desc', 'Practice building cohesive teams and fostering collaboration'),
    },
    {
      id: 4,
      icon: Handshake,
      title: t('about.whatWeDo.item4Title', 'Conflict Resolution'),
      description: t('about.whatWeDo.item4Desc', 'Master techniques for navigating disagreements and finding solutions'),
    },
    {
      id: 5,
      icon: Lightbulb,
      title: t('about.whatWeDo.item5Title', 'Strategic Thinking'),
      description: t('about.whatWeDo.item5Desc', 'Develop the ability to see the bigger picture and plan for long-term success'),
    },
    {
      id: 6,
      icon: Heart,
      title: t('about.whatWeDo.item6Title', 'Emotional Intelligence'),
      description: t('about.whatWeDo.item6Desc', 'Build self-awareness and empathy to lead with greater effectiveness'),
    },
  ];

  // Founder data - can be easily updated
  const founders = [
    {
      id: 1,
      name: t('about.founders.profiles.0.name', 'Claire Ding'),
      title: t('about.founders.profiles.0.title', 'Senior Manager @ Intuit'),
      photoUrl: '/images/founders/claire-ding.png',
    },
    {
      id: 2,
      name: t('about.founders.profiles.1.name', 'Elaine Xiao'),
      title: t('about.founders.profiles.1.title', 'Manager @ Apple'),
      photoUrl: '/images/founders/elaine-xiao.png',
    },
    {
      id: 3,
      name: t('about.founders.profiles.2.name', 'Lily Li'),
      title: t('about.founders.profiles.2.title', 'Senior Manager @ Amazon'),
      photoUrl: '/images/founders/lily-li.png',
    },
    {
      id: 4,
      name: t('about.founders.profiles.3.name', 'Yang Zhao'),
      title: t('about.founders.profiles.3.title', 'Eng Leader @ SAP'),
      photoUrl: '/images/founders/yang-zhao.png',
    },
  ];

  // Values
  const values = [
    {
      id: 1,
      icon: TrendingUp,
      title: t('about.values.growthMindset.title', 'Growth Mindset'),
      description: t('about.values.growthMindset.description', 'We believe everyone can develop leadership abilities through practice and persistence'),
    },
    {
      id: 2,
      icon: Star,
      title: t('about.values.authenticLeadership.title', 'Authentic Leadership'),
      description: t('about.values.authenticLeadership.description', 'Leading with integrity and staying true to your own leadership style and values'),
    },
    {
      id: 3,
      icon: HeartHandshake,
      title: t('about.values.communitySupport.title', 'Community Support'),
      description: t('about.values.communitySupport.description', 'Creating a safe, nurturing environment where leaders can take risks and learn'),
    },
    {
      id: 4,
      icon: Rocket,
      title: t('about.values.actionablePractice.title', 'Actionable Practice'),
      description: t('about.values.actionablePractice.description', 'Focusing on practical exercises that translate to real-world leadership scenarios'),
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero Section */}
      <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 sm:px-6 py-16 sm:py-20 rounded-b-[3rem] overflow-hidden">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/8 to-secondary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.75_0.12_85/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,oklch(0.88_0.08_145/0.12),transparent_50%)]" />

        {/* Content */}
        <div className="relative space-y-6 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            {t('about.title', 'About Lead Forward')}
          </h1>
          <p className="text-xl sm:text-2xl text-foreground/80 leading-relaxed max-w-3xl">
            {t('about.subtitle', 'Building a global community dedicated to leadership development and mentorship')}
          </p>
        </div>
      </div>

      {/* Vision & Mission - Side by side with warm accents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Vision */}
        <div className="relative bg-gradient-to-br from-accent/5 to-accent/10 border-l-4 border-l-accent rounded-xl p-8 sm:p-10 space-y-4">
          <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-accent/10" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t('about.vision.title', 'Our Vision')}</h2>
            <p className="text-lg text-foreground/90 leading-relaxed mt-4">
              {t('about.vision.content', 'Become the Leader You Aspire to Be.')}
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="relative bg-gradient-to-br from-secondary/5 to-secondary/10 border-l-4 border-l-secondary rounded-xl p-8 sm:p-10 space-y-4">
          <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-secondary/10" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t('about.mission.title', 'Our Mission')}</h2>
            <p className="text-base text-foreground/90 leading-relaxed mt-4">
              {t('about.mission.content', 'At Lead Forward, we believe that everyone deserves access to mentorship and leadership development. Our mission is to create a global community where individuals can connect, learn, and grow together through meaningful mentorship relationships and shared learning experiences.')}
            </p>
          </div>
        </div>
      </div>

      {/* What We Do Section */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">{t('about.whatWeDo.title', 'What We Do')}</h2>
          <p className="text-muted-foreground max-w-3xl leading-relaxed text-lg">
            {t('about.whatWeDo.description', 'Each month, we organize leadership activities designed to help members practice specific leadership skills, receive feedback, and grow as leaders. These activities are carefully structured to address different aspects of leadership in diverse settings.')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => {
            const IconComponent = activity.icon;
            const accentColors = [
              'border-l-primary bg-primary/5',
              'border-l-accent bg-accent/5',
              'border-l-secondary bg-secondary/5',
              'border-l-primary bg-primary/5',
              'border-l-accent bg-accent/5',
              'border-l-secondary bg-secondary/5',
            ];
            const iconColors = [
              'text-primary bg-primary/10',
              'text-accent-foreground bg-accent/10',
              'text-secondary-foreground bg-secondary/10',
              'text-primary bg-primary/10',
              'text-accent-foreground bg-accent/10',
              'text-secondary-foreground bg-secondary/10',
            ];

            return (
              <div
                key={activity.id}
                className={`group relative bg-card border-l-4 ${accentColors[index]} rounded-xl p-6 space-y-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconColors[index]} group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-lg">{activity.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
              </div>
            );
          })}
        </div>
        <div className="pt-2">
          <Link to="/login">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all">
              {t('common.startExploring', 'Start Exploring Mentors')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Values Section */}
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold">{t('about.values.title', 'Our Core Values')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t('about.values.subtitle', 'The principles that guide everything we do')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const IconComponent = value.icon;
            const gradients = [
              'from-primary/5 to-primary/10 border-primary/20',
              'from-accent/5 to-accent/10 border-accent/20',
              'from-secondary/5 to-secondary/10 border-secondary/20',
              'from-primary/5 to-primary/10 border-primary/20',
            ];
            const iconBgs = [
              'bg-primary/10 text-primary',
              'bg-accent/10 text-accent-foreground',
              'bg-secondary/10 text-secondary-foreground',
              'bg-primary/10 text-primary',
            ];

            return (
              <div
                key={value.id}
                className={`group relative bg-gradient-to-br ${gradients[index]} border rounded-xl p-6 space-y-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBgs[index]} group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-lg">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Our Founders Section */}
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold">{t('about.founders.title', 'Our Founders')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t('about.founders.subtitle', 'Experienced leaders dedicated to empowering the next generation')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {founders.map((founder) => (
            <FounderCard
              key={founder.id}
              name={founder.name}
              title={founder.title}
              photoUrl={founder.photoUrl}
            />
          ))}
        </div>
      </div>

      {/* CTA Section - Warm gradient background */}
      <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 py-16 sm:py-20 rounded-3xl overflow-hidden">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.75_0.12_85/0.1),transparent_70%)]" />

        {/* Content */}
        <div className="relative text-center space-y-6 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold">{t('about.joinUs.title', 'Join Our Community')}</h2>
          <p className="text-foreground/90 text-lg leading-relaxed">
            {t('about.joinUs.description', 'Whether you are looking to mentor others or seeking guidance, there is a place for you in our community. Start your leadership journey with Lead Forward today.')}
          </p>
          <div className="pt-4">
            <Link to="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                {t('common.signIn')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
