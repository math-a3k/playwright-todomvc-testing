# Playwright TodoMVC testing

This repository aims to provide a reference implementation of end-to-end testing for the [TodoMVC sample application](https://demo.playwright.dev/todomvc/) using [Playwright](https://playwright.dev/).

## Installation

With `git` and `npm` available in your path, execute the following in your shell:
```
git clone https://github.com/math-a3k/playwright-todomvc-testing.git
cd playwright-todomvc-testing
npm install
npx playwright install --with-deps
```

## Running
Execute the following in your shell at the base directory of the project:
```
npx playwright test --ui
```

## See some functionality not covered by the tests?
Please open an issue, and it will be addressed.
