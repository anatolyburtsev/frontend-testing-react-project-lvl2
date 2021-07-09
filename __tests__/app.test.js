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
      { id: 70, name: 'primary', removable: false },
    ],
    tasks: [],
    currentListId: 70,
  };

  server = setupServer(...handlers(defaultState));
  server.listen();
  render(App(defaultState));
  todoListPage = new TodoListPage(screen);
});

afterEach(() => server.resetHandlers());

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

  test('add button should be disabled during submit', async () => {
    const taskText = 'new task text';
    const button = await screen.findByRole('button', { name: 'Add' });
    await todoListPage.addTask(taskText);
    expect(button).toBeDisabled();
    await screen.findByText(taskText);
    expect(button).toBeEnabled();
  });

  test('finished task goes to the end of the list', async () => {
    const task1 = 'task 1 text';
    const task2 = 'task 2 text';
    const task3 = 'task 3 text';
    await todoListPage.addTask(task1);
    expect(await screen.findByText(task1)).toBeInTheDocument();
    await todoListPage.addTask(task2);
    expect(await screen.findByText(task2)).toBeInTheDocument();
    await todoListPage.addTask(task3);
    expect(await screen.findByText(task3)).toBeInTheDocument();

    const checkbox2 = await todoListPage.getCheckboxElement(task2);
    userEvent.click(checkbox2);
    await waitFor(() => expect(checkbox2).toBeChecked());

    const tasksElements = screen.getByTestId('tasks')
      .querySelectorAll('li');
    const tasksText = [...tasksElements].map((el) => el.textContent);

    expect(tasksText[2]).toContain(task2);

    const checkbox3 = await todoListPage.getCheckboxElement(task3);
    userEvent.click(checkbox3);
    await waitFor(() => expect(checkbox3).toBeChecked());

    const tasksElements2 = screen.getByTestId('tasks')
      .querySelectorAll('li');
    const tasksText2 = [...tasksElements2].map((el) => el.textContent);

    expect(tasksText2[1]).toContain(task3);
    expect(tasksText2[2]).toContain(task2);
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
