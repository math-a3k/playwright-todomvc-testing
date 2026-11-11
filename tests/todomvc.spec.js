// @ts-check
import { test, expect } from '@playwright/test';

test('CRUD of todos', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc/#/');

  // Test todo creation and reading
  const todo_label = 'test todo'
  const textbox = page.getByRole('textbox', { name: 'What needs to be done?' })
  await textbox.click();
  await textbox.fill(todo_label);
  await textbox.press('Enter');
  await expect(page.getByTestId('todo-title')).toContainText(todo_label);

  // Test todo edition
  await page.getByText(todo_label).dblclick();
  const edit_textbox = page.getByRole('textbox', { name: 'Edit' })
  await edit_textbox.fill(todo_label + ' 1');
  await edit_textbox.press('Enter');
  await expect(page.getByTestId('todo-title')).toContainText(todo_label + ' 1');

  // Test todo deletion
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('todo-title')).toBeHidden();

});

test('filtering of todos', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc/#/');

  // Prepolutate / Test data
  const textbox = page.getByRole('textbox', { name: 'What needs to be done?' })
  await textbox.click();
  await textbox.fill("todo 1");
  await textbox.press('Enter');
  await textbox.click();
  await textbox.fill("todo 2");
  await textbox.press('Enter');
  const list_items = page.getByTestId('todo-item')
  await expect(list_items).toHaveCount(2);
  await expect(page.getByTestId('todo-count')).toContainText('2');

  // Mark 'todo 1' as done
  await page.getByRole('listitem').filter({ hasText: 'todo 1' }).getByLabel('Toggle Todo').check();
  // Assert the title has been checked
  await expect(page.getByTestId('todo-item').filter({ hasText: 'todo 1' })).toContainClass('completed');

  // Filter by "Active"
  await page.getByRole('link', { name: 'Active' }).click();
  // Assert there's only one list item, it's not 'todo 1' and todo-count is 1
  await expect(list_items).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 1' })).toBeHidden()
  await expect(page.getByTestId('todo-count')).toContainText('1');

  // Filter by "Completed"
  await page.getByRole('link', { name: 'Completed' }).click();
  // Assert there's only one list item and it is 'todo 1'
  await expect(list_items).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 1' })).toBeVisible();

  // Filter by "All"
  await page.getByRole('link', { name: 'All' }).click();
  // Assert there's two list items and both todos are there
  await expect(list_items).toHaveCount(2);
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 1' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 2' })).toBeVisible();

  // "Clear Completed"
  await page.getByRole('button', { name: 'Clear completed' }).click();
  // Assert there's one list item and 'todo 1' has been cleared
  await expect(list_items).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 1' })).toBeHidden();
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 2' })).toBeVisible();

  // Teardown / Removing test data
  await page.getByTestId('todo-item').hover();
  await page.getByRole('button', { name: 'Delete' }).click();

});
