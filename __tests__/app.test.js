import { render, screen } from '@testing-library/react';
import App from '@hexlet/react-todo-app-with-backend';
import '@testing-library/jest-dom/extend-expect';

const defaultState = {
  lists: [],
  tasks: [],
  currentListId: 0,
};

describe('happy path', () => {
  test('todo page loads', () => {
    render(App(defaultState));

    screen.getByText('Hexlet Todos');

    expect(screen.getByTestId('list-form')).toHaveTextContent('add list');
    expect(screen.getByTestId('task-form')).toHaveTextContent('New task');
  });
});
