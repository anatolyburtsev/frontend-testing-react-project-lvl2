import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';

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

export default TodoListPage;
