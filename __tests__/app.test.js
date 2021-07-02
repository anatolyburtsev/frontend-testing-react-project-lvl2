import { render, screen, waitFor } from '@testing-library/react';
import App from '@hexlet/react-todo-app-with-backend';
import '@testing-library/jest-dom/extend-expect';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import handlers from '../handlers';

const defaultState = {
  lists: [
    { id: 7, name: 'primary', removable: false },
    { id: 8, name: 'secondary', removable: true },
  ],
  tasks: [
    {
      text: 'secondary task',
      id: 8,
      listId: 8,
      completed: false,
      touched: Date.now(),
    },
  ],
  currentListId: 7,
};

let server;
// export const server = setupServer(...handlers);

// Establish API mocking before all tests.
// beforeAll(() => server.listen())

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
// afterEach(() => server.resetHandlers())

// Clean up after the tests are finished.
// afterAll(() => server.close())

beforeEach(() => {
  server = setupServer(...handlers(defaultState));
  server.listen();
  render(App(defaultState));
});

afterEach(() => {
  server.close();
});

describe('happy path', () => {
  test('todo page loads', () => {
    screen.getByText('Hexlet Todos');

    expect(screen.getByTestId('list-form')).toHaveTextContent('add list');
    expect(screen.getByTestId('task-form')).toHaveTextContent('New task');
    screen.getByText('Tasks list is empty');
  });

  test('api error', async () => {
    server.use(
      rest.post('/api/v1/lists/:id/tasks', (req, res, ctx) => res(ctx.status(500))),
    );
    userEvent.type(await screen.findByPlaceholderText('Please type text...'), 'new task');
    userEvent.click(await screen.findByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  test('general task flow', async () => {
    const taskInput = await screen.getByPlaceholderText('Please type text...');
    userEvent.type(taskInput, 'new task');
    const addButton = await screen.getByRole('button', { name: 'Add' });
    userEvent.click(addButton);
    expect(await screen.findByText('new task')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());

    const removeButton = await screen.getByRole('button', { name: 'Remove' });
    userEvent.click(removeButton);
    expect(await screen.findByText('Tasks list is empty')).toBeInTheDocument();
  });
});
