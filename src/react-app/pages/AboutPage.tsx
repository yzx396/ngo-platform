import { useTranslation } from 'react-i18next';
import { FounderCard } from '../components/FounderCard';

/**
 * AboutPage Component
 * Displays community introduction, mission, values, and founders
 * Public page accessible to all users
 */
export function AboutPage() {
  const { t } = useTranslation();

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
      icon: '🎓',
      title: t('about.values.qualityEducation.title', 'Quality Education'),
      description: t('about.values.qualityEducation.description', 'We provide comprehensive educational resources and mentorship'),
    },
    {
      id: 2,
      icon: '💼',
      title: t('about.values.careerMentorship.title', 'Career Mentorship'),
      description: t('about.values.careerMentorship.description', 'Expert guidance to accelerate your professional growth'),
    },
    {
      id: 3,
      icon: '🤝',
      title: t('about.values.communitySupport.title', 'Community Support'),
      description: t('about.values.communitySupport.description', 'A supportive network of learners and professionals'),
    },
    {
      id: 4,
      icon: '♿',
      title: t('about.values.sustainableAccess.title', 'Sustainable Access'),
      description: t('about.values.sustainableAccess.description', 'Making opportunities accessible to everyone'),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">🎯</span>
            <div>
              <h3 className="font-semibold mb-1">{t('about.whatWeDo.item1Title', 'Mentor Matching')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('about.whatWeDo.item1Desc', 'Connect mentees with experienced professionals for personalized guidance')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">📚</span>
            <div>
              <h3 className="font-semibold mb-1">{t('about.whatWeDo.item2Title', 'Learning Resources')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('about.whatWeDo.item2Desc', 'Access curated content, articles, and learning materials')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">🏆</span>
            <div>
              <h3 className="font-semibold mb-1">{t('about.whatWeDo.item3Title', 'Community Challenges')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('about.whatWeDo.item3Desc', 'Participate in challenges to develop skills and earn recognition')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">🌍</span>
            <div>
              <h3 className="font-semibold mb-1">{t('about.whatWeDo.item4Title', 'Global Events')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('about.whatWeDo.item4Desc', 'Attend virtual and in-person events to expand your network')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{t('about.values.title', 'Our Values')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {values.map((value) => (
            <div
              key={value.id}
              className="bg-card border rounded-lg p-6 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl">{value.icon}</div>
              <h3 className="font-semibold text-lg">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </div>
          ))}
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
