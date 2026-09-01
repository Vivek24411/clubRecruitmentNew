import { fireEvent, render } from '@testing-library/react-native';

import { Button, Field, Heading, SearchField } from './ui';

describe('mobile UI accessibility', () => {
  it('exposes visual headings to screen readers', () => {
    const screen = render(<Heading>Calendar</Heading>);
    expect(screen.getByRole('header')).toHaveTextContent('Calendar');
  });

  it('announces field errors and labels the input', () => {
    const screen = render(<Field label="IITR email" error="Enter a valid IITR email" />);
    expect(screen.getByLabelText('IITR email')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid IITR email');
  });

  it('keeps primary actions accessible and pressable', () => {
    const onPress = jest.fn();
    const screen = render(<Button label="Add to calendar" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps mobile search editable', () => {
    const onChangeText = jest.fn();
    const screen = render(<SearchField value="" onChangeText={onChangeText} placeholder="Search clubs" />);
    const input = screen.getByRole('search', { name: 'Search clubs' });
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'robotics');
    expect(onChangeText).toHaveBeenCalledWith('robotics');
  });
});
