import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { MentoringLevelPicker } from '../components/MentoringLevelPicker';
import { PaymentTypePicker } from '../components/PaymentTypePicker';
import { ExpertiseDomainPicker } from '../components/ExpertiseDomainPicker';
import { ExpertiseTopicPicker } from '../components/ExpertiseTopicPicker';
import { MentorCard } from '../components/MentorCard';
import { RequestMentorshipDialog } from '../components/RequestMentorshipDialog';
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '../components/ui/empty';
import { searchMentors } from '../services/mentorService';
import { handleApiError } from '../services/apiClient';
import type { MentorProfile } from '../../types/mentor';

/**
 * MentorBrowse page
 * Main discovery page for mentees to search and filter mentors
 * Displays filtered mentor list with pagination
 */
export function MentorBrowse() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Note: Authentication is handled by ProtectedRoute wrapper, no need to check here
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const itemsPerPage = 12;

  const form = useForm({
    defaultValues: {
      mentoring_levels: 0,
      payment_types: 0,
      hourly_rate_min: 0,
      hourly_rate_max: 200,
      nick_name: '',
      expertise_domains: 0,
      expertise_topics_preset: 0,
      expertise_topics_custom: [],
    },
  });

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const values = form.getValues();
      const data = await searchMentors({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        nick_name: values.nick_name || undefined,
        mentoring_levels: values.mentoring_levels > 0 ? values.mentoring_levels : undefined,
        payment_types: values.payment_types > 0 ? values.payment_types : undefined,
        hourly_rate_min: values.hourly_rate_min > 0 ? values.hourly_rate_min : undefined,
        hourly_rate_max: values.hourly_rate_max < 200 ? values.hourly_rate_max : undefined,
        expertise_domains: values.expertise_domains > 0 ? values.expertise_domains : undefined,
        expertise_topics: values.expertise_topics_preset > 0 ? values.expertise_topics_preset : undefined,
        expertise_topics_custom: values.expertise_topics_custom && values.expertise_topics_custom.length > 0 ? values.expertise_topics_custom : undefined,
      });
      setMentors(data.mentors || []);
      setTotal(data.total || 0);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, form]);

  // Auto-fetch on mount
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleFilterChange = () => {
    setCurrentPage(1);
    handleSearch();
  };

  const handleViewDetails = (mentor: MentorProfile) => {
    // Navigate to mentor detail page (auth already checked by ProtectedRoute)
    navigate(`/mentors/${mentor.id}`);
  };

  const handleRequestMentorship = (mentor: MentorProfile) => {
    // Open dialog to collect introduction and preferred time (auth already checked by ProtectedRoute)
    setSelectedMentor(mentor);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    navigate('/matches');
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('mentor.findYourMentor')}</h1>
        <p className="text-muted-foreground">
          {t('mentor.browseAndConnect')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <FormProvider {...form}>
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search">{t('mentor.searchByName')}</Label>
                <Input
                  id="search"
                  placeholder={t('mentor.nicknameHelp')}
                  {...form.register('nick_name')}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="space-y-3">
                <ExpertiseDomainPicker control={form.control} required={true} />
              </div>

              <div className="space-y-3">
                <ExpertiseTopicPicker control={form.control} required={true} />
              </div>

              <div className="space-y-3">
                <MentoringLevelPicker control={form.control} />
              </div>

              <div className="space-y-3">
                <PaymentTypePicker control={form.control} />
              </div>

              <div className="space-y-3">
                <Label>{t('mentor.hourlyRate')}: ${form.watch('hourly_rate_min')} - ${form.watch('hourly_rate_max')}</Label>
                <Slider
                  min={0}
                  max={200}
                  step={10}
                  value={[form.watch('hourly_rate_min'), form.watch('hourly_rate_max')]}
                  onValueChange={(value) => {
                    form.setValue('hourly_rate_min', value[0]);
                    form.setValue('hourly_rate_max', value[1]);
                    handleFilterChange();
                  }}
                  className="w-full"
                />
              </div>

              <Button onClick={handleSearch} className="w-full">
                {t('common.search')}
              </Button>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            {mentors.length === 0 && !loading ? (
              <Empty>
                <EmptyContent>
                  <EmptyTitle>{t('mentor.noMentorsFound')}</EmptyTitle>
                  <EmptyDescription>{t('mentor.adjustFilters')}</EmptyDescription>
                  <Button onClick={() => form.reset()} variant="outline" className="mt-4">
                    {t('common.clear')}
                  </Button>
                </EmptyContent>
              </Empty>
            ) : loading ? (
              <div className="flex justify-center items-center py-12">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mentors.map((mentor) => (
                    <MentorCard
                      key={mentor.id}
                      mentor={mentor}
                      onViewDetails={() => handleViewDetails(mentor)}
                      onRequestMentorship={() => handleRequestMentorship(mentor)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(Math.max(1, currentPage - 1));
                        handleSearch();
                      }}
                      disabled={currentPage === 1}
                    >
                      {t('pagination.previous')}
                    </Button>
                    <span className="flex items-center px-4">
                      {t('pagination.pageOf', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(Math.min(totalPages, currentPage + 1));
                        handleSearch();
                      }}
                      disabled={currentPage === totalPages}
                    >
                      {t('pagination.next')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </FormProvider>

        {/* Mentorship Request Dialog */}
        <RequestMentorshipDialog
          mentor={selectedMentor}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      </div>
    </div>
  );
}
