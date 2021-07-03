import {
  act, render, screen, waitFor, waitForElementToBeRemoved,
} from '@testing-library/react';
import App from '@hexlet/react-todo-app-with-backend';
import '@testing-library/jest-dom/extend-expect';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import handlers from '../handlers';
import {StatusCodes} from "http-status-codes";

const defaultState = {
  lists: [
    { id: 7, name: 'primary', removable: false },
  ],
  tasks: [],
  currentListId: 7,
};

const server = setupServer(...handlers(defaultState));
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
    if (text) userEvent.type(await this.screen.findByPlaceholderText('Please type text...'), text);
    const button = await this.screen.findByRole('button', { name: 'Add' });
    act(() => {
      userEvent.click(button);
    });
  }

  async deleteTask(taskText) {
    const removeButton = (await this.screen.findByText(taskText))
      .parentElement.parentElement.parentElement
      .querySelector('button.btn-danger');
    act(() => {
      userEvent.click(removeButton);
    });
  }

  async getCheckboxElement(taskText) {
    return (await this.screen.findByText(taskText))
      .parentElement.querySelector("input[type='checkbox']");
  }

  async addList(name) {
    const addListButton = this.screen.getByTestId('list-form').querySelector('button[type="submit"]');
    if (name) userEvent.type(await this.screen.findByPlaceholderText('List name...'), name);
    act(() => {
      userEvent.click(addListButton);
    });
  }

  removeList(name) {
    const removeBtn = this.screen.getByText(name).parentElement.querySelector('button.link-danger');
    act(() => {
      userEvent.click(removeBtn);
    });
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
    const taskText = 'new task';
    await todoListPage.addTask(taskText);
    expect(await screen.findByText(taskText)).toBeInTheDocument();

    const checkbox = await todoListPage.getCheckboxElement(taskText);

    userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());

    await todoListPage.deleteTask(taskText);
    expect(await todoListPage.emptyCurrentListSelector()).toBeInTheDocument();
  });

  test('general list flow', async () => {
    const oldListTaskText = 'task in the old list';
    await todoListPage.addTask(oldListTaskText);
    expect(await screen.findByText(oldListTaskText)).toBeVisible();

    const listName = 'newlist';
    await todoListPage.addList(listName);
    expect(await screen.findByText(listName)).toBeInTheDocument();
    expect(await todoListPage.emptyCurrentListSelector()).toBeInTheDocument();
    expect(screen.queryByText(oldListTaskText)).not.toBeInTheDocument();

    const taskText = 'new task in the new list';
    await todoListPage.addTask(taskText);
    expect(await screen.findByText(taskText)).toBeInTheDocument();

    await todoListPage.removeList(listName);
    await waitForElementToBeRemoved(() => screen.getByText(listName));
    // previous list doesn't become active in test, but does in browser
    // activate it explicitly
    userEvent.click(screen.getByText('primary'));
    expect(await screen.findByText(oldListTaskText)).toBeInTheDocument();
    expect(screen.getByText('primary')).toHaveClass('link-primary');
  });
});

describe('negative scenarios', () => {
  test('task api error', async () => {
    server.use(
      rest.post('/api/v1/lists/:id/tasks', (req, res, ctx) => res(ctx.status(StatusCodes.INTERNAL_SERVER_ERROR))),
    );
    await todoListPage.addTask('new task');
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  test('list api error', async () => {
    server.use(
      rest.post('/api/v1/lists', (req, res, ctx) => res(ctx.status(StatusCodes.INTERNAL_SERVER_ERROR))),
    );
    await todoListPage.addList('new list');
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  test('task duplicate', async () => {
    const taskText = 'new task text';
    await todoListPage.addTask(taskText);
    expect(await screen.findByText(taskText)).toBeInTheDocument();
    await todoListPage.addTask(taskText);
    expect(await screen.findByText(`${taskText} already exists`)).toBeInTheDocument();
  });

  test('list duplicate', async () => {
    const listName = 'new list name';
    await todoListPage.addList(listName);
    expect(await screen.findByText(listName)).toBeInTheDocument();
    await todoListPage.addList(listName);
    expect(await screen.findByText(`${listName} already exists`)).toBeInTheDocument();
  });

  test('empty task text', async () => {
    await todoListPage.addTask('');
    expect(await screen.findByText('Required!')).toBeInTheDocument();
  });

  test('empty list name', async () => {
    await todoListPage.addList('');
    expect(await screen.findByText('Required!')).toBeInTheDocument();
  });
});
