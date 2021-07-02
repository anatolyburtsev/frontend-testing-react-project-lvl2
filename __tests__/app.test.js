import {
  render, screen, waitFor, waitForElementToBeRemoved,
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
    const addListButton = this.screen.getByTestId('list-form').querySelector('button[type="submit"]');
    userEvent.type(await this.screen.findByPlaceholderText('List name...'), name);
    userEvent.click(addListButton);
  }

  removeList(name) {
    const removeBtn = this.screen.getByText(name).parentElement.querySelector('button.link-danger');
    userEvent.click(removeBtn);
  }
}

beforeEach(() => {
  render(App(defaultState));
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
    const text = 'new task';
    await todoListPage.addTask(text);
    expect(await screen.findByText(text)).toBeInTheDocument();

    todoListPage.toggleTheOnlyTask();
    const checkbox = todoListPage.getCheckboxElement();
    await waitFor(() => expect(checkbox).toBeChecked());

    await todoListPage.deleteTheOnlyTask();
    expect(await todoListPage.emptyCurrentListSelector()).toBeInTheDocument();
  });

  test('general list flow', async () => {
    await todoListPage.addTask('task in the old list');

    const listName = 'newlist';
    await todoListPage.addList(listName);
    expect(await screen.findByText(listName)).toBeInTheDocument();
    expect(await todoListPage.emptyCurrentListSelector()).toBeInTheDocument();

    const taskText = 'new task in the new list';
    await todoListPage.addTask(taskText);

    await todoListPage.removeList(listName);
    await waitForElementToBeRemoved(() => screen.getByText(listName));
    // await waitForElementToBeRemoved(() => screen.getByText(taskText));
    // expect(screen.getByText(listName)).not.toBeInTheDocument();
    // expect(screen.getByText(taskText)).not.toBeInTheDocument();
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
