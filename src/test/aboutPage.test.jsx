import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutPage } from '../pages/AboutPage.jsx';

describe('AboutPage', () => {
  it('credits the creator with external links that open outside the app', () => {
    render(<AboutPage />);
    expect(screen.getByText('Sai Ethihas Chanda')).toBeInTheDocument();

    const expected = {
      Portfolio: 'https://saiethihaschanda.github.io/Portfolio/',
      GitHub: 'https://github.com/SaiEthihasChanda',
      LinkedIn: 'https://www.linkedin.com/in/sai-ethihas-chanda-6724b0294/',
      'Lekalu launch post': 'https://lnkd.in/p/dktYimiR',
    };
    Object.entries(expected).forEach(([label, href]) => {
      const link = screen.getByRole('link', { name: new RegExp(`^${label}`) });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
  });
});
