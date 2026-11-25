// @ts-check
import { test, expect } from '@playwright/test';

const URL = 'https://demo.playwright.dev/todomvc/#/';
const STORAGE_KEY = 'react-todos';

const TODO_ITEMS = [
  'buy some cheese',
  'feed the cat',
  'book a doctors appointment',
];

// ---------- helpers ----------

async function addTodos(page, items = TODO_ITEMS) {
  const newTodo = page.getByPlaceholder('What needs to be done?');
  for (const item of items) {
    await newTodo.fill(item);
    await newTodo.press('Enter');
  }
}

async function checkNumberOfTodosInLocalStorage(page, expected) {
  return page.waitForFunction(
    ([key, n]) => JSON.parse(localStorage.getItem(key) || '[]').length === n,
    [STORAGE_KEY, expected],
  );
}

async function checkNumberOfCompletedTodosInLocalStorage(page, expected) {
  return page.waitForFunction(
    ([key, n]) =>
      JSON.parse(localStorage.getItem(key) || '[]').filter((t) => t.completed)
        .length === n,
    [STORAGE_KEY, expected],
  );
}

async function checkTodosInLocalStorage(page, title) {
  return page.waitForFunction(
    ([key, t]) =>
      JSON.parse(localStorage.getItem(key) || '[]')
        .map((todo) => todo.title)
        .includes(t),
    [STORAGE_KEY, title],
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
});

// ---------- initial state ----------

test.describe('Initial state', () => {
  test('shows the input focused with the correct placeholder', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await expect(newTodo).toBeVisible();
    await expect(newTodo).toBeFocused();
  });

  test('hides main section and footer when there are no todos', async ({ page }) => {
    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    await expect(page.locator('.main')).toBeHidden();
    await expect(page.locator('.footer')).toBeHidden();
    await expect(page.getByTestId('todo-count')).toBeHidden();
  });

  test('shows the page heading and info footer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'todos' })).toBeVisible();
    await expect(page.getByText('Double-click to edit a todo')).toBeVisible();
  });
});

// ---------- creating todos ----------

test.describe('New Todo', () => {
  test('adds items and clears the input after each one', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');

    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0]]);
    await expect(newTodo).toBeEmpty();

    await newTodo.fill(TODO_ITEMS[1]);
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0], TODO_ITEMS[1]]);

    await checkNumberOfTodosInLocalStorage(page, 2);
  });

  test('appends new items to the bottom of the list', async ({ page }) => {
    await addTodos(page);
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS);
    await expect(page.getByText('3 items left')).toBeVisible();
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
  });

  test('shows main and footer once an item is added', async ({ page }) => {
    await addTodos(page, [TODO_ITEMS[0]]);
    await expect(page.locator('.main')).toBeVisible();
    await expect(page.locator('.footer')).toBeVisible();
  });

  test('trims whitespace from new items', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('    buy some cheese    ');
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveText('buy some cheese');
    await checkTodosInLocalStorage(page, 'buy some cheese');
  });

  test('does not add empty or whitespace-only items', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-item')).toHaveCount(0);

    await newTodo.fill('     ');
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-item')).toHaveCount(0);
  });

  test('allows duplicate titles', async ({ page }) => {
    await addTodos(page, ['same', 'same']);
    await expect(page.getByTestId('todo-title')).toHaveText(['same', 'same']);
  });

  test('renders special characters as text, not HTML', async ({ page }) => {
    const payload = '<b>bold</b> & "quotes"';
    await addTodos(page, [payload]);
    await expect(page.getByTestId('todo-title')).toHaveText(payload);
    await expect(page.locator('.todo-list b')).toHaveCount(0);
  });
});

// ---------- item counter ----------

