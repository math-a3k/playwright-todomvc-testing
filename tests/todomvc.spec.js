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
  await expect(page.getByRole('listitem').filter({ hasText: todo_label })).toBeVisible();

  // Test todo edition
  await page.getByText(todo_label).dblclick();
  const edit_textbox = page.getByRole('textbox', { name: 'Edit' })
  await edit_textbox.fill(todo_label + ' 1');
  await edit_textbox.press('Enter');
  await expect(page.getByRole('listitem').filter({ hasText: todo_label + ' 1'})).toBeVisible();

  // Test todo deletion
  // ** Accesibility issue: Button for deletion is only shown in the AT when the pointer is hover
  // the list item (which is accidentally there), is not accesible through the "initial" AT,
  // users without a pointer won't be able to reach it
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: todo_label + ' 1'})).toBeHidden();

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
  // **AT Issue**: Items of todo list are not identifiable in the AT by a condition,
  // resorting to DOM locator
  const list_items = page.getByTestId('todo-item')
  await expect(list_items).toHaveCount(2);
  await expect(page.getByText('2 items')).toBeVisible();

  // Mark 'todo 1' as done
  await page.getByRole('listitem').filter({ hasText: 'todo 1' }).getByLabel('Toggle Todo').check();
  // Assert the title has been checked
  // Consequence checked on DOM (CSS class), not in the AT - see Issue #4
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 1' })).toContainClass('completed');

  // Filter by "Active"
  await page.getByRole('link', { name: 'Active' }).click();
  // Assert there's only one list item, it's not 'todo 1' and todo-count is 1
  await expect(list_items).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: 'todo 1' })).toBeHidden()
  await expect(page.getByText('1 item')).toBeVisible();

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
  // ** Accesibility issue: Button for deletion is only shown in the AT when the pointer is hover
  // the list item, is not accesible through the "initial" AT
  await page.getByRole('listitem').filter({ hasText: 'todo 2' }).hover();
  await page.getByRole('button', { name: 'Delete' }).click();

});
