import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FounderCard } from '../components/FounderCard';

describe('FounderCard', () => {
  it('should render founder name', () => {
    render(
      <FounderCard
        name="John Doe"
        title="Co-Founder"
        photoUrl="/images/john.jpg"
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render founder title', () => {
    render(
      <FounderCard
        name="John Doe"
        title="Co-Founder"
        photoUrl="/images/john.jpg"
      />
    );

    expect(screen.getByText('Co-Founder')).toBeInTheDocument();
  });

  it('should render founder photo with correct alt text', () => {
    render(
      <FounderCard
        name="John Doe"
        title="Co-Founder"
        photoUrl="/images/john.jpg"
      />
    );

    const image = screen.getByAltText('John Doe');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/images/john.jpg');
  });


  it('should have circular photo styling', () => {
    const { container } = render(
      <FounderCard
        name="John Doe"
        title="Co-Founder"
        photoUrl="/images/john.jpg"
      />
    );

    const photoContainer = container.querySelector('.rounded-full');
    expect(photoContainer).toBeInTheDocument();
  });

});
