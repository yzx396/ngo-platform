import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { MentoringLevelPicker } from '../components/MentoringLevelPicker';
import { PaymentTypePicker } from '../components/PaymentTypePicker';
import { MentorCard } from '../components/MentorCard';
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '../components/ui/empty';
import { searchMentors } from '../services/mentorService';
import { handleApiError } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type { MentorProfile } from '../../types/mentor';

/**
 * MentorBrowse page
 * Main discovery page for mentees to search and filter mentors
 * Displays filtered mentor list with pagination
 */
export function MentorBrowse() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 12;

  const form = useForm({
    defaultValues: {
      mentoring_levels: 0,
      payment_types: 0,
      hourly_rate_min: 0,
      hourly_rate_max: 200,
      nick_name: '',
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
    // Navigate to mentor detail page
    navigate(`/mentors/${mentor.id}`);
  };

  const handleRequestMentorship = async (mentor: MentorProfile) => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/mentors/browse' } });
      return;
    }
    
    // TODO: Create match request
    console.log('Request mentorship from:', mentor.nick_name);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Find Your Mentor</h1>
        <p className="text-lg text-muted-foreground">
          Browse and connect with experienced mentors in your field
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <FormProvider {...form}>
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search">Search by Name</Label>
                <Input
                  id="search"
                  placeholder="Nickname..."
                  {...form.register('nick_name')}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="space-y-3">
                <MentoringLevelPicker control={form.control} />
              </div>

              <div className="space-y-3">
                <PaymentTypePicker control={form.control} />
              </div>

              <div className="space-y-3">
                <Label>Hourly Rate: ${form.watch('hourly_rate_min')} - ${form.watch('hourly_rate_max')}</Label>
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
                Search
              </Button>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            {mentors.length === 0 && !loading ? (
              <Empty>
                <EmptyContent>
                  <EmptyTitle>No mentors found</EmptyTitle>
                  <EmptyDescription>Try adjusting your filters or searching for different keywords</EmptyDescription>
                  <Button onClick={() => form.reset()} variant="outline" className="mt-4">
                    Clear Filters
                  </Button>
                </EmptyContent>
              </Empty>
            ) : loading ? (
              <div className="flex justify-center items-center py-12">
                <p className="text-muted-foreground">Loading...</p>
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
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(Math.min(totalPages, currentPage + 1));
                        handleSearch();
                      }}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </FormProvider>
      </div>
    </div>
  );
}
