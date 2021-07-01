install: install-deps

install-deps:
	npm ci

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix

run:
	npx @hexlet/react-todo-app-with-backend

publish:
	npm publish

.PHONY: test