test.describe('Counter', () => {
  test('uses singular "item left" for one item', async ({ page }) => {
    await addTodos(page, [TODO_ITEMS[0]]);
    await expect(page.getByTestId('todo-count')).toHaveText('1 item left');
  });

  test('uses plural "items left" for several items', async ({ page }) => {
    await addTodos(page);
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
  });

  test('updates as items are completed and un-completed', async ({ page }) => {
    await addTodos(page);
    const first = page.getByTestId('todo-item').nth(0);

    await first.getByRole('checkbox').check();
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');

    await first.getByRole('checkbox').uncheck();
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
  });

  test('shows 0 items left when everything is complete', async ({ page }) => {
    await addTodos(page);
    await page.getByLabel('Mark all as complete').check();
    await expect(page.getByTestId('todo-count')).toHaveText('0 items left');
  });
});

// ---------- mark all as complete ----------

test.describe('Mark all as complete', () => {
  test.beforeEach(async ({ page }) => {
    await addTodos(page);
    await checkNumberOfTodosInLocalStorage(page, 3);
  });

  test('marks all items as completed', async ({ page }) => {
    await page.getByLabel('Mark all as complete').check();
    await expect(page.getByTestId('todo-item')).toHaveClass(['completed', 'completed', 'completed']);
    await checkNumberOfCompletedTodosInLocalStorage(page, 3);
  });

  test('clears the completed state of all items when unchecked', async ({ page }) => {
    const toggleAll = page.getByLabel('Mark all as complete');
    await toggleAll.check();
    await toggleAll.uncheck();
    await expect(page.getByTestId('todo-item')).toHaveClass(['', '', '']);
    await checkNumberOfCompletedTodosInLocalStorage(page, 0);
  });

  test('toggle-all checkbox follows individual item state', async ({ page }) => {
    const toggleAll = page.getByLabel('Mark all as complete');
    await toggleAll.check();

    // un-completing one item unchecks "mark all"
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').uncheck();
    await expect(toggleAll).not.toBeChecked();

    // re-completing it checks "mark all" again
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await expect(toggleAll).toBeChecked();
  });
});

// ---------- individual items ----------

test.describe('Item', () => {
  test('marks items as complete', async ({ page }) => {
    await addTodos(page, TODO_ITEMS.slice(0, 2));
    const [first, second] = await page.getByTestId('todo-item').all();

    await first.getByRole('checkbox').check();
    await expect(first).toHaveClass('completed');
    await expect(second).not.toHaveClass('completed');

    await second.getByRole('checkbox').check();
    await expect(first).toHaveClass('completed');
    await expect(second).toHaveClass('completed');
  });

  test('un-marks items as complete', async ({ page }) => {
    await addTodos(page, TODO_ITEMS.slice(0, 2));
    const [first, second] = await page.getByTestId('todo-item').all();

    await first.getByRole('checkbox').check();
    await expect(first).toHaveClass('completed');
    await expect(second).not.toHaveClass('completed');
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);

    await first.getByRole('checkbox').uncheck();
    await expect(first).not.toHaveClass('completed');
    await checkNumberOfCompletedTodosInLocalStorage(page, 0);
  });

  test('deletes an item via the delete button', async ({ page }) => {
    await addTodos(page);
    const item = page.getByTestId('todo-item').nth(1);
    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);
    await checkNumberOfTodosInLocalStorage(page, 2);
  });

  test('hides main and footer after the last item is deleted', async ({ page }) => {
    await addTodos(page, [TODO_ITEMS[0]]);
    const item = page.getByTestId('todo-item');
    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    await expect(page.locator('.main')).toBeHidden();
    await expect(page.locator('.footer')).toBeHidden();
  });

  test('deleting a completed item updates the counters', async ({ page }) => {
    await addTodos(page);
    const first = page.getByTestId('todo-item').nth(0);
    await first.getByRole('checkbox').check();
    await first.hover();
    await first.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeHidden();
  });
});

// ---------- editing ----------

