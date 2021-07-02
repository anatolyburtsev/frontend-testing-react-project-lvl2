import {
  render, screen, waitFor,
} from '@testing-library/react';
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

const server = setupServer(...handlers(defaultState));
//
// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

let todoListPage;
let appContainer;
class TodoListPage {
  constructor(appScreen) {
    this.screen = appScreen;
  }

  emptyCurrentListSelector() {
    return this.screen.findByText('Tasks list is empty');
  }

  async addTask(text) {
    userEvent.type(await this.screen.findByPlaceholderText('Please type text...'), text);
    userEvent.click(await this.screen.findByRole('button', { name: 'Add' }));
  }

  async deleteTheOnlyTask() {
    const removeButton = await this.screen.getByRole('button', { name: 'Remove' });
    userEvent.click(removeButton);
  }

  getCheckboxElement() {
    return this.screen.getByRole('checkbox');
  }

  toggleTheOnlyTask() {
    const checkbox = this.getCheckboxElement();
    userEvent.click(checkbox);
  }

  async addList(name) {
    const addListButton = appContainer.querySelector('button[type="submit"]');
    userEvent.type(await this.screen.findByPlaceholderText('List name...'), name);
    userEvent.click(addListButton);
  }
}

beforeEach(() => {
  const { container } = render(App(defaultState));
  appContainer = container;
  todoListPage = new TodoListPage(screen);
});

describe('basic positive scenarios', () => {
  test('todo page loads', async () => {
    screen.getByText('Hexlet Todos');
    expect(screen.getByTestId('list-form')).toHaveTextContent('add list');
    expect(screen.getByTestId('task-form')).toHaveTextContent('New task');
    expect(await todoListPage.emptyCurrentListSelector()).toBeInTheDocument();
  });

  test('general task flow', async () => {
    await todoListPage.addTask('new task');
    expect(await screen.findByText('new task')).toBeInTheDocument();

    todoListPage.toggleTheOnlyTask();
    const checkbox = todoListPage.getCheckboxElement();
    await waitFor(() => expect(checkbox).toBeChecked());

    await todoListPage.deleteTheOnlyTask();
    expect(await todoListPage.emptyCurrentListSelector()).toBeInTheDocument();
  });

  test('create new list', async () => {
    const name = 'newlist';
    await todoListPage.addList(name);
    expect(await screen.findByText(name)).toBeInTheDocument();
  });
});

describe('negative scenarios', () => {
  test('api error', async () => {
    server.use(
      rest.post('/api/v1/lists/:id/tasks', (req, res, ctx) => res(ctx.status(500))),
    );
    await todoListPage.addTask('new task');
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});
