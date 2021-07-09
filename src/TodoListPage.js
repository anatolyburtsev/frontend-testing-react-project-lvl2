import userEvent from '@testing-library/user-event';

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
    userEvent.click(button);
  }

  async deleteTask(taskText) {
    const removeButton = (await this.screen.findByText(taskText))
      .closest('li').querySelector("button.btn-danger");
    userEvent.click(removeButton);
  }

  async getCheckboxElement(taskText) {
    return (await this.screen.findByText(taskText))
        .closest('li').querySelector("input[type='checkbox']");
  }

  async addList(name) {
    const addListButton = this.screen.getByTestId('list-form').querySelector('button[type="submit"]');
    if (name) userEvent.type(await this.screen.findByPlaceholderText('List name...'), name);
    userEvent.click(addListButton);
  }

  removeList(name) {
    const removeBtn = this.screen.getByText(name).closest('li')
        .querySelector('button.link-danger');
    userEvent.click(removeBtn);
  }
}

export default TodoListPage;
