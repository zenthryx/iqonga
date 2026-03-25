.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend db-up db-down migrate seed test build clean

help:
	@echo "Common development commands:"
	@echo "  make install           - install backend and frontend dependencies"
	@echo "  make dev               - run backend dev server (auto DB) and frontend dev server"
	@echo "  make dev-backend       - run backend dev server"
	@echo "  make dev-frontend      - run frontend dev server"
	@echo "  make db-up             - ensure local dev postgres is running"
	@echo "  make db-down           - stop local dev postgres"
	@echo "  make migrate           - run backend migrations"
	@echo "  make seed              - run backend seed script"
	@echo "  make test              - run backend tests"
	@echo "  make build             - build backend and frontend"
	@echo "  make clean             - clean backend build artifacts"

install: install-backend install-frontend

install-backend:
	npm --prefix backend install

install-frontend:
	npm --prefix frontend install

dev:
	@echo "Starting backend and frontend in parallel..."
	@echo "Use Ctrl+C to stop both."
	npm --prefix backend run dev & npm --prefix frontend run dev; wait

dev-backend:
	npm --prefix backend run dev

dev-frontend:
	npm --prefix frontend run dev

db-up:
	npm --prefix backend run dev:db

db-down:
	npm --prefix backend run dev:db:down

migrate:
	npm --prefix backend run migrate

seed:
	npm --prefix backend run seed

test:
	npm --prefix backend run test

build:
	npm --prefix backend run build
	npm --prefix frontend run build

clean:
	npm --prefix backend run clean