test.describe('Editing', () => {
  test.beforeEach(async ({ page }) => {
    await addTodos(page);
    await checkNumberOfTodosInLocalStorage(page, 3);
  });

  test('hides the checkbox and label while editing', async ({ page }) => {
    const item = page.getByTestId('todo-item').nth(1);
    await item.dblclick();
    await expect(item.getByRole('checkbox')).toBeHidden();
    await expect(item.locator('label')).toBeHidden();
  });

  test('enters edit mode on double-click with the current text', async ({ page }) => {
    const item = page.getByTestId('todo-item').nth(1);
    await item.dblclick();
    await expect(item.getByRole('textbox', { name: 'Edit' })).toHaveValue(TODO_ITEMS[1]);
    await expect(item.getByRole('textbox', { name: 'Edit' })).toBeFocused();
  });

  test('saves edits on Enter', async ({ page }) => {
    const items = page.getByTestId('todo-item');
    await items.nth(1).dblclick();
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');

    await expect(items).toHaveText([TODO_ITEMS[0], 'buy some sausages', TODO_ITEMS[2]]);
    await checkTodosInLocalStorage(page, 'buy some sausages');
  });

  test('saves edits on blur', async ({ page }) => {
    const items = page.getByTestId('todo-item');
    await items.nth(1).dblclick();
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).blur();

    await expect(items).toHaveText([TODO_ITEMS[0], 'buy some sausages', TODO_ITEMS[2]]);
    await checkTodosInLocalStorage(page, 'buy some sausages');
  });

  test('trims entered text', async ({ page }) => {
    const items = page.getByTestId('todo-item');
    await items.nth(1).dblclick();
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).fill('    buy some sausages    ');
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');

    await expect(items).toHaveText([TODO_ITEMS[0], 'buy some sausages', TODO_ITEMS[2]]);
    await checkTodosInLocalStorage(page, 'buy some sausages');
  });

  test('removes the item if the text is cleared', async ({ page }) => {
    const items = page.getByTestId('todo-item');
    await items.nth(1).dblclick();
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).fill('');
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');

    await expect(items).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);
    await checkNumberOfTodosInLocalStorage(page, 2);
  });

  test('cancels edits on Escape', async ({ page }) => {
    const items = page.getByTestId('todo-item');
    await items.nth(1).dblclick();
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).press('Escape');

    await expect(items).toHaveText(TODO_ITEMS);
  });

  test('keeps the completed state after editing', async ({ page }) => {
    const items = page.getByTestId('todo-item');
    await items.nth(1).getByRole('checkbox').check();
    await items.nth(1).dblclick();
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).fill('edited');
    await items.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');

    await expect(items.nth(1)).toHaveClass('completed');
    await expect(items.nth(1)).toHaveText('edited');
  });
});

// ---------- clear completed ----------

test.describe('Clear completed button', () => {
  test.beforeEach(async ({ page }) => {
    await addTodos(page);
  });

  test('is hidden when no items are completed', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeHidden();
  });

  test('appears with the correct text once an item is completed', async ({ page }) => {
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeVisible();
  });

  test('removes only completed items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Clear completed' }).click();

    await expect(page.getByTestId('todo-item')).toHaveCount(2);
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);
    await checkNumberOfTodosInLocalStorage(page, 2);
  });

  test('hides itself after clearing', async ({ page }) => {
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Clear completed' }).click();
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeHidden();
  });

  test('clearing everything hides main and footer', async ({ page }) => {
    await page.getByLabel('Mark all as complete').check();
    await page.getByRole('button', { name: 'Clear completed' }).click();
    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    await expect(page.locator('.main')).toBeHidden();
    await expect(page.locator('.footer')).toBeHidden();
  });
});

// ---------- routing / filters ----------

