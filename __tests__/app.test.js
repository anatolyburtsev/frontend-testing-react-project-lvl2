import {
  render, screen, waitFor, waitForElementToBeRemoved,
} from '@testing-library/react';
import App from '@hexlet/react-todo-app-with-backend';
import '@testing-library/jest-dom/extend-expect';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { StatusCodes } from 'http-status-codes';
import handlers from '../src/mock/handlers';
import TodoListPage from '../src/TodoListPage';

let server;
let todoListPage;

beforeEach(() => {
  const defaultState = {
    lists: [
      { id: 7, name: 'primary', removable: false },
    ],
    tasks: [],
    currentListId: 7,
  };

  server = setupServer(...handlers(defaultState));
  server.listen();
  render(App(defaultState));
  todoListPage = new TodoListPage(screen);
});

afterAll(() => server.close());

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
