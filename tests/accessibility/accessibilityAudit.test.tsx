import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../../src/store';
import BigButton from '../../src/components/BigButton';
import MedicationCard from '../../src/components/MedicationCard';
import EmptyState from '../../src/components/EmptyState';
import AdBanner from '../../src/components/AdBanner';
import { Medication } from '../../src/types';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>{children}</Provider>
);

const mockMedication: Medication = {
  id: 'med-1',
  name: 'Metformin',
  dosage: '500',
  unit: 'mg',
  instructions: 'Take with food',
  color: '#45B7D1',
  colorLabel: 'Blue',
  shape: 'round',
  pillCount: 30,
  refillAt: 7,
  notes: '',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Accessibility Audit', () => {
  describe('BigButton', () => {
    it('has accessibilityRole="button"', () => {
      const { getByRole } = render(
        <Wrapper>
          <BigButton label="Take Medication" onPress={jest.fn()} variant="primary" />
        </Wrapper>
      );
      const button = getByRole('button', { name: 'Take Medication' });
      expect(button).toBeTruthy();
    });

    it('has non-empty accessibilityLabel', () => {
      const { getByRole } = render(
        <Wrapper>
          <BigButton label="TAKEN" onPress={jest.fn()} variant="primary" />
        </Wrapper>
      );
      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityLabel.length).toBeGreaterThan(0);
    });

    it('sets accessibilityState disabled when disabled prop is true', () => {
      const { getByRole } = render(
        <Wrapper>
          <BigButton label="Disabled Button" onPress={jest.fn()} variant="primary" disabled />
        </Wrapper>
      );
      const button = getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('shows accessible=true', () => {
      const { getByRole } = render(
        <Wrapper>
          <BigButton label="Test" onPress={jest.fn()} variant="secondary" />
        </Wrapper>
      );
      const button = getByRole('button');
      expect(button.props.accessible).toBe(true);
    });
  });

  describe('MedicationCard', () => {
    it('has accessible accessibilityLabel with medication details', () => {
      const { getByRole } = render(
        <Wrapper>
          <MedicationCard medication={mockMedication} onPress={jest.fn()} />
        </Wrapper>
      );
      const card = getByRole('button');
      expect(card.props.accessibilityLabel).toContain('Metformin');
      expect(card.props.accessibilityLabel).toContain('500');
    });

    it('has accessibilityHint', () => {
      const { getByRole } = render(
        <Wrapper>
          <MedicationCard medication={mockMedication} onPress={jest.fn()} />
        </Wrapper>
      );
      const card = getByRole('button');
      expect(card.props.accessibilityHint).toBeTruthy();
    });
  });

  describe('EmptyState', () => {
    it('action button has accessibilityRole="button"', () => {
      const { getByRole } = render(
        <Wrapper>
          <EmptyState
            title="No medicines"
            subtitle="Add one to get started"
            actionLabel="Add Medicine"
            onAction={jest.fn()}
          />
        </Wrapper>
      );
      const button = getByRole('button', { name: 'Add Medicine' });
      expect(button).toBeTruthy();
    });
  });

  describe('AdBanner', () => {
    it('renders null on blocked screens', () => {
      const { queryByAccessibilityHint } = render(
        <Wrapper>
          <AdBanner screenName="ReminderAlert" />
        </Wrapper>
      );
      // Should not render anything for blocked screens
      const allByLabelText = queryByAccessibilityHint('Advertisement');
      expect(allByLabelText).toBeNull();
    });

    it('renders on allowed screens', () => {
      const { getByLabelText } = render(
        <Wrapper>
          <AdBanner screenName="AlertHistory" />
        </Wrapper>
      );
      const ad = getByLabelText('Advertisement');
      expect(ad).toBeTruthy();
    });
  });
});
