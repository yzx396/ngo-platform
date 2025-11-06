import { useTranslation } from 'react-i18next';
import { FounderCard } from '../components/FounderCard';
import { Mic, Target, Users, Handshake, Lightbulb, Heart, TrendingUp, Star, HeartHandshake, Rocket } from 'lucide-react';

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
      icon: Target,
      title: t('about.whatWeDo.item2Title', 'Decision Making'),
      description: t('about.whatWeDo.item2Desc', 'Learn frameworks for analyzing information and making effective decisions'),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {t('about.title', 'About Lead Forward')}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {t('about.subtitle', 'Building a global community dedicated to leadership development and mentorship')}
        </p>
      </div>

      {/* Our Vision Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('about.vision.title', 'Our Vision')}</h2>
        <p className="text-muted-foreground leading-relaxed max-w-3xl">
          {t('about.vision.content', 'Become the Leader You Aspire to Be.')}
        </p>
      </div>

      {/* Our Mission Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('about.mission.title', 'Our Mission')}</h2>
        <p className="text-muted-foreground leading-relaxed max-w-3xl">
          {t('about.mission.content', 'At Lead Forward, we believe that everyone deserves access to mentorship and leadership development. Our mission is to create a global community where individuals can connect, learn, and grow together through meaningful mentorship relationships and shared learning experiences.')}
        </p>
      </div>

      {/* What We Do Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('about.whatWeDo.title', 'What We Do')}</h2>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          {t('about.whatWeDo.description', 'Each month, we organize leadership activities designed to help members practice specific leadership skills, receive feedback, and grow as leaders. These activities are carefully structured to address different aspects of leadership in diverse settings.')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div
                key={activity.id}
                className="bg-card border rounded-lg p-6 space-y-3 hover:shadow-md transition-shadow"
              >
                <IconComponent className="h-8 w-8 text-primary" />
                <h3 className="font-semibold text-lg">{activity.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Values Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('about.values.title', 'Our Core Values')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {values.map((value) => {
            const IconComponent = value.icon;
            return (
              <div
                key={value.id}
                className="bg-card border rounded-lg p-6 space-y-3 hover:shadow-md transition-shadow"
              >
                <IconComponent className="h-8 w-8 text-primary" />
                <h3 className="font-semibold text-lg">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Our Founders Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('about.founders.title', 'Our Founders')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* CTA Section */}
      <div className="border-t pt-8 space-y-4">
        <h2 className="text-2xl font-bold">{t('about.joinUs.title', 'Join Our Community')}</h2>
        <p className="text-muted-foreground max-w-3xl">
          {t('about.joinUs.description', 'Whether you are looking to mentor others or seeking guidance, there is a place for you in our community. Start your leadership journey with Lead Forward today.')}
        </p>
      </div>
    </div>
  );
}

export default AboutPage;
