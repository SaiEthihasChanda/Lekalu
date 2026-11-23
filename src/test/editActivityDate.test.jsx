import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditActivityForm } from '../components/EditActivityForm.jsx';

const DATE = new Date(2025, 4, 12, 9, 30).getTime();
const accounts = [{ id: 'hdfc', cardName: 'HDFC', accountNumber: '1234' }, { id: 'cash', cardName: 'Cash' }];
const activity = { id: 'a1', amount: 250, type: 'expense', description: 'Lunch', accountId: 'hdfc', date: DATE };

const renderForm = (overrides = {}) => {
  const onSubmit = vi.fn();
  const { container } = render(
    <EditActivityForm activity={{ ...activity, ...overrides }} trackables={[]} accounts={accounts} onSubmit={onSubmit} />,
  );
  const dateInput = container.querySelector('input[type="datetime-local"]');
  return { onSubmit, dateInput };
};

describe('EditActivityForm date', () => {
  it('shows the current date and time and leaves it out when unchanged', () => {
    const { onSubmit, dateInput } = renderForm();
    expect(dateInput).toHaveValue('2025-05-12T09:30');
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('date');
  });

  it('saves a changed date as milliseconds', () => {
    const { onSubmit, dateInput } = renderForm();
    fireEvent.change(dateInput, { target: { value: '2025-05-10T18:45' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ amount: 250, date: new Date(2025, 4, 10, 18, 45).getTime() });
  });

  it('notes that a tracker-created entry stays linked when its date moves', () => {
    const { dateInput } = renderForm({ trackerId: 'rent_123' });
    expect(screen.queryByText(/stays linked to its tracker/)).not.toBeInTheDocument();
    fireEvent.change(dateInput, { target: { value: '2025-05-02T10:00' } });
    expect(screen.getByText(/stays linked to its tracker/)).toBeInTheDocument();
  });

  it('rejects an empty date instead of saving garbage', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSubmit, dateInput } = renderForm();
    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
