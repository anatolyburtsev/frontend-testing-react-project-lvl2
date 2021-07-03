import { rest } from 'msw';
import _ from 'lodash';
import { StatusCodes } from 'http-status-codes';

const getNextId = () => Number(_.uniqueId());

export default (initialState) => {
  const state = _.cloneDeep(initialState);
  return [
    rest.post('/api/v1/lists/:id/tasks', (req, res, ctx) => {
      const { text } = req.body;
      const task = {
        text,
        listId: Number(req.params.id),
        id: getNextId(),
        completed: false,
        touched: Date.now(),
      };
      state.tasks.push(task);
      return res(
        ctx.status(StatusCodes.CREATED),
        ctx.json(task),
      );
    }),

    rest.patch('/api/v1/tasks/:id', (req, res, ctx) => {
      const id = Number(req.params.id);
      const { completed } = req.body;
      const task = state.tasks.filter((t) => t.id === id)[0];
      task.completed = completed;
      task.touched = Date.now();
      return res(
        ctx.status(StatusCodes.CREATED),
        ctx.json(task),
      );
    }),

    rest.delete('/api/v1/tasks/:id', (req, res, ctx) => {
      const id = Number(req.params.id);
      state.tasks = state.tasks.filter((t) => t.id !== id);
      return res(
        ctx.status(StatusCodes.NO_CONTENT),
      );
    }),

    rest.post('/api/v1/lists', (req, res, ctx) => {
      const { name } = req.body;
      const list = {
        name,
        id: getNextId(),
        removable: true,
      };
      state.lists.push(list);
      return res(
        ctx.status(StatusCodes.CREATED),
        ctx.json(list),
      );
    }),

    rest.delete('/api/v1/lists/:id', (req, res, ctx) => {
      const id = Number(req.params.id);
      state.lists = state.lists.filter((list) => list.id !== id);
      return res(
        ctx.status(StatusCodes.NO_CONTENT),
      );
    }),
  ];
};
