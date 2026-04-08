import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StepIndicator } from '../ui/StepIndicator';

describe('StepIndicator', () => {
  it('renders all 5 labels and no checkmarks when current=1', () => {
    render(<StepIndicator current={1} />);

    expect(screen.getByText('Serviço')).toBeDefined();
    expect(screen.getByText('Barbeiro')).toBeDefined();
    expect(screen.getByText('Horário')).toBeDefined();
    expect(screen.getByText('Seus dados')).toBeDefined();
    expect(screen.getByText('Confirmar')).toBeDefined();

    expect(document.body.textContent).not.toContain('✓');
  });

  it('shows 2 checkmarks for completed steps and numbers for remaining steps when current=3', () => {
    render(<StepIndicator current={3} />);

    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks).toHaveLength(2);

    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows 4 checkmarks for completed steps and number 5 for last step when current=5', () => {
    render(<StepIndicator current={5} />);

    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks).toHaveLength(4);

    expect(screen.getByText('5')).toBeDefined();
  });
});
