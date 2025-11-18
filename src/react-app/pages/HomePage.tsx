import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Users, Target, BookOpen, Newspaper, Trophy, Sparkles } from 'lucide-react';

/**
 * Home/Dashboard Page
 * Entry point for authenticated users and visitors
 * Displays community welcome message with warm, inviting design
 */
export function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero Section with Warm Gradient Background */}
      <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 sm:px-6 py-12 sm:py-16 rounded-b-[2rem] overflow-hidden">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.75_0.12_85/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,oklch(0.88_0.08_145/0.12),transparent_50%)]" />

        {/* Content */}
        <div className="relative space-y-4 sm:space-y-6 max-w-3xl">
          {isAuthenticated && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>{t('home.welcomeTag', 'Welcome back!')}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            {isAuthenticated
              ? t('home.welcomeBack', 'Welcome back, {{name}}!', { name: user?.name || 'User' })
              : t('home.title', 'Welcome to Lead Forward Platform')}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
            {t('home.communitySubtitle', 'A community platform for growth, learning, and collaboration')}
          </p>
        </div>
      </div>

      {/* Features Grid with Distinctive Card Styles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Community Card - Terracotta accent */}
        <div className="group relative bg-card border-l-4 border-l-primary rounded-xl p-6 sm:p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            <Users className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t('home.community', 'Join Our Community')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t('home.communityDesc', 'Connect with peers, mentors, and learners from around the world')}
          </p>
        </div>

        {/* Challenges Card - Amber accent */}
        <div className="group relative bg-card border-l-4 border-l-accent rounded-xl p-6 sm:p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 text-accent-foreground group-hover:scale-110 transition-transform duration-300">
            <Target className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t('home.challenges', 'Take Challenges')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t('home.challengesDesc', 'Participate in community challenges and earn points')}
          </p>
        </div>

        {/* Learn & Share Card - Sage green accent */}
        <div className="group relative bg-card border-l-4 border-l-secondary rounded-xl p-6 sm:p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 text-secondary-foreground group-hover:scale-110 transition-transform duration-300">
            <BookOpen className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t('home.learnShare', 'Learn & Share')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t('home.learnShareDesc', 'Read blogs, share knowledge, and grow together')}
          </p>
        </div>
      </div>

      {/* Getting Started Section with Organic Layout */}
      <div className="relative bg-muted/30 rounded-2xl p-8 sm:p-10 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {t('home.getStarted', 'Get Started')}
          </h2>
          <p className="text-muted-foreground">
            {t('home.getStartedSubtitle', 'Here are some ways to make the most of Lead Forward')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-4 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              <Newspaper className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{t('home.startAction1', 'Explore the Feed')}</p>
              <p className="text-sm text-muted-foreground">
                {t('home.startTip1', 'Browse the community feed to see what others are sharing')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent-foreground flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              <Target className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{t('home.startAction2', 'Join Challenges')}</p>
              <p className="text-sm text-muted-foreground">
                {t('home.startTip2', 'Check out current challenges to earn points')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/10 text-secondary-foreground flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              <BookOpen className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{t('home.startAction3', 'Read & Learn')}</p>
              <p className="text-sm text-muted-foreground">
                {t('home.startTip3', 'Discover blogs and articles from the community')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
              <Trophy className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{t('home.startAction4', 'Climb the Ranks')}</p>
              <p className="text-sm text-muted-foreground">
                {t('home.startTip4', 'Climb the leaderboard and gain recognition')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