test.describe('Routing and filters', () => {
  test.beforeEach(async ({ page }) => {
    await addTodos(page);
    await checkTodosInLocalStorage(page, TODO_ITEMS[0]);
  });

  test('"All" is selected by default and shows every item', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'All' })).toHaveClass('selected');
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS);
  });

  test('"Active" shows only uncompleted items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Active' }).click();

    await expect(page).toHaveURL(/#\/active$/);
    await expect(page.getByRole('link', { name: 'Active' })).toHaveClass('selected');
    await expect(page.getByTestId('todo-item')).toHaveCount(2);
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);
  });

  test('"Completed" shows only completed items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Completed' }).click();

    await expect(page).toHaveURL(/#\/completed$/);
    await expect(page.getByRole('link', { name: 'Completed' })).toHaveClass('selected');
    await expect(page.getByTestId('todo-item')).toHaveCount(1);
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS[1]);
  });

  test('"All" restores the full list', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Completed' }).click();
    await page.getByRole('link', { name: 'All' }).click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByTestId('todo-item')).toHaveCount(3);
  });

  test('respects the browser back button between filters', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();

    await page.getByRole('link', { name: 'All' }).click();
    await page.getByRole('link', { name: 'Active' }).click();
    await page.getByRole('link', { name: 'Completed' }).click();
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS[1]);

    await page.goBack();
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);

    await page.goBack();
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS);
  });

  test('deep-linking to a filter URL shows the filtered list', async ({ page }) => {
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);

    await page.goto('https://demo.playwright.dev/todomvc/#/completed');
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS[0]);
    await expect(page.getByRole('link', { name: 'Completed' })).toHaveClass('selected');
  });

  test('items completed while on "Active" disappear from the view', async ({ page }) => {
    await page.getByRole('link', { name: 'Active' }).click();
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').click();
    await expect(page.getByTestId('todo-item')).toHaveCount(2);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
  });

  test('new items can be added while on "Active"', async ({ page }) => {
    await page.getByRole('link', { name: 'Active' }).click();
    await addTodos(page, ['new active item']);
    await expect(page.getByTestId('todo-item')).toHaveCount(4);
  });

  test('counter reflects all items regardless of the active filter', async ({ page }) => {
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Completed' }).click();
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
  });
});

// ---------- persistence ----------

test.describe('Persistence', () => {
  test('persists todos and their state across reloads', async ({ page }) => {
    await addTodos(page, TODO_ITEMS.slice(0, 2));
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);

    await page.reload();

    const items = page.getByTestId('todo-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveClass('completed');
    await expect(items.nth(1)).not.toHaveClass('completed');
    await expect(page.getByTestId('todo-count')).toHaveText('1 item left');
  });

  test('persists the active filter across reloads', async ({ page }) => {
    await addTodos(page, TODO_ITEMS.slice(0, 2));
    await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Completed' }).click();

    await page.reload();
    await expect(page.getByRole('link', { name: 'Completed' })).toHaveClass('selected');
    await expect(page.getByTestId('todo-item')).toHaveCount(1);
  });

  test('persisted edits survive a reload', async ({ page }) => {
    await addTodos(page, [TODO_ITEMS[0]]);
    const item = page.getByTestId('todo-item');
    await item.dblclick();
    await item.getByRole('textbox', { name: 'Edit' }).fill('edited and saved');
    await item.getByRole('textbox', { name: 'Edit' }).press('Enter');
    await checkTodosInLocalStorage(page, 'edited and saved');

    await page.reload();
    await expect(page.getByTestId('todo-title')).toHaveText('edited and saved');
  });
});

// ---------- end-to-end flow ----------

test('full user journey', async ({ page }) => {
  await addTodos(page);
  await expect(page.getByTestId('todo-count')).toHaveText('3 items left');

  // complete one, edit another, delete the third
  await page.getByTestId('todo-item').nth(0).getByRole('checkbox').check();

  const second = page.getByTestId('todo-item').nth(1);
  await second.dblclick();
  await second.getByRole('textbox', { name: 'Edit' }).fill('feed the dog');
  await second.getByRole('textbox', { name: 'Edit' }).press('Enter');

  const third = page.getByTestId('todo-item').nth(2);
  await third.hover();
  await third.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0], 'feed the dog']);
  await expect(page.getByTestId('todo-count')).toHaveText('1 item left');

  // filters
  await page.getByRole('link', { name: 'Active' }).click();
  await expect(page.getByTestId('todo-title')).toHaveText('feed the dog');
  await page.getByRole('link', { name: 'Completed' }).click();
  await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS[0]);

  // clear completed, then everything is gone except the active item
  await page.getByRole('button', { name: 'Clear completed' }).click();
  await page.getByRole('link', { name: 'All' }).click();
  await expect(page.getByTestId('todo-title')).toHaveText('feed the dog');
});
