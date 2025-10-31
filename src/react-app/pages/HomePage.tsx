import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

/**
 * Home/Dashboard Page
 * Entry point for authenticated users and visitors
 * Displays community welcome message and platform overview
 */
export function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Welcome Section */}
      <div className="space-y-3 sm:space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
          {isAuthenticated
            ? t('home.welcomeBack', 'Welcome back, {{name}}!', { name: user?.name || 'User' })
            : t('home.title', 'Welcome to Lead Forward Platform')}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground">
          {t('home.communitySubtitle', 'A community platform for growth, learning, and collaboration')}
        </p>
      </div>

      {/* Quick Stats or Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Community Stats Card */}
        <div className="bg-card border rounded-lg p-6 sm:p-8 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-3xl sm:text-4xl">👥</div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t('home.community', 'Join Our Community')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('home.communityDesc', 'Connect with peers, mentors, and learners from around the world')}
          </p>
        </div>

        {/* Challenges Card */}
        <div className="bg-card border rounded-lg p-6 sm:p-8 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-3xl sm:text-4xl">🎯</div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t('home.challenges', 'Take Challenges')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('home.challengesDesc', 'Participate in community challenges and earn points')}
          </p>
        </div>

        {/* Learn & Share Card */}
        <div className="bg-card border rounded-lg p-6 sm:p-8 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-3xl sm:text-4xl">📚</div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t('home.learnShare', 'Learn & Share')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('home.learnShareDesc', 'Read blogs, share knowledge, and grow together')}
          </p>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="space-y-4 pt-6 sm:pt-8 border-t">
        <h2 className="text-xl sm:text-2xl font-bold">
          {t('home.getStarted', 'Get Started')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
          <div className="flex items-start gap-3 text-muted-foreground">
            <span className="text-lg flex-shrink-0">📰</span>
            <span>{t('home.startTip1', 'Browse the community feed to see what others are sharing')}</span>
          </div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <span className="text-lg flex-shrink-0">🎯</span>
            <span>{t('home.startTip2', 'Check out current challenges to earn points')}</span>
          </div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <span className="text-lg flex-shrink-0">📚</span>
            <span>{t('home.startTip3', 'Discover blogs and articles from the community')}</span>
          </div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <span className="text-lg flex-shrink-0">🏆</span>
            <span>{t('home.startTip4', 'Climb the leaderboard and gain recognition')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
